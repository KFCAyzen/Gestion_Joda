-- Module RH — PIN de soumission de rapports
-- Chaque employé reçoit un PIN à 6 chiffres qu'il utilise sur la page
-- publique /rapport pour s'identifier et soumettre ses rapports journaliers
-- sans avoir de compte utilisateur.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS report_pin text;

-- Fonction utilitaire pour générer un PIN par défaut côté trigger / app.
-- Utilise pgcrypto.gen_random_bytes (CSPRNG) au lieu de random() qui n'est
-- pas cryptographiquement sûr.
CREATE OR REPLACE FUNCTION hr_generate_report_pin()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN lpad(
    ((('x' || encode(gen_random_bytes(3), 'hex'))::bit(24)::int) % 1000000)::text,
    6,
    '0'
  );
END;
$$;

-- Backfill : un PIN aléatoire 6 chiffres pour chaque employé existant
UPDATE public.employees
  SET report_pin = hr_generate_report_pin()
  WHERE report_pin IS NULL OR report_pin = '';

-- Trigger : si on insère un employé sans PIN, on en génère un automatiquement
CREATE OR REPLACE FUNCTION hr_set_report_pin_default()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.report_pin IS NULL OR NEW.report_pin = '' THEN
    NEW.report_pin := hr_generate_report_pin();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employees_set_report_pin ON public.employees;
CREATE TRIGGER trg_employees_set_report_pin
  BEFORE INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION hr_set_report_pin_default();
