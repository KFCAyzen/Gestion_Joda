-- ============================================================
-- FIX: Infinite recursion in RLS policies
-- ============================================================
-- Root cause: every policy checked roles via
--   EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN (...))
-- On the `users` table itself this is directly recursive.
-- On other tables it triggers the `users` RLS policies, which then
-- recurse back into `users` again.
--
-- Fix: one SECURITY DEFINER function that reads the role WITHOUT
-- going through RLS, then replace every subquery with a call to it.
-- ============================================================

-- 1. Helper function (SECURITY DEFINER bypasses RLS on users)
CREATE OR REPLACE FUNCTION get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

-- ============================================================
-- 2. Table: users
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all users"  ON users;
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT
  USING (get_auth_user_role() IN ('admin', 'super_admin', 'agent'));

DROP POLICY IF EXISTS "Admins can manage users" ON users;
CREATE POLICY "Admins can manage users" ON users
  FOR ALL
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- "Users can view own profile" is fine — no subquery, no change needed.

-- ============================================================
-- 3. Table: students
-- ============================================================
DROP POLICY IF EXISTS "Students can view own data" ON students;
CREATE POLICY "Students can view own data" ON students
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR get_auth_user_role() IN ('agent', 'admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Agents can manage students" ON students;
CREATE POLICY "Agents can manage students" ON students
  FOR ALL
  USING (get_auth_user_role() IN ('agent', 'admin', 'super_admin'));

-- ============================================================
-- 4. Table: universities
-- ============================================================
DROP POLICY IF EXISTS "Everyone can view active universities" ON universities;
CREATE POLICY "Everyone can view active universities" ON universities
  FOR SELECT
  USING (
    active = true
    OR get_auth_user_role() IN ('agent', 'admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Admins can manage universities" ON universities;
CREATE POLICY "Admins can manage universities" ON universities
  FOR ALL
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ============================================================
-- 5. Table: payments
-- ============================================================
DROP POLICY IF EXISTS "Students can view own payments" ON payments;
CREATE POLICY "Students can view own payments" ON payments
  FOR SELECT
  USING (
    student_id IN (SELECT id FROM students WHERE created_by = auth.uid())
    OR get_auth_user_role() IN ('agent', 'admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Agents can manage payments" ON payments;
CREATE POLICY "Agents can manage payments" ON payments
  FOR ALL
  USING (get_auth_user_role() IN ('agent', 'admin', 'super_admin'));

-- ============================================================
-- 6. Table: entrees_comptables
-- ============================================================
DROP POLICY IF EXISTS "Admins can view accounting"  ON entrees_comptables;
CREATE POLICY "Admins can view accounting" ON entrees_comptables
  FOR SELECT
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "Admins can manage accounting" ON entrees_comptables;
CREATE POLICY "Admins can manage accounting" ON entrees_comptables
  FOR ALL
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ============================================================
-- 7. Table: sorties_comptables
-- ============================================================
DROP POLICY IF EXISTS "Admins can view expenses"  ON sorties_comptables;
CREATE POLICY "Admins can view expenses" ON sorties_comptables
  FOR SELECT
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "Admins can manage expenses" ON sorties_comptables;
CREATE POLICY "Admins can manage expenses" ON sorties_comptables
  FOR ALL
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ============================================================
-- 8. Table: user_permissions
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all permissions" ON user_permissions;
CREATE POLICY "Admins can view all permissions" ON user_permissions
  FOR SELECT
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "Admins can manage permissions" ON user_permissions;
CREATE POLICY "Admins can manage permissions" ON user_permissions
  FOR ALL
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- "Users can view own permissions" is fine — no subquery, no change needed.

-- ============================================================
-- 9. Table: audit_logs
-- ============================================================
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ============================================================
-- 10. Table: email_logs
-- ============================================================
DROP POLICY IF EXISTS "Admins can view email logs" ON email_logs;
CREATE POLICY "Admins can view email logs" ON email_logs
  FOR SELECT
  USING (get_auth_user_role() IN ('admin', 'super_admin'));

-- ============================================================
-- Verification
-- ============================================================
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
