-- Comptabilité multi-devises : séparer les opérations en USD des opérations en FCFA.
--
-- Contexte : les frais des étudiants internationaux sont facturés en USD (cf.
-- service_type finissant par `_intl`), mais leurs paiements validés étaient
-- insérés dans `entrees_comptables` SANS marqueur de devise → des montants $
-- étaient additionnés à des FCFA dans un solde unique (incohérent).
--
-- Cette migration :
--   1. ajoute une colonne `devise` ('FCFA' | 'USD', défaut 'FCFA') aux deux tables ;
--   2. reclasse en USD les entrées liées à un paiement de service *_intl ;
--   3. transforme le cache `comptabilite_solde` en cache PAR DEVISE (une ligne par
--      devise) et réécrit les fonctions/triggers de solde pour router chaque delta
--      vers la devise de la ligne (gère aussi le changement de devise sur UPDATE) ;
--   4. recalcule les deux soldes depuis l'historique.
--
-- Aucune conversion FCFA↔USD : les deux livres sont totalement indépendants.
-- Idempotent : réexécutable sans effet de bord.

-- ─── 1. Colonne devise ───────────────────────────────────────────────────────
ALTER TABLE public.entrees_comptables
  ADD COLUMN IF NOT EXISTS devise text NOT NULL DEFAULT 'FCFA';
ALTER TABLE public.sorties_comptables
  ADD COLUMN IF NOT EXISTS devise text NOT NULL DEFAULT 'FCFA';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entrees_comptables_devise_check'
  ) THEN
    ALTER TABLE public.entrees_comptables
      ADD CONSTRAINT entrees_comptables_devise_check CHECK (devise IN ('FCFA', 'USD'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sorties_comptables_devise_check'
  ) THEN
    ALTER TABLE public.sorties_comptables
      ADD CONSTRAINT sorties_comptables_devise_check CHECK (devise IN ('FCFA', 'USD'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_entrees_devise ON public.entrees_comptables(devise);
CREATE INDEX IF NOT EXISTS idx_sorties_devise ON public.sorties_comptables(devise);

-- ─── 2. Backfill : entrées liées à un paiement international → USD ────────────
-- Les service_type internationaux se terminent tous par 'intl' (bourse_*_intl,
-- language_program_intl, partial_scholarship_intl, full_scholarship_intl) ;
-- aucun service local ne finit ainsi. On ne touche qu'aux lignes encore en FCFA.
UPDATE public.entrees_comptables e
SET devise = 'USD'
FROM public.payments p
WHERE e.payment_id = p.id
  AND p.type LIKE '%intl'
  AND e.devise = 'FCFA';

-- ─── 3. Cache de solde PAR DEVISE ────────────────────────────────────────────
-- L'ancien cache était une table à ligne unique (id = true). On la recrée keyée
-- par devise. CASCADE retire l'ancienne policy RLS (recréée plus bas).
DROP TABLE IF EXISTS public.comptabilite_solde CASCADE;
CREATE TABLE public.comptabilite_solde (
  devise text PRIMARY KEY DEFAULT 'FCFA' CHECK (devise IN ('FCFA', 'USD')),
  solde numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Signature changée (ajout du paramètre devise) → drop de l'ancienne version.
DROP FUNCTION IF EXISTS public.apply_comptabilite_solde_delta(numeric);

-- Applique un delta au solde d'une devise donnée (O(1)).
CREATE OR REPLACE FUNCTION public.apply_comptabilite_solde_delta(delta numeric, p_devise text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF delta IS NULL OR delta = 0 THEN
    RETURN;
  END IF;
  INSERT INTO public.comptabilite_solde (devise, solde, updated_at)
  VALUES (COALESCE(p_devise, 'FCFA'), delta, now())
  ON CONFLICT (devise)
  DO UPDATE SET solde = public.comptabilite_solde.solde + EXCLUDED.solde, updated_at = now();
END;
$$;

-- Réconciliation : recalcule le solde de CHAQUE devise depuis l'historique.
-- Retourne le solde FCFA (compat : d'éventuels appelants attendent un numeric).
CREATE OR REPLACE FUNCTION public.reconcile_comptabilite_solde()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fcfa numeric;
BEGIN
  INSERT INTO public.comptabilite_solde (devise, solde, updated_at)
  SELECT d.devise,
         COALESCE((SELECT SUM(montant) FROM public.entrees_comptables e WHERE e.devise = d.devise), 0)
       - COALESCE((SELECT SUM(montant) FROM public.sorties_comptables s
                    WHERE s.devise = d.devise AND s.status = 'validated'), 0),
         now()
  FROM (VALUES ('FCFA'), ('USD')) AS d(devise)
  ON CONFLICT (devise) DO UPDATE SET solde = EXCLUDED.solde, updated_at = now();

  SELECT solde INTO v_fcfa FROM public.comptabilite_solde WHERE devise = 'FCFA';
  RETURN COALESCE(v_fcfa, 0);
END;
$$;

-- Trigger entrées : delta = ±montant sur la devise de la ligne.
CREATE OR REPLACE FUNCTION public.trg_entrees_comptables_solde()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.apply_comptabilite_solde_delta(NEW.montant, NEW.devise);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.apply_comptabilite_solde_delta(-OLD.montant, OLD.devise);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Retire l'ancien montant de son ancienne devise, ajoute le nouveau dans la
    -- nouvelle (gère correctement un changement de devise).
    PERFORM public.apply_comptabilite_solde_delta(-OLD.montant, OLD.devise);
    PERFORM public.apply_comptabilite_solde_delta(NEW.montant, NEW.devise);
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger sorties : effet = −montant si status='validated', sur la devise de la
-- ligne. Retire l'ancien effet (ancienne devise), applique le nouveau (nouvelle
-- devise) → gère validation, annulation, édition du montant ET de la devise.
CREATE OR REPLACE FUNCTION public.trg_sorties_comptables_solde()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_eff numeric := 0;
  new_eff numeric := 0;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    old_eff := CASE WHEN OLD.status = 'validated' THEN -OLD.montant ELSE 0 END;
    PERFORM public.apply_comptabilite_solde_delta(-old_eff, OLD.devise);
  END IF;
  IF TG_OP IN ('UPDATE', 'INSERT') THEN
    new_eff := CASE WHEN NEW.status = 'validated' THEN -NEW.montant ELSE 0 END;
    PERFORM public.apply_comptabilite_solde_delta(new_eff, NEW.devise);
  END IF;
  RETURN NULL;
END;
$$;

-- Réattache les triggers (idempotent).
DROP TRIGGER IF EXISTS entrees_comptables_solde_aiud ON public.entrees_comptables;
CREATE TRIGGER entrees_comptables_solde_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.entrees_comptables
FOR EACH ROW EXECUTE FUNCTION public.trg_entrees_comptables_solde();

DROP TRIGGER IF EXISTS sorties_comptables_solde_aiud ON public.sorties_comptables;
CREATE TRIGGER sorties_comptables_solde_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.sorties_comptables
FOR EACH ROW EXECUTE FUNCTION public.trg_sorties_comptables_solde();

-- ─── 4. RLS + grants + seed ──────────────────────────────────────────────────
ALTER TABLE public.comptabilite_solde ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS comptabilite_solde_read ON public.comptabilite_solde;
CREATE POLICY comptabilite_solde_read ON public.comptabilite_solde
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.comptabilite_solde TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_comptabilite_solde() TO authenticated;

-- Seed initial des deux soldes à partir de l'historique (désormais tagué devise).
SELECT public.reconcile_comptabilite_solde();
