-- Module RH — Langue préférée de l'employé
-- Ajoute la colonne langue_preferee à la table employees.
-- Idempotent (IF NOT EXISTS).

ALTER TABLE employees ADD COLUMN IF NOT EXISTS langue_preferee text
  CHECK (langue_preferee IS NULL OR langue_preferee IN ('francais','anglais','chinois','espagnol','arabe','autre'));

-- Note : RLS déjà active sur employees, héritée pour la nouvelle colonne.
