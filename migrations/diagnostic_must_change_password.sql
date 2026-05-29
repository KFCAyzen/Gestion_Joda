-- ================================================================
-- DIAGNOSTIC : pourquoi must_change_password revient à TRUE ?
-- ================================================================
-- À exécuter dans le SQL editor Supabase. Copier chaque section et
-- coller la sortie pour analyse.
-- ================================================================

-- ─── 1. Valeur actuelle pour le super_admin ─────────────────────────
SELECT
    'A. valeur actuelle' AS section,
    email, role, must_change_password, updated_at
FROM public.users
WHERE role = 'super_admin';

-- ─── 2. Default de la colonne ───────────────────────────────────────
SELECT
    'B. column default' AS section,
    column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'users'
  AND column_name  = 'must_change_password';
-- Attendu : column_default = true (cf. fix_must_change_password_trigger.sql)

-- ─── 3. TOUS les triggers sur public.users ──────────────────────────
SELECT
    'C. triggers' AS section,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table  = 'users'
ORDER BY trigger_name;
-- Attendu : audit_users_trigger (AFTER, juste pour audit) + rien d'autre

-- ─── 4. TOUS les triggers sur auth.users (Supabase Auth) ────────────
SELECT
    'D. auth.users triggers' AS section,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table  = 'users'
ORDER BY trigger_name;
-- Attendu : on_auth_user_created (AFTER INSERT seulement)

-- ─── 5. Code des fonctions trigger qui touchent les users ───────────
SELECT
    'E. handle_new_user source' AS section,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'handle_new_user';

-- ─── 6. Existence de la fonction protect_must_change_password ───────
-- (doit être absente après application de fix_must_change_password_trigger.sql)
SELECT
    'F. protect fn?' AS section,
    p.proname,
    n.nspname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'protect_must_change_password';
-- Attendu : 0 ligne

-- ─── 7. Métadonnées Supabase Auth pour le super_admin ──────────────
-- Si raw_user_meta_data contient must_change_password=true et qu'un
-- trigger UPSERT depuis auth.users vers public.users le ré-applique,
-- c'est la source du bug.
SELECT
    'G. auth metadata' AS section,
    u.email,
    u.raw_user_meta_data ->> 'must_change_password' AS meta_must_change_password,
    u.raw_app_meta_data  ->> 'role' AS meta_role
FROM auth.users u
WHERE u.raw_app_meta_data ->> 'role' = 'super_admin'
   OR u.raw_user_meta_data ->> 'role' = 'super_admin';

-- ─── 8. Test : modifier la valeur, vérifier qu'elle persiste ────────
-- Décommenter les 3 lignes ci-dessous pour tester en live :
--
-- UPDATE public.users SET must_change_password = false
--   WHERE role = 'super_admin' RETURNING email, must_change_password;
-- SELECT pg_sleep(1);
-- SELECT email, must_change_password FROM public.users WHERE role = 'super_admin';
--
-- Si la 2e SELECT renvoie TRUE alors qu'on vient juste d'UPDATE à FALSE,
-- → il y a bien un trigger BEFORE UPDATE qui force la valeur.
-- → exécuter la requête de la section C pour le retrouver.

-- ─── 9. Liste des règles (RULE) sur public.users ────────────────────
-- Les rules PostgreSQL peuvent réécrire des UPDATE silencieusement.
SELECT
    'I. rules' AS section,
    rulename,
    ev_type
FROM pg_rewrite
WHERE ev_class = 'public.users'::regclass;
-- Attendu : seulement la rule par défaut (_RETURN)
