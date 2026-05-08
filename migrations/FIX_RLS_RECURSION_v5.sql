-- ================================================================
-- FIX RLS RECURSION v5 — DEFINITIVE
-- ================================================================
-- Run this entire script in Supabase SQL Editor.
-- It shows current state, repairs every policy, then confirms.
-- ================================================================

-- ----------------------------------------------------------------
-- STEP 0 — Diagnostic: what policies are currently on `users`?
-- ----------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  found_any BOOLEAN := false;
BEGIN
  FOR r IN
    SELECT policyname, cmd, qual
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
    ORDER BY policyname
  LOOP
    found_any := true;
    RAISE NOTICE '[BEFORE] users policy: "%" (cmd=%, qual=%)', r.policyname, r.cmd, r.qual;
  END LOOP;
  IF NOT found_any THEN
    RAISE NOTICE '[BEFORE] No policies found on users table.';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- STEP 1 — JWT helper (pure token parse, zero DB queries)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata'  ->> 'role', ''),
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'role', '')
  )
$$;

-- ----------------------------------------------------------------
-- STEP 2 — Drop ALL policies on `users` (by name and dynamically)
-- ----------------------------------------------------------------

-- Drop by known names from all previous migrations
DROP POLICY IF EXISTS "Users can view own profile"    ON public.users;
DROP POLICY IF EXISTS "Admins can view all users"     ON public.users;
DROP POLICY IF EXISTS "Admins can manage users"       ON public.users;
DROP POLICY IF EXISTS "users_own_row"                 ON public.users;
DROP POLICY IF EXISTS "users_admin_select"            ON public.users;
DROP POLICY IF EXISTS "users_admin_all"               ON public.users;

-- Drop any remaining unknown policies dynamically
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', r.policyname);
    RAISE NOTICE '[DROP] Dropped residual policy: "%"', r.policyname;
  END LOOP;
END $$;

-- ----------------------------------------------------------------
-- STEP 3 — Create clean, non-recursive policies on `users`
-- ----------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Own row: every authenticated user can read their own record
CREATE POLICY "users_own_row" ON public.users
  FOR SELECT
  USING (id = auth.uid());

-- Staff read: admins, super_admins, agents can read all users
CREATE POLICY "users_staff_select" ON public.users
  FOR SELECT
  USING (public.get_auth_user_role() IN ('admin', 'super_admin', 'agent'));

-- Admin write: admins and super_admins can insert/update/delete
CREATE POLICY "users_admin_write" ON public.users
  FOR ALL
  USING (public.get_auth_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.get_auth_user_role() IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------
-- STEP 4 — Fix all other tables that still have recursive patterns
-- ----------------------------------------------------------------

-- students
DROP POLICY IF EXISTS "Students can view own data"    ON public.students;
DROP POLICY IF EXISTS "Agents can manage students"    ON public.students;
DROP POLICY IF EXISTS "students_own_row"              ON public.students;
DROP POLICY IF EXISTS "students_staff_all"            ON public.students;

CREATE POLICY "students_own_row" ON public.students
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR public.get_auth_user_role() IN ('agent', 'admin', 'super_admin')
  );

CREATE POLICY "students_staff_all" ON public.students
  FOR ALL
  USING (public.get_auth_user_role() IN ('agent', 'admin', 'super_admin'))
  WITH CHECK (public.get_auth_user_role() IN ('agent', 'admin', 'super_admin'));

-- universities
DROP POLICY IF EXISTS "Everyone can view active universities" ON public.universities;
DROP POLICY IF EXISTS "Admins can manage universities"        ON public.universities;
DROP POLICY IF EXISTS "universities_public_select"            ON public.universities;
DROP POLICY IF EXISTS "universities_admin_all"                ON public.universities;

CREATE POLICY "universities_public_select" ON public.universities
  FOR SELECT
  USING (
    active = true
    OR public.get_auth_user_role() IN ('agent', 'admin', 'super_admin')
  );

CREATE POLICY "universities_admin_all" ON public.universities
  FOR ALL
  USING (public.get_auth_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.get_auth_user_role() IN ('admin', 'super_admin'));

-- payments
DROP POLICY IF EXISTS "Students can view own payments"  ON public.payments;
DROP POLICY IF EXISTS "Agents can manage payments"      ON public.payments;
DROP POLICY IF EXISTS "payments_own_select"             ON public.payments;
DROP POLICY IF EXISTS "payments_staff_all"              ON public.payments;

CREATE POLICY "payments_own_select" ON public.payments
  FOR SELECT
  USING (
    student_id IN (SELECT id FROM public.students WHERE created_by = auth.uid())
    OR public.get_auth_user_role() IN ('agent', 'admin', 'super_admin')
  );

CREATE POLICY "payments_staff_all" ON public.payments
  FOR ALL
  USING (public.get_auth_user_role() IN ('agent', 'admin', 'super_admin'))
  WITH CHECK (public.get_auth_user_role() IN ('agent', 'admin', 'super_admin'));

