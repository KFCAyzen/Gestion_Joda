-- Module RH (Ressources Humaines) — Joda Company
-- 4 tables : employees, leave_requests, payslips, daily_reports
-- Accès réservé aux rôles admin, super_admin, supervisor

-- ============================================================================
-- Table employees
-- ============================================================================
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricule text UNIQUE,
  nom text NOT NULL,
  prenom text NOT NULL,
  email text,
  telephone text,
  poste text NOT NULL,
  departement text,
  date_embauche date NOT NULL,
  salaire_base integer NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'actif'
    CHECK (statut IN ('actif', 'suspendu', 'inactif')),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_statut ON employees(statut);
CREATE INDEX IF NOT EXISTS idx_employees_departement ON employees(departement);

-- ============================================================================
-- Table leave_requests (demandes de congés)
-- ============================================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN ('annuel', 'maladie', 'maternite', 'paternite', 'sans_solde', 'autre')),
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  nb_jours integer NOT NULL DEFAULT 1,
  motif text,
  statut text NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente', 'approuve', 'rejete')),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  reviewer_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (date_fin >= date_debut)
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_statut ON leave_requests(statut);

-- ============================================================================
-- Table payslips (fiches de paie mensuelles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  mois integer NOT NULL CHECK (mois BETWEEN 1 AND 12),
  annee integer NOT NULL CHECK (annee BETWEEN 2020 AND 2100),
  salaire_base integer NOT NULL DEFAULT 0,
  primes integer NOT NULL DEFAULT 0,
  deductions integer NOT NULL DEFAULT 0,
  jours_absences integer NOT NULL DEFAULT 0,
  net_a_payer integer NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, mois, annee)
);

CREATE INDEX IF NOT EXISTS idx_payslips_employee ON payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslips_periode ON payslips(annee, mois);

-- ============================================================================
-- Table daily_reports (rapports journaliers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  activites text NOT NULL,
  heures_travaillees numeric(4,2) NOT NULL DEFAULT 8,
  observations text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_employee ON daily_reports(employee_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(date DESC);

-- ============================================================================
-- RLS — Accès admin / super_admin / supervisor uniquement
-- ============================================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- Helper inline check
-- (utilise users.role pour rester cohérent avec le reste du projet)

DROP POLICY IF EXISTS "hr_employees_all" ON employees;
CREATE POLICY "hr_employees_all" ON employees
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'supervisor'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'supervisor'))
  );

DROP POLICY IF EXISTS "hr_leave_requests_all" ON leave_requests;
CREATE POLICY "hr_leave_requests_all" ON leave_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'supervisor'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'supervisor'))
  );

DROP POLICY IF EXISTS "hr_payslips_all" ON payslips;
CREATE POLICY "hr_payslips_all" ON payslips
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'supervisor'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'supervisor'))
  );

DROP POLICY IF EXISTS "hr_daily_reports_all" ON daily_reports;
CREATE POLICY "hr_daily_reports_all" ON daily_reports
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'supervisor'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'supervisor'))
  );

-- ============================================================================
-- Trigger updated_at auto sur les 4 tables
-- ============================================================================
CREATE OR REPLACE FUNCTION hr_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employees_updated_at ON employees;
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION hr_set_updated_at();

DROP TRIGGER IF EXISTS trg_leave_requests_updated_at ON leave_requests;
CREATE TRIGGER trg_leave_requests_updated_at BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION hr_set_updated_at();

DROP TRIGGER IF EXISTS trg_payslips_updated_at ON payslips;
CREATE TRIGGER trg_payslips_updated_at BEFORE UPDATE ON payslips
  FOR EACH ROW EXECUTE FUNCTION hr_set_updated_at();

DROP TRIGGER IF EXISTS trg_daily_reports_updated_at ON daily_reports;
CREATE TRIGGER trg_daily_reports_updated_at BEFORE UPDATE ON daily_reports
  FOR EACH ROW EXECUTE FUNCTION hr_set_updated_at();
