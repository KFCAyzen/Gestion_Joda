-- Archivage des employés (soft-delete) — Joda Company
-- ----------------------------------------------------------------------------
-- Contexte : supprimer un employé déclenchait un ON DELETE CASCADE sur toutes
-- les tables liées (daily_reports, payslips, leave_requests, evaluations, …),
-- effaçant définitivement son historique. On remplace la suppression physique
-- par un archivage : l'employé est masqué des listes mais ses données restent.
--
-- `statut = 'inactif'` ne convient pas : c'est un statut métier visible
-- (employé toujours présent mais inactif). On ajoute donc une colonne dédiée.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;

-- Les requêtes de liste filtrent `archived_at IS NULL` : un index partiel suffit.
CREATE INDEX IF NOT EXISTS idx_employees_active
  ON public.employees(id) WHERE archived_at IS NULL;
