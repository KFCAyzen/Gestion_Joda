-- Performance indexes v2 — complète add_perf_indexes.sql
-- Couvre les colonnes filtrées/triées révélées par l'audit de chargement
-- (écrans Documents, Dossiers/historique, Comptabilité, Logs d'activité,
-- Performances). À lancer une fois en production. Idempotent (IF NOT EXISTS).
--
-- Rappel : Postgres n'indexe PAS automatiquement les clés étrangères ; les
-- colonnes FK utilisées en filtre (student_id, dossier_id…) ont besoin d'un
-- index explicite.

-- documents : filtré par student_id (fiche étudiant, validation, upload)
CREATE INDEX IF NOT EXISTS idx_documents_student_id ON documents(student_id);

-- dossier_history : filtré par dossier_id ; trié/agrégé par performed_at
CREATE INDEX IF NOT EXISTS idx_dossier_history_dossier_id  ON dossier_history(dossier_id);
CREATE INDEX IF NOT EXISTS idx_dossier_history_performed_at ON dossier_history(performed_at DESC);

-- comptabilité : la page trie par date DESC et filtre par plage de dates
-- (gte/lte) pour chaque période. Index sur date pour entrées et sorties.
CREATE INDEX IF NOT EXISTS idx_entrees_comptables_date ON entrees_comptables(date DESC);
CREATE INDEX IF NOT EXISTS idx_sorties_comptables_date ON sorties_comptables(date DESC);

-- activity_logs : trié par created_at DESC ; filtré par user_id / user_role /
-- activity_type / entity_type (page Logs + calcul des Performances)
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at    ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id       ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type ON activity_logs(activity_type);

-- payments : l'échéancier et les pénalités trient par date_limite
CREATE INDEX IF NOT EXISTS idx_payments_date_limite ON payments(date_limite);
