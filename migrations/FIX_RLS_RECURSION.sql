-- ================================================================
-- FIX: Infinite recursion in RLS policies
-- ================================================================
-- INSTRUCTIONS: paste this entire script in Supabase SQL Editor
--               and click "Run".
-- ================================================================
--
-- Root cause: every role-check policy used
--   EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN (...))
-- On the `users` table this is directly self-recursive.
-- On other tables it still recurses because that subquery triggers
-- the `users` RLS policies, which themselves query `users` again.
--
-- Fix: a SECURITY DEFINER function reads the role once, bypassing
-- RLS entirely (it runs as the postgres superuser at call time).
-- All policies are rewritten to call it instead of using subqueries.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Helper — reads current user's role without going through RLS
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT role
  FROM public.users
  WHERE id = (
    SELECT auth.uid()   -- schema-qualified; not affected by search_path
  )
  LIMIT 1
$$;

-- ----------------------------------------------------------------
-- 2. users
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all users"  ON users;
DROP POLICY IF EXISTS "Admins can manage users"    ON users;

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT
  USING (get_auth_user_role() IN ('admin', 'super_admin', 'agent'));

CREATE POLICY "Admins can manage users" ON users
  FOR ALL
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- "Users can view own profile" (id = auth.uid()) is fine — no change.

-- ----------------------------------------------------------------
-- 3. students
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
-- 4. universities
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
-- 5. payments
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
-- 6. entrees_comptables
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
-- 7. sorties_comptables
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
-- 8. user_permissions
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
-- 9. audit_logs
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;

CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------
-- 10. email_logs
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view email logs" ON email_logs;

CREATE POLICY "Admins can view email logs" ON email_logs
  FOR SELECT
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------
-- Verification — should list all active policies
-- ----------------------------------------------------------------
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
