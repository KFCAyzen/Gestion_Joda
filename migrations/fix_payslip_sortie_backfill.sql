-- Module RH/Compta — Correctif : garantir qu'un bulletin de paie crée bien
-- une sortie comptable "salaires", et rattraper les bulletins déjà créés qui
-- n'ont pas de sortie liée (cas où le trigger n'était pas installé).
--
-- Idempotent : peut être relancé sans risque.
-- Statut des sorties créées : 'validated' (un bulletin émis = dépense réelle
-- déjà engagée) ; validated_by = créateur du bulletin. Elles impactent donc
-- immédiatement le solde comptable sans validation manuelle.
-- En plus : synchro à l'édition d'un bulletin (net_a_payer -> montant sortie).

-- 1. Colonne de lien + index (au cas où link_payslips_to_sortie.sql n'a pas tourné).
ALTER TABLE public.sorties_comptables
  ADD COLUMN IF NOT EXISTS payslip_id uuid REFERENCES public.payslips(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sorties_payslip ON public.sorties_comptables(payslip_id);

-- 2. (Ré)installe la fonction + le trigger AFTER INSERT.
CREATE OR REPLACE FUNCTION hr_payslip_to_sortie()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_name text;
  mois_label text;
BEGIN
  SELECT prenom || ' ' || nom INTO emp_name
  FROM public.employees
  WHERE id = NEW.employee_id;

  mois_label := CASE NEW.mois
    WHEN 1  THEN 'Janv.'  WHEN 2  THEN 'Févr.'  WHEN 3  THEN 'Mars'
    WHEN 4  THEN 'Avril'  WHEN 5  THEN 'Mai'    WHEN 6  THEN 'Juin'
    WHEN 7  THEN 'Juil.'  WHEN 8  THEN 'Août'   WHEN 9  THEN 'Sept.'
    WHEN 10 THEN 'Oct.'   WHEN 11 THEN 'Nov.'   WHEN 12 THEN 'Déc.'
    ELSE NEW.mois::text
  END;

  INSERT INTO public.sorties_comptables (
    montant, date, categorie, description, payslip_id, created_by,
    status, validated_by, validated_at
  ) VALUES (
    NEW.net_a_payer,
    COALESCE(NEW.payment_date, CURRENT_DATE),
    'salaires',
    'Salaire ' || COALESCE(emp_name, 'employé') || ' — ' || mois_label || ' ' || NEW.annee,
    NEW.id,
    NEW.created_by,
    'validated',
    NEW.created_by,
    now()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payslip_to_sortie ON public.payslips;
CREATE TRIGGER trg_payslip_to_sortie
  AFTER INSERT ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION hr_payslip_to_sortie();

-- 3. Synchro à l'édition : si le net_a_payer d'un bulletin change, on répercute
--    le montant sur la sortie liée (et on rafraîchit la date si payment_date bouge).
CREATE OR REPLACE FUNCTION hr_payslip_sync_sortie()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sorties_comptables
  SET montant = NEW.net_a_payer,
      date    = COALESCE(NEW.payment_date, date)
  WHERE payslip_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payslip_sync_sortie ON public.payslips;
CREATE TRIGGER trg_payslip_sync_sortie
  AFTER UPDATE OF net_a_payer, payment_date ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION hr_payslip_sync_sortie();

-- 4. Backfill : crée une sortie (validée) pour chaque bulletin existant qui n'en a pas.
INSERT INTO public.sorties_comptables (
  montant, date, categorie, description, payslip_id, created_by,
  status, validated_by, validated_at
)
SELECT
  p.net_a_payer,
  COALESCE(p.payment_date, CURRENT_DATE),
  'salaires',
  'Salaire ' || COALESCE(e.prenom || ' ' || e.nom, 'employé') || ' — ' ||
    CASE p.mois
      WHEN 1  THEN 'Janv.'  WHEN 2  THEN 'Févr.'  WHEN 3  THEN 'Mars'
      WHEN 4  THEN 'Avril'  WHEN 5  THEN 'Mai'    WHEN 6  THEN 'Juin'
      WHEN 7  THEN 'Juil.'  WHEN 8  THEN 'Août'   WHEN 9  THEN 'Sept.'
      WHEN 10 THEN 'Oct.'   WHEN 11 THEN 'Nov.'   WHEN 12 THEN 'Déc.'
      ELSE p.mois::text
    END || ' ' || p.annee,
  p.id,
  p.created_by,
  'validated',
  p.created_by,
  now()
FROM public.payslips p
LEFT JOIN public.employees e ON e.id = p.employee_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.sorties_comptables s WHERE s.payslip_id = p.id
);

-- 5. (Optionnel) Valider rétroactivement les sorties de salaire déjà liées mais
--    restées 'pending' (cas d'un précédent passage du correctif en mode pending).
UPDATE public.sorties_comptables s
SET status = 'validated',
    validated_at = COALESCE(s.validated_at, now()),
    validated_by = COALESCE(s.validated_by, p.created_by)
FROM public.payslips p
WHERE s.payslip_id = p.id
  AND s.status = 'pending';