-- entrees_comptables
DROP POLICY IF EXISTS "Admins can view accounting"      ON public.entrees_comptables;
DROP POLICY IF EXISTS "Admins can manage accounting"    ON public.entrees_comptables;
DROP POLICY IF EXISTS "entrees_admin_select"            ON public.entrees_comptables;
DROP POLICY IF EXISTS "entrees_admin_all"               ON public.entrees_comptables;

CREATE POLICY "entrees_admin_select" ON public.entrees_comptables
  FOR SELECT
  USING (public.get_auth_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "entrees_admin_all" ON public.entrees_comptables
  FOR ALL
  USING (public.get_auth_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.get_auth_user_role() IN ('admin', 'super_admin'));

-- sorties_comptables
DROP POLICY IF EXISTS "Admins can view expenses"        ON public.sorties_comptables;
DROP POLICY IF EXISTS "Admins can manage expenses"      ON public.sorties_comptables;
DROP POLICY IF EXISTS "sorties_admin_select"            ON public.sorties_comptables;
DROP POLICY IF EXISTS "sorties_admin_all"               ON public.sorties_comptables;

CREATE POLICY "sorties_admin_select" ON public.sorties_comptables
  FOR SELECT
  USING (public.get_auth_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "sorties_admin_all" ON public.sorties_comptables
  FOR ALL
  USING (public.get_auth_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.get_auth_user_role() IN ('admin', 'super_admin'));

-- user_permissions
DROP POLICY IF EXISTS "Admins can view all permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can manage permissions"   ON public.user_permissions;
DROP POLICY IF EXISTS "Users can view own permissions"  ON public.user_permissions;
DROP POLICY IF EXISTS "permissions_admin_select"        ON public.user_permissions;
DROP POLICY IF EXISTS "permissions_admin_all"           ON public.user_permissions;

CREATE POLICY "permissions_own_select" ON public.user_permissions
  FOR SELECT
  USING (user_id = auth.uid() OR public.get_auth_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "permissions_admin_all" ON public.user_permissions
  FOR ALL
  USING (public.get_auth_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.get_auth_user_role() IN ('admin', 'super_admin'));

-- audit_logs
DROP POLICY IF EXISTS "Admins can view audit logs"  ON public.audit_logs;
DROP POLICY IF EXISTS "No manual modifications"     ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_admin_select"     ON public.audit_logs;

CREATE POLICY "audit_logs_admin_select" ON public.audit_logs
  FOR SELECT
  USING (public.get_auth_user_role() IN ('admin', 'super_admin'));

-- email_logs
DROP POLICY IF EXISTS "Admins can view email logs"  ON public.email_logs;
DROP POLICY IF EXISTS "email_logs_admin_select"     ON public.email_logs;

CREATE POLICY "email_logs_admin_select" ON public.email_logs
  FOR SELECT
  USING (public.get_auth_user_role() IN ('admin', 'super_admin'));

-- cours_langues
DROP POLICY IF EXISTS "staff_all_cours_langues"         ON public.cours_langues;
DROP POLICY IF EXISTS "student_read_own_cours_langues"  ON public.cours_langues;
DROP POLICY IF EXISTS "cours_langues_staff_all"         ON public.cours_langues;
DROP POLICY IF EXISTS "cours_langues_student_select"    ON public.cours_langues;

CREATE POLICY "cours_langues_staff_all" ON public.cours_langues
  FOR ALL
  USING (public.get_auth_user_role() IN ('agent', 'supervisor', 'admin', 'super_admin'))
  WITH CHECK (public.get_auth_user_role() IN ('agent', 'supervisor', 'admin', 'super_admin'));

CREATE POLICY "cours_langues_student_select" ON public.cours_langues
  FOR SELECT
  USING (
    student_id IN (SELECT id FROM public.students WHERE created_by = auth.uid())
  );

-- ----------------------------------------------------------------
-- STEP 5 — Sync role into JWT app_metadata for all existing users
-- ----------------------------------------------------------------
DO $$
BEGIN
  UPDATE auth.users au
  SET raw_app_meta_data =
    COALESCE(au.raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', pu.role)
  FROM public.users pu
  WHERE au.id = pu.id
    AND (au.raw_app_meta_data ->> 'role') IS DISTINCT FROM pu.role;

  UPDATE auth.users au
  SET raw_user_meta_data =
    COALESCE(au.raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', pu.role)
  FROM public.users pu
  WHERE au.id = pu.id
    AND (au.raw_user_meta_data ->> 'role') IS DISTINCT FROM pu.role;

  RAISE NOTICE '[SYNC] JWT metadata synced successfully.';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[SYNC] Skipped (insufficient privilege): %', SQLERRM;
END $$;

-- ----------------------------------------------------------------
-- STEP 6 — Verification: show final state of users policies
-- ----------------------------------------------------------------
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'students', 'payments', 'universities',
    'entrees_comptables', 'sorties_comptables',
    'user_permissions', 'audit_logs', 'email_logs', 'cours_langues'
  )
ORDER BY tablename, policyname;
