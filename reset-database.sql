-- Script de réinitialisation complète de la base de données Joda
-- ATTENTION: Ce script supprime TOUTES les données

-- 1. Désactiver temporairement les triggers et contraintes
SET session_replication_role = 'replica';

-- 2. Vider toutes les tables existantes
DELETE FROM activity_logs;
DELETE FROM audit_log;
DELETE FROM notifications;
DELETE FROM messages;
DELETE FROM payments;
DELETE FROM cours_langues;
DELETE FROM dossiers_history;
DELETE FROM dossier_bourses;
DELETE FROM entrees_comptables;
DELETE FROM sorties_comptables;
DELETE FROM budgets;
DELETE FROM custom_categories;
DELETE FROM users;

-- 3. Réactiver les triggers et contraintes
SET session_replication_role = 'origin';

-- 4. Supprimer les utilisateurs test de auth.users
DELETE FROM auth.users WHERE email IN (
  'admin@joda.com',
  'agent@joda.com'
);

-- 5. Vérification (toutes les tables devraient avoir 0 lignes)
SELECT 
  'activity_logs' as table_name, COUNT(*) as count FROM activity_logs
UNION ALL
SELECT 'audit_log', COUNT(*) FROM audit_log
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'cours_langues', COUNT(*) FROM cours_langues
UNION ALL
SELECT 'dossiers_history', COUNT(*) FROM dossiers_history
UNION ALL
SELECT 'dossier_bourses', COUNT(*) FROM dossier_bourses
UNION ALL
SELECT 'entrees_comptables', COUNT(*) FROM entrees_comptables
UNION ALL
SELECT 'sorties_comptables', COUNT(*) FROM sorties_comptables
UNION ALL
SELECT 'budgets', COUNT(*) FROM budgets
UNION ALL
SELECT 'custom_categories', COUNT(*) FROM custom_categories
UNION ALL
SELECT 'users', COUNT(*) FROM users;
