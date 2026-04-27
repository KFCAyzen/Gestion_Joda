-- ============================================================
-- 1. Colonnes manquantes dans dossier_bourses
-- ============================================================
ALTER TABLE dossier_bourses
  ADD COLUMN IF NOT EXISTS desired_program TEXT,
  ADD COLUMN IF NOT EXISTS study_level VARCHAR(50),
  ADD COLUMN IF NOT EXISTS language_level VARCHAR(20),
  ADD COLUMN IF NOT EXISTS scholarship_type VARCHAR(50);

-- ============================================================
-- 2. Colonne manquante dans universities
-- ============================================================
ALTER TABLE universities
  ADD COLUMN IF NOT EXISTS code VARCHAR(10);

-- ============================================================
-- 3. Corriger les rôles et must_change_password
-- ============================================================
UPDATE users SET role = 'super_admin', must_change_password = false WHERE email = 'superadmin@gmail.com';
UPDATE users SET role = 'admin', must_change_password = false WHERE email = 'kepseufrank@gmail.com';
UPDATE users SET must_change_password = false WHERE must_change_password = true;

-- ============================================================
-- 4. Corriger les RLS policies pour inclure super_admin
-- ============================================================

-- students
DROP POLICY IF EXISTS "students_access_policy" ON students;
CREATE POLICY "students_access_policy" ON students
  FOR ALL
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('agent', 'admin', 'supervisor', 'super_admin'))
  );

-- documents
DROP POLICY IF EXISTS "documents_access_policy" ON documents;
CREATE POLICY "documents_access_policy" ON documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = documents.student_id
      AND (s.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('agent', 'admin', 'supervisor', 'super_admin')))
    )
  );

-- dossier_bourses
DROP POLICY IF EXISTS "dossier_bourses_access_policy" ON dossier_bourses;
CREATE POLICY "dossier_bourses_access_policy" ON dossier_bourses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = dossier_bourses.student_id
      AND (s.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('agent', 'admin', 'supervisor', 'super_admin')))
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- payments
DROP POLICY IF EXISTS "payments_access_policy" ON payments;
CREATE POLICY "payments_access_policy" ON payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = payments.student_id
      AND (s.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('agent', 'admin', 'supervisor', 'super_admin')))
    )
  );

-- users
DROP POLICY IF EXISTS "users_access_policy" ON users;
CREATE POLICY "users_access_policy" ON users
  FOR ALL
  USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- universities (lecture + écriture pour admin/super_admin)
DROP POLICY IF EXISTS "universities_access_policy" ON universities;
CREATE POLICY "universities_read_policy" ON universities
  FOR SELECT USING (true);
CREATE POLICY "universities_write_policy" ON universities
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- comptabilité
DROP POLICY IF EXISTS "comptabilite_access_policy" ON entrees_comptables;
CREATE POLICY "comptabilite_access_policy" ON entrees_comptables
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('agent', 'admin', 'supervisor', 'super_admin')));

DROP POLICY IF EXISTS "comptabilite_sorties_access_policy" ON sorties_comptables;
CREATE POLICY "comptabilite_sorties_access_policy" ON sorties_comptables
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('agent', 'admin', 'supervisor', 'super_admin')));

-- notifications (admin peut voir toutes les notifs)
DROP POLICY IF EXISTS "notifications_access_policy" ON notifications;
CREATE POLICY "notifications_access_policy" ON notifications
  FOR ALL
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- ============================================================
-- 5. Vérification
-- ============================================================
SELECT email, role, must_change_password FROM users;
SELECT column_name FROM information_schema.columns WHERE table_name = 'dossier_bourses' ORDER BY ordinal_position;
SELECT column_name FROM information_schema.columns WHERE table_name = 'universities' ORDER BY ordinal_position;
