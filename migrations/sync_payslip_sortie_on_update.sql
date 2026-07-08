-- Module RH — synchronise la sortie comptable liée quand une fiche de paie est MODIFIÉE.
--
-- Contexte : link_payslips_to_sorties.sql crée une sortie « salaires » à l'INSERT
-- d'une fiche (montant = net_a_payer) mais laissait la synchro sur UPDATE commentée.
-- Depuis qu'on autorise l'édition d'un bulletin (net, mois, employé…), il faut
-- répercuter le nouveau montant/libellé sur la sortie liée, sinon la comptabilité
-- et le solde de trésorerie divergent.
--
-- Le cache de solde (add_treasury_balance_cache.sql) gère déjà l'UPDATE du montant
-- d'une sortie via son propre trigger (delta new_eff − old_eff) : mettre à jour la
-- sortie ici suffit à garder le solde cohérent, sans recalcul manuel.
--
-- Idempotent : réexécutable sans effet de bord.

CREATE OR REPLACE FUNCTION public.hr_payslip_sync_sortie()
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

  UPDATE public.sorties_comptables
  SET montant = NEW.net_a_payer,
      description = 'Salaire ' || COALESCE(emp_name, 'employé') || ' — ' || mois_label || ' ' || NEW.annee
  WHERE payslip_id = NEW.id;

  RETURN NEW;
END;
$$;

-- Se déclenche sur toute modification du montant net, du mois, de l'année ou de
-- l'employé (les champs qui composent le montant/libellé de la sortie).
DROP TRIGGER IF EXISTS trg_payslip_sync_sortie ON public.payslips;
CREATE TRIGGER trg_payslip_sync_sortie
  AFTER UPDATE OF net_a_payer, mois, annee, employee_id ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION public.hr_payslip_sync_sortie();
