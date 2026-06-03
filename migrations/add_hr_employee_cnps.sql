-- Ajoute le numéro d'assuré CNPS de l'employé (identifiant social figurant sur le
-- bulletin de paie). Idempotent.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS numero_cnps text;

COMMENT ON COLUMN employees.numero_cnps IS 'Numéro d''assuré social CNPS (paie / bulletin).';
