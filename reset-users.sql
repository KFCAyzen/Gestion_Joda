-- Script complet pour nettoyer toutes les données liées aux utilisateurs
-- Exécuter ce script dans le SQL Editor de Supabase

-- =============================================================================
-- ORDRE DE SUPPRESSION (en respectant les dépendances)
-- =============================================================================

-- 1. Supprimer les données qui dépendent des students
DELETE FROM entrees_comptables WHERE student_id IS NOT NULL;
DELETE FROM payments WHERE student_id IS NOT NULL;
DELETE FROM documents WHERE student_id IS NOT NULL;

-- 2. Supprimer les dossiers (qui dépendent des students)
DELETE FROM dossier_history;
DELETE FROM dossier_bourses;

-- 3. Supprimer les students
DELETE FROM students;

-- 4. Nettoyer les références created_by dans les autres tables
UPDATE sorties_comptables SET created_by = NULL;
UPDATE entrees_comptables SET created_by = NULL;

-- 5. Supprimer les notifications
DELETE FROM notifications;

-- 6. Supprimer les messages
DELETE FROM messages;

-- 7. Supprimer les utilisateurs de la table public.users
DELETE FROM users;

-- 8. Supprimer les utilisateurs de auth.users
DELETE FROM auth.users;

-- =============================================================================
-- Vérification
-- =============================================================================
SELECT 
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM students) as students_count,
  (SELECT COUNT(*) FROM payments) as payments_count,
  (SELECT COUNT(*) FROM auth.users) as auth_users_count;