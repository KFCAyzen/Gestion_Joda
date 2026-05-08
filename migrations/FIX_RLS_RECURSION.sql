-- ================================================================
-- FIX: Infinite recursion in RLS policies  (v3 — JWT-based)
-- ================================================================
-- INSTRUCTIONS: paste this entire script in Supabase SQL Editor
--               and click "Run".
-- ================================================================
--
-- Why SECURITY DEFINER didn't work:
--   Supabase forces row_security = ON for the postgres role, so even
--   a SECURITY DEFINER function querying `users` still triggers the
--   same recursive policies.
--
-- Real fix: read the role from the JWT token — zero database queries,
--   zero RLS evaluation, zero possible recursion.
--
-- Caveat: the JWT role is only as fresh as the last token refresh
--   (~1 h). Existing users need to re-login once after this migration
--   (or their token refreshes automatically within the hour).
-- ================================================================

-- ----------------------------------------------------------------
-- 1.  Sync raw_user_meta_data for every existing user so the JWT
--     carries the correct role from the start.
-- ----------------------------------------------------------------
UPDATE auth.users au
SET raw_user_meta_data =
  COALESCE(au.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', pu.role)
FROM public.users pu
WHERE au.id = pu.id
  AND (
    au.raw_user_meta_data ->> 'role' IS DISTINCT FROM pu.role
  );

-- Also push role into app_metadata (admin-controlled, higher trust)
UPDATE auth.users au
SET raw_app_meta_data =
  COALESCE(au.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', pu.role)
FROM public.users pu
WHERE au.id = pu.id
  AND (
    au.raw_app_meta_data ->> 'role' IS DISTINCT FROM pu.role
  );

-- ----------------------------------------------------------------
-- 2.  Helper function — reads role from JWT (NO database query)
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
-- 3.  users
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all users"  ON users;
DROP POLICY IF EXISTS "Admins can manage users"    ON users;

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT
  USING (get_auth_user_role() IN ('admin', 'super_admin', 'agent'));

CREATE POLICY "Admins can manage users" ON users
  FOR ALL
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------
-- 4.  students
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Students can view own data" ON students;
DROP POLICY IF EXISTS "Agents can manage students" ON students;

CREATE POLICY "Students can view own data" ON students
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR get_auth_user_role() IN ('agent', 'admin', 'super_admin')
  );

CREATE POLICY "Agents can manage students" ON students
  FOR ALL
  USING (get_auth_user_role() IN ('agent', 'admin', 'super_admin'));

-- ----------------------------------------------------------------
-- 5.  universities
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Everyone can view active universities" ON universities;
DROP POLICY IF EXISTS "Admins can manage universities"        ON universities;

CREATE POLICY "Everyone can view active universities" ON universities
  FOR SELECT
  USING (
    active = true
    OR get_auth_user_role() IN ('agent', 'admin', 'super_admin')
  );

CREATE POLICY "Admins can manage universities" ON universities
  FOR ALL
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------
-- 6.  payments
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Students can view own payments" ON payments;
DROP POLICY IF EXISTS "Agents can manage payments"     ON payments;

CREATE POLICY "Students can view own payments" ON payments
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE created_by = auth.uid()
    )
    OR get_auth_user_role() IN ('agent', 'admin', 'super_admin')
  );

CREATE POLICY "Agents can manage payments" ON payments
  FOR ALL
  USING (get_auth_user_role() IN ('agent', 'admin', 'super_admin'));

-- ----------------------------------------------------------------
-- 7.  entrees_comptables
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view accounting"   ON entrees_comptables;
DROP POLICY IF EXISTS "Admins can manage accounting" ON entrees_comptables;

CREATE POLICY "Admins can view accounting" ON entrees_comptables
  FOR SELECT
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "Admins can manage accounting" ON entrees_comptables
  FOR ALL
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------
-- 8.  sorties_comptables
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view expenses"   ON sorties_comptables;
DROP POLICY IF EXISTS "Admins can manage expenses" ON sorties_comptables;

CREATE POLICY "Admins can view expenses" ON sorties_comptables
  FOR SELECT
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "Admins can manage expenses" ON sorties_comptables
  FOR ALL
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------
-- 9.  user_permissions
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can manage permissions"   ON user_permissions;

CREATE POLICY "Admins can view all permissions" ON user_permissions
  FOR SELECT
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "Admins can manage permissions" ON user_permissions
  FOR ALL
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------
-- 10.  audit_logs
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;

CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------
-- 11.  email_logs
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view email logs" ON email_logs;

CREATE POLICY "Admins can view email logs" ON email_logs
  FOR SELECT
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------
-- Verification
-- ----------------------------------------------------------------
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
