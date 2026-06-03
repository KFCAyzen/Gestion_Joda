-- Module RH — Évaluations des employés (notation par critères)
-- Idempotente. À exécuter dans Supabase SQL Editor.

-- ============================================================================
-- 1. hr_employee_evaluations : une évaluation = un ensemble de notes /5
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_employee_evaluations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date_evaluation date NOT NULL DEFAULT CURRENT_DATE,
    periode text,
    note_qualite integer NOT NULL CHECK (note_qualite BETWEEN 1 AND 5),
    note_productivite integer NOT NULL CHECK (note_productivite BETWEEN 1 AND 5),
    note_ponctualite integer NOT NULL CHECK (note_ponctualite BETWEEN 1 AND 5),
    note_equipe integer NOT NULL CHECK (note_equipe BETWEEN 1 AND 5),
    note_communication integer NOT NULL CHECK (note_communication BETWEEN 1 AND 5),
    note_initiative integer NOT NULL CHECK (note_initiative BETWEEN 1 AND 5),
    note_discipline integer NOT NULL CHECK (note_discipline BETWEEN 1 AND 5),
    note_globale numeric(3,2) NOT NULL CHECK (note_globale >= 0 AND note_globale <= 5),
    points_forts text,
    axes_amelioration text,
    commentaire text,
    evaluateur_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_eval_employee ON hr_employee_evaluations(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_eval_date ON hr_employee_evaluations(date_evaluation DESC);

-- ============================================================================
-- 2. updated_at trigger (réutilise hr_set_updated_at de add_hr_payroll_config)
-- ============================================================================
DROP TRIGGER IF EXISTS trg_hr_eval_updated_at ON hr_employee_evaluations;
CREATE TRIGGER trg_hr_eval_updated_at BEFORE UPDATE ON hr_employee_evaluations
  FOR EACH ROW EXECUTE FUNCTION hr_set_updated_at();

-- ============================================================================
-- 3. RLS — admin/super_admin/supervisor uniquement
-- ============================================================================
ALTER TABLE hr_employee_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_eval_all" ON hr_employee_evaluations;
CREATE POLICY "hr_eval_all" ON hr_employee_evaluations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('admin','super_admin','supervisor')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('admin','super_admin','supervisor')));
