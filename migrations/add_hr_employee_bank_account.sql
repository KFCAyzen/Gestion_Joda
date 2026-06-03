-- Ajoute le numéro de compte bancaire de l'employé (versement du salaire).
-- Idempotent.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS numero_compte_bancaire text;

COMMENT ON COLUMN employees.numero_compte_bancaire IS 'Numéro de compte bancaire / RIB de l''employé (paie / virement salaire).';
