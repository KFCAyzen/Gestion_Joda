-- ================================================================
-- FIX: Infinite recursion in RLS policies  (v4 — final)
-- ================================================================
-- INSTRUCTIONS: paste this entire script in Supabase SQL Editor
--               and click "Run".
-- ================================================================

-- ----------------------------------------------------------------
-- 1. JWT helper — zero DB queries, zero recursion possible
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata'  ->> 'role', ''),
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'role', '')
  )
$$;

-- ----------------------------------------------------------------
-- 2. Drop EVERY existing policy on `users` (whatever the name)
--    to guarantee no old recursive policy survives.
-- ----------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', r.policyname);
  END LOOP;
END $$;

-- Recreate clean
CREATE POLICY "users_own_row" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_admin_select" ON users
  FOR SELECT USING (get_auth_user_role() IN ('admin', 'super_admin', 'agent'));

CREATE POLICY "users_admin_all" ON users
  FOR ALL USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------
-- 3. students
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Students can view own data" ON students;
DROP POLICY IF EXISTS "Agents can manage students"  ON students;

CREATE POLICY "students_own_row" ON students
  FOR SELECT USING (
    created_by = auth.uid()
    OR get_auth_user_role() IN ('agent', 'admin', 'super_admin')
  );

CREATE POLICY "students_staff_all" ON students
  FOR ALL USING (get_auth_user_role() IN ('agent', 'admin', 'super_admin'));

-- ----------------------------------------------------------------
-- 4. universities
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Everyone can view active universities" ON universities;
DROP POLICY IF EXISTS "Admins can manage universities"        ON universities;

CREATE POLICY "universities_public_select" ON universities
  FOR SELECT USING (
    active = true
    OR get_auth_user_role() IN ('agent', 'admin', 'super_admin')
  );

CREATE POLICY "universities_admin_all" ON universities
  FOR ALL USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------
-- 5. payments
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Students can view own payments" ON payments;
DROP POLICY IF EXISTS "Agents can manage payments"     ON payments;

CREATE POLICY "payments_own_select" ON payments
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE created_by = auth.uid())
    OR get_auth_user_role() IN ('agent', 'admin', 'super_admin')
  );

CREATE POLICY "payments_staff_all" ON payments
  FOR ALL USING (get_auth_user_role() IN ('agent', 'admin', 'super_admin'));

-- ----------------------------------------------------------------
-- 6. entrees_comptables
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view accounting"   ON entrees_comptables;
DROP POLICY IF EXISTS "Admins can manage accounting" ON entrees_comptables;

CREATE POLICY "entrees_admin_select" ON entrees_comptables
  FOR SELECT USING (get_auth_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "entrees_admin_all" ON entrees_comptables
  FOR ALL USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------
-- 7. sorties_comptables
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view expenses"   ON sorties_comptables;
DROP POLICY IF EXISTS "Admins can manage expenses" ON sorties_comptables;

CREATE POLICY "sorties_admin_select" ON sorties_comptables
  FOR SELECT USING (get_auth_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "sorties_admin_all" ON sorties_comptables
  FOR ALL USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------
-- 8. user_permissions
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can manage permissions"   ON user_permissions;

CREATE POLICY "permissions_admin_select" ON user_permissions
  FOR SELECT USING (get_auth_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "permissions_admin_all" ON user_permissions
  FOR ALL USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------
-- 9. audit_logs
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;

CREATE POLICY "audit_logs_admin_select" ON audit_logs
  FOR SELECT USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------
-- 10. email_logs
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view email logs" ON email_logs;

CREATE POLICY "email_logs_admin_select" ON email_logs
  FOR SELECT USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------
-- 11. cours_langues  (was missing from previous fix)
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "staff_all_cours_langues"          ON cours_langues;
DROP POLICY IF EXISTS "student_read_own_cours_langues"   ON cours_langues;

CREATE POLICY "cours_langues_staff_all" ON cours_langues
  FOR ALL USING (
    get_auth_user_role() IN ('agent', 'supervisor', 'admin', 'super_admin')
  );

CREATE POLICY "cours_langues_student_select" ON cours_langues
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE created_by = auth.uid())
  );

-- ----------------------------------------------------------------
-- 12. Sync role into JWT metadata for existing users
--     Wrapped in DO so a permission error doesn't abort the script.
-- ----------------------------------------------------------------
DO $$
BEGIN
  UPDATE auth.users au
  SET raw_app_meta_data =
    COALESCE(au.raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', pu.role)
  FROM public.users pu
  WHERE au.id = pu.id;

  UPDATE auth.users au
  SET raw_user_meta_data =
    COALESCE(au.raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', pu.role)
  FROM public.users pu
  WHERE au.id = pu.id;

  RAISE NOTICE 'JWT metadata synced successfully.';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'JWT sync skipped (permission): %', SQLERRM;
END $$;

-- ----------------------------------------------------------------
-- Verification — current policies on all affected tables
-- ----------------------------------------------------------------
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
