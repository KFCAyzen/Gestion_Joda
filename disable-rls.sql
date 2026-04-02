-- Script pour désactiver temporairement toutes les politiques RLS
-- Exécuter ce script dans le SQL Editor de Supabase
-- Utile pour maintenance et développement

-- =============================================================================
-- DÉSACTIVER RLS SUR TOUTES LES TABLES
-- =============================================================================

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE universities DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_bourses DISABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE cours_langues DISABLE ROW LEVEL SECURITY;
ALTER TABLE entrees_comptables DISABLE ROW LEVEL SECURITY;
ALTER TABLE sorties_comptables DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- POUR RÉACTIVER RLS
-- =============================================================================

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dossier_bourses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dossier_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cours_langues ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE entrees_comptables ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sorties_comptables ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;