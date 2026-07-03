-- Solde de trésorerie global maintenu EN CACHE (lecture O(1)).
--
-- Objectif : ne plus recalculer le solde en sommant tout l'historique à chaque
-- affichage (lourd à terme). Une table à une seule ligne stocke le solde ; des
-- triggers l'ajustent d'un delta à chaque écriture (entrées/sorties). La lecture
-- côté client devient un simple SELECT d'une ligne, sans scanner les tables.
--
-- Règle (miroir du calcul TS web/mobile et de accounting_global_balance()) :
--     solde = Σ entrees_comptables.montant
--           − Σ sorties_comptables.montant WHERE status = 'validated'
--   Les sorties 'pending'/'rejected' n'impactent pas le solde
--   (cf. add_sortie_validation_status.sql).
--
-- Idempotent : réexécutable sans effet de bord.

-- 1. Table cache : une seule ligne (id = true).
CREATE TABLE IF NOT EXISTS public.comptabilite_solde (
  id boolean PRIMARY KEY DEFAULT true,
  solde numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comptabilite_solde_single CHECK (id)
);

-- 2. Réconciliation / seed : recalcule le solde complet et l'écrit dans le cache.
--    À appeler manuellement si l'on soupçonne une dérive (ex : écriture SQL en
--    masse ayant contourné les triggers). SECURITY DEFINER pour pouvoir écrire
--    la table cache indépendamment des droits de l'appelant.
CREATE OR REPLACE FUNCTION public.reconcile_comptabilite_solde()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v numeric;
BEGIN
  v := COALESCE((SELECT SUM(montant) FROM public.entrees_comptables), 0)
     - COALESCE((SELECT SUM(montant) FROM public.sorties_comptables WHERE status = 'validated'), 0);
  INSERT INTO public.comptabilite_solde (id, solde, updated_at)
  VALUES (true, v, now())
  ON CONFLICT (id) DO UPDATE SET solde = EXCLUDED.solde, updated_at = now();
  RETURN v;
END;
$$;

-- 3. Application d'un delta au cache (O(1)).
CREATE OR REPLACE FUNCTION public.apply_comptabilite_solde_delta(delta numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF delta IS NULL OR delta = 0 THEN
    RETURN;
  END IF;
  UPDATE public.comptabilite_solde SET solde = solde + delta, updated_at = now() WHERE id;
  IF NOT FOUND THEN
    INSERT INTO public.comptabilite_solde (id, solde) VALUES (true, delta)
    ON CONFLICT (id) DO UPDATE SET solde = public.comptabilite_solde.solde + delta, updated_at = now();
  END IF;
END;
$$;

-- 4. Trigger entrées : delta = +montant (insert), −montant (delete), diff (update).
CREATE OR REPLACE FUNCTION public.trg_entrees_comptables_solde()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.apply_comptabilite_solde_delta(NEW.montant);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.apply_comptabilite_solde_delta(-OLD.montant);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.apply_comptabilite_solde_delta(COALESCE(NEW.montant, 0) - COALESCE(OLD.montant, 0));
  END IF;
  RETURN NULL;
END;
$$;

-- 5. Trigger sorties : effet = −montant si status='validated', sinon 0.
--    Gère la validation (pending→validated), l'annulation, l'édition du montant
--    et la suppression via le delta (new_eff − old_eff).
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
  END IF;
  IF TG_OP IN ('UPDATE', 'INSERT') THEN
    new_eff := CASE WHEN NEW.status = 'validated' THEN -NEW.montant ELSE 0 END;
  END IF;
  PERFORM public.apply_comptabilite_solde_delta(new_eff - old_eff);
  RETURN NULL;
END;
$$;

-- 6. Attache les triggers (drop d'abord → idempotence).
DROP TRIGGER IF EXISTS entrees_comptables_solde_aiud ON public.entrees_comptables;
CREATE TRIGGER entrees_comptables_solde_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.entrees_comptables
FOR EACH ROW EXECUTE FUNCTION public.trg_entrees_comptables_solde();

DROP TRIGGER IF EXISTS sorties_comptables_solde_aiud ON public.sorties_comptables;
CREATE TRIGGER sorties_comptables_solde_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.sorties_comptables
FOR EACH ROW EXECUTE FUNCTION public.trg_sorties_comptables_solde();

-- 7. RLS : lecture pour les authentifiés ; aucune écriture directe
--    (seuls les triggers SECURITY DEFINER modifient la table).
ALTER TABLE public.comptabilite_solde ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS comptabilite_solde_read ON public.comptabilite_solde;
CREATE POLICY comptabilite_solde_read ON public.comptabilite_solde
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.comptabilite_solde TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_comptabilite_solde() TO authenticated;

-- 8. Seed initial à partir de l'historique existant.
SELECT public.reconcile_comptabilite_solde();
