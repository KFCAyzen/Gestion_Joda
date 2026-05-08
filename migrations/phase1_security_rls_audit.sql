-- ============================================
-- PHASE 1: SÉCURITÉ - RLS & AUDIT TRAIL
-- ============================================

-- 1. AUDIT TRAIL (INSERT-ONLY via trigger)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  user_role TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);

-- RLS sur audit_logs (lecture seule pour admins)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Empêcher toute modification manuelle
CREATE POLICY "No manual modifications" ON audit_logs
  FOR ALL
  USING (false);

-- Fonction générique d'audit
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  user_data RECORD;
BEGIN
  -- Récupérer les infos utilisateur
  SELECT id, email, role INTO user_data
  FROM users
  WHERE id = auth.uid();

  INSERT INTO audit_logs (
    table_name,
    operation,
    record_id,
    old_data,
    new_data,
    user_id,
    user_email,
    user_role
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    user_data.id,
    user_data.email,
    user_data.role
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ACTIVATION RLS SUR TOUTES LES TABLES
-- ============================================

-- Table: users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin', 'agent')
    )
  );

DROP POLICY IF EXISTS "Admins can manage users" ON users;
CREATE POLICY "Admins can manage users" ON users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- Table: students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own data" ON students;
CREATE POLICY "Students can view own data" ON students
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('agent', 'admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Agents can manage students" ON students;
CREATE POLICY "Agents can manage students" ON students
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('agent', 'admin', 'super_admin')
    )
  );

-- Table: universities
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view active universities" ON universities;
CREATE POLICY "Everyone can view active universities" ON universities
  FOR SELECT
  USING (active = true OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('agent', 'admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "Admins can manage universities" ON universities;
CREATE POLICY "Admins can manage universities" ON universities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Table: payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own payments" ON payments;
CREATE POLICY "Students can view own payments" ON payments
  FOR SELECT
  USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('agent', 'admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Agents can manage payments" ON payments;
CREATE POLICY "Agents can manage payments" ON payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('agent', 'admin', 'super_admin')
    )
  );

-- Table: entrees_comptables
ALTER TABLE entrees_comptables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view accounting" ON entrees_comptables;
CREATE POLICY "Admins can view accounting" ON entrees_comptables
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage accounting" ON entrees_comptables;
CREATE POLICY "Admins can manage accounting" ON entrees_comptables
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Table: sorties_comptables
ALTER TABLE sorties_comptables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view expenses" ON sorties_comptables;
CREATE POLICY "Admins can view expenses" ON sorties_comptables
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage expenses" ON sorties_comptables;
CREATE POLICY "Admins can manage expenses" ON sorties_comptables
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- 3. TRIGGERS D'AUDIT SUR TABLES SENSIBLES
-- ============================================

-- Users
DROP TRIGGER IF EXISTS audit_users_trigger ON users;
CREATE TRIGGER audit_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Students
DROP TRIGGER IF EXISTS audit_students_trigger ON students;
CREATE TRIGGER audit_students_trigger
  AFTER INSERT OR UPDATE OR DELETE ON students
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Payments
DROP TRIGGER IF EXISTS audit_payments_trigger ON payments;
CREATE TRIGGER audit_payments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Entrees comptables
DROP TRIGGER IF EXISTS audit_entrees_trigger ON entrees_comptables;
CREATE TRIGGER audit_entrees_trigger
  AFTER INSERT OR UPDATE OR DELETE ON entrees_comptables
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Sorties comptables
DROP TRIGGER IF EXISTS audit_sorties_trigger ON sorties_comptables;
CREATE TRIGGER audit_sorties_trigger
  AFTER INSERT OR UPDATE OR DELETE ON sorties_comptables
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- User permissions
DROP TRIGGER IF EXISTS audit_user_permissions_trigger ON user_permissions;
CREATE TRIGGER audit_user_permissions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_permissions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
