-- ============================================================
-- VÉRIFICATION DE L'ÉTAT DES MIGRATIONS
-- ------------------------------------------------------------
-- À coller dans Supabase Dashboard > SQL Editor
-- Chaque bloc retourne un statut OK / MANQUE
-- ============================================================

-- 1. students.nationalite (migration add_student_nationalite.sql)
SELECT
    'students.nationalite' AS check_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'students' AND column_name = 'nationalite'
        ) THEN 'OK'
        ELSE 'MANQUE — exécuter add_student_nationalite.sql'
    END AS status;

-- 2. payment_config supporte _intl (migration add_student_nationalite.sql, étape 2)
SELECT
    'payment_config CHECK accepte _intl' AS check_name,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.check_constraints
            WHERE constraint_name = 'payment_config_service_type_check'
              AND check_clause LIKE '%bourse_bachelor_intl%'
        ) THEN 'OK'
        ELSE 'MANQUE — re-jouer ALTER CONSTRAINT dans add_student_nationalite.sql'
    END AS status;

-- 3. Lignes payment_config _intl insérées
SELECT
    'payment_config rows _intl' AS check_name,
    CASE
        WHEN (SELECT COUNT(*) FROM payment_config
              WHERE service_type IN ('bourse_bachelor_intl', 'bourse_master_intl')) = 2
        THEN 'OK (2 lignes)'
        ELSE 'MANQUE — relancer le INSERT de add_student_nationalite.sql'
    END AS status;

-- 4. Table payment_config existe
SELECT
    'table payment_config' AS check_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_config')
        THEN 'OK'
        ELSE 'MANQUE — exécuter add_payment_config.sql'
    END AS status;

-- 5. Table cours_langues existe
SELECT
    'table cours_langues' AS check_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cours_langues')
        THEN 'OK'
        ELSE 'MANQUE — exécuter add_cours_langues_payment_workflow.sql'
    END AS status;

-- 6. Workflow paiements (colonnes submitted_at / validated_at / etc.)
SELECT
    'payments workflow (submitted_at, validated_at, statut_validation)' AS check_name,
    CASE
        WHEN (
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_name = 'payments'
              AND column_name IN ('submitted_at', 'validated_at', 'statut_validation', 'submitted_by', 'validated_by')
        ) >= 5 THEN 'OK'
        ELSE 'MANQUE — exécuter add_cours_langues_payment_workflow.sql'
    END AS status;

-- 7. Notifications : table existe
SELECT
    'table notifications' AS check_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications')
        THEN 'OK'
        ELSE 'MANQUE'
    END AS status;

-- 8. Users : permissions / is_active / phone / must_change_password
SELECT
    'users.is_active' AS check_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'users' AND column_name = 'is_active')
        THEN 'OK' ELSE 'MANQUE — add_user_active_status.sql' END AS status;

SELECT
    'users.permissions' AS check_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'users' AND column_name = 'permissions')
        THEN 'OK' ELSE 'MANQUE — add_user_permissions.sql' END AS status;

SELECT
    'users.phone' AS check_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'users' AND column_name = 'phone')
        THEN 'OK' ELSE 'MANQUE — add_user_phone.sql' END AS status;

SELECT
    'users.must_change_password default false' AS check_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'must_change_password'
              AND column_default = 'false'
        ) THEN 'OK'
        ELSE 'À vérifier — fix_must_change_password_default.sql' END AS status;

-- 9. students.user_id (lien auth)
SELECT
    'students.user_id' AS check_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'students' AND column_name = 'user_id')
        THEN 'OK' ELSE 'MANQUE — add_student_user_id.sql' END AS status;

-- 10. Documents RLS / contraintes comptabilité — checks rapides
SELECT
    'table entrees_comptables' AS check_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'entrees_comptables')
        THEN 'OK' ELSE 'MANQUE' END AS status;

SELECT
    'table sorties_comptables' AS check_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sorties_comptables')
        THEN 'OK' ELSE 'MANQUE' END AS status;

SELECT
    'table messages' AS check_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages')
        THEN 'OK' ELSE 'MANQUE — add_messages_table.sql' END AS status;

SELECT
    'table email_logs' AS check_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_logs')
        THEN 'OK' ELSE 'MANQUE — email_logs.sql' END AS status;

-- ============================================================
-- BONUS : RLS activée sur les tables critiques
-- ============================================================
SELECT
    tablename,
    CASE WHEN rowsecurity THEN 'RLS ON' ELSE 'RLS OFF — DANGER' END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
      'students', 'payments', 'payment_config', 'documents',
      'cours_langues', 'entrees_comptables', 'sorties_comptables',
      'notifications', 'users', 'messages'
  )
ORDER BY tablename;
