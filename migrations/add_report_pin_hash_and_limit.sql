-- Module RH — Hachage du PIN + limite de soumission
-- Le PIN était stocké en clair, on bascule sur un hash bcrypt (pgcrypto).
-- Le PIN en clair n'est jamais persisté ; l'admin le voit une seule fois
-- au moment de la régénération.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Helpers ──────────────────────────────────────────────────────────────

-- Hash bcrypt d'un PIN en clair
CREATE OR REPLACE FUNCTION hr_hash_report_pin(plain text)
RETURNS text
LANGUAGE sql
AS $$
  SELECT crypt(plain, gen_salt('bf', 8));
$$;

-- Vérifie qu'un PIN correspond au hash de l'employé (et que l'employé est actif).
-- Retourne true/false ; ne fuit pas le hash côté client.
CREATE OR REPLACE FUNCTION hr_verify_report_pin(emp_id uuid, plain text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  stored text;
  emp_status text;
BEGIN
  SELECT report_pin, statut INTO stored, emp_status
    FROM public.employees WHERE id = emp_id;
  IF stored IS NULL OR stored = '' OR emp_status IS NULL OR emp_status <> 'actif' THEN
    RETURN false;
  END IF;
  RETURN crypt(plain, stored) = stored;
END;
$$;

-- Régénère le PIN d'un employé et renvoie le PIN en clair (visible une seule
-- fois pour l'admin). Le hash est stocké côté DB, le clair n'est jamais persisté.
CREATE OR REPLACE FUNCTION hr_regenerate_report_pin(emp_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  plain text;
BEGIN
  plain := hr_generate_report_pin();
  UPDATE public.employees
    SET report_pin = hr_hash_report_pin(plain)
    WHERE id = emp_id;
  RETURN plain;
END;
$$;

-- ─── Migration des PINs existants ─────────────────────────────────────────
-- Les PINs déjà stockés en clair (6 chiffres) sont hashés sur place.
-- Pas de récupération possible : l'admin devra régénérer pour communiquer
-- le nouveau code aux employés concernés.

UPDATE public.employees
  SET report_pin = hr_hash_report_pin(report_pin)
  WHERE report_pin ~ '^[0-9]{6}$';

-- ─── Trigger d'insertion ──────────────────────────────────────────────────
-- À la création d'un employé sans PIN explicite, on génère un PIN et on
-- stocke son hash. L'admin doit ensuite cliquer sur « Régénérer » pour
-- obtenir un code en clair à transmettre.

CREATE OR REPLACE FUNCTION hr_set_report_pin_default()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.report_pin IS NULL OR NEW.report_pin = '' THEN
    NEW.report_pin := hr_hash_report_pin(hr_generate_report_pin());
  END IF;
  RETURN NEW;
END;
$$;
