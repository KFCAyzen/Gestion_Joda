-- Module RH — lien payslips ↔ sorties_comptables
-- Chaque fiche de paie crée automatiquement une sortie "salaires" dont le
-- montant = net_a_payer. La suppression d'une fiche propage à la sortie via
-- ON DELETE CASCADE.

-- 1. Colonne de lien (nullable car les sorties existantes n'ont pas de fiche)
ALTER TABLE public.sorties_comptables
  ADD COLUMN IF NOT EXISTS payslip_id uuid REFERENCES public.payslips(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sorties_payslip ON public.sorties_comptables(payslip_id);

-- 2. Fonction qui transforme une fiche de paie en sortie comptable
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
    montant,
    date,
    categorie,
    description,
    payslip_id,
    created_by
  ) VALUES (
    NEW.net_a_payer,
    CURRENT_DATE,
    'salaires',
    'Salaire ' || COALESCE(emp_name, 'employé') || ' — ' || mois_label || ' ' || NEW.annee,
    NEW.id,
    NEW.created_by
  );

  RETURN NEW;
END;
$$;

-- 3. Trigger AFTER INSERT
DROP TRIGGER IF EXISTS trg_payslip_to_sortie ON public.payslips;
CREATE TRIGGER trg_payslip_to_sortie
  AFTER INSERT ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION hr_payslip_to_sortie();

-- 4. (optionnel) Si tu veux aussi maintenir le montant de la sortie quand
-- la fiche est modifiée, décommente le bloc ci-dessous :
--
-- CREATE OR REPLACE FUNCTION hr_payslip_sync_sortie()
-- RETURNS TRIGGER
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- BEGIN
--   UPDATE public.sorties_comptables
--   SET montant = NEW.net_a_payer
--   WHERE payslip_id = NEW.id;
--   RETURN NEW;
-- END;
-- $$;
--
-- DROP TRIGGER IF EXISTS trg_payslip_sync_sortie ON public.payslips;
-- CREATE TRIGGER trg_payslip_sync_sortie
--   AFTER UPDATE OF net_a_payer ON public.payslips
--   FOR EACH ROW EXECUTE FUNCTION hr_payslip_sync_sortie();
