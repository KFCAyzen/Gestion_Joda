-- Module RH — Configuration paye, déductions et échéancier
-- Idempotente. À exécuter dans Supabase SQL Editor.

-- ============================================================================
-- 1. hr_deduction_rules : règles globales (absence, retard, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_deduction_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text UNIQUE NOT NULL,
    label text NOT NULL,
    type text NOT NULL CHECK (type IN ('absence_non_justifiee', 'retard', 'manquement_personnalise')),
    amount_type text NOT NULL CHECK (amount_type IN ('fixed', 'percent_base')),
    amount numeric NOT NULL CHECK (amount >= 0),
    actif boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_deduction_rules_actif ON hr_deduction_rules(actif);

-- ============================================================================
-- 2. hr_deduction_occurrences : enregistrements de manquements
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_deduction_occurrences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    rule_id uuid NOT NULL REFERENCES hr_deduction_rules(id) ON DELETE RESTRICT,
    date date NOT NULL,
    montant integer NOT NULL CHECK (montant >= 0),
    motif text,
    payslip_id uuid REFERENCES payslips(id) ON DELETE SET NULL,
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_deduction_occ_employee ON hr_deduction_occurrences(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_deduction_occ_date ON hr_deduction_occurrences(date DESC);
CREATE INDEX IF NOT EXISTS idx_hr_deduction_occ_payslip ON hr_deduction_occurrences(payslip_id);

-- ============================================================================
-- 3. hr_payment_schedules : échéanciers (mensuel)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_payment_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    label text NOT NULL,
    scope text NOT NULL CHECK (scope IN ('all', 'department', 'employee')),
    target_department text,
    target_employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
    day_of_month int NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
    actif boolean NOT NULL DEFAULT true,
    last_run_period text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (
        (scope = 'all' AND target_department IS NULL AND target_employee_id IS NULL)
     OR (scope = 'department' AND target_department IS NOT NULL AND target_employee_id IS NULL)
     OR (scope = 'employee' AND target_employee_id IS NOT NULL AND target_department IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_hr_schedules_actif ON hr_payment_schedules(actif);

-- ============================================================================
-- 4. hr_employee_pay_config : primes récurrentes par employé
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_employee_pay_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
    primes_recurrentes integer NOT NULL DEFAULT 0 CHECK (primes_recurrentes >= 0),
    salaire_personnalise integer CHECK (salaire_personnalise IS NULL OR salaire_personnalise >= 0),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. payslips : colonnes paie auto
-- ============================================================================
ALTER TABLE payslips
    ADD COLUMN IF NOT EXISTS payment_date date,
    ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS schedule_id uuid REFERENCES hr_payment_schedules(id) ON DELETE SET NULL;

-- ============================================================================
-- 6. updated_at triggers
-- ============================================================================
DROP TRIGGER IF EXISTS trg_hr_deduction_rules_updated_at ON hr_deduction_rules;
CREATE TRIGGER trg_hr_deduction_rules_updated_at BEFORE UPDATE ON hr_deduction_rules
  FOR EACH ROW EXECUTE FUNCTION hr_set_updated_at();

DROP TRIGGER IF EXISTS trg_hr_deduction_occ_updated_at ON hr_deduction_occurrences;
CREATE TRIGGER trg_hr_deduction_occ_updated_at BEFORE UPDATE ON hr_deduction_occurrences
  FOR EACH ROW EXECUTE FUNCTION hr_set_updated_at();

DROP TRIGGER IF EXISTS trg_hr_schedules_updated_at ON hr_payment_schedules;
CREATE TRIGGER trg_hr_schedules_updated_at BEFORE UPDATE ON hr_payment_schedules
  FOR EACH ROW EXECUTE FUNCTION hr_set_updated_at();

DROP TRIGGER IF EXISTS trg_hr_pay_config_updated_at ON hr_employee_pay_config;
CREATE TRIGGER trg_hr_pay_config_updated_at BEFORE UPDATE ON hr_employee_pay_config
  FOR EACH ROW EXECUTE FUNCTION hr_set_updated_at();

-- ============================================================================
-- 7. RLS — admin/super_admin/supervisor uniquement
-- ============================================================================
ALTER TABLE hr_deduction_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_deduction_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_employee_pay_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_ded_rules_all" ON hr_deduction_rules;
CREATE POLICY "hr_ded_rules_all" ON hr_deduction_rules
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('admin','super_admin','supervisor')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('admin','super_admin','supervisor')));

DROP POLICY IF EXISTS "hr_ded_occ_all" ON hr_deduction_occurrences;
CREATE POLICY "hr_ded_occ_all" ON hr_deduction_occurrences
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('admin','super_admin','supervisor')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('admin','super_admin','supervisor')));

DROP POLICY IF EXISTS "hr_schedules_all" ON hr_payment_schedules;
CREATE POLICY "hr_schedules_all" ON hr_payment_schedules
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('admin','super_admin','supervisor')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('admin','super_admin','supervisor')));

DROP POLICY IF EXISTS "hr_pay_config_all" ON hr_employee_pay_config;
CREATE POLICY "hr_pay_config_all" ON hr_employee_pay_config
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('admin','super_admin','supervisor')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('admin','super_admin','supervisor')));

-- ============================================================================
-- 8. Update trigger payslip → sortie pour utiliser payment_date
-- ============================================================================
CREATE OR REPLACE FUNCTION hr_payslip_to_sortie()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_name text;
  mois_label text;
  sortie_date date;
BEGIN
  SELECT prenom || ' ' || nom INTO emp_name
  FROM public.employees
  WHERE id = NEW.employee_id;

  mois_label := CASE NEW.mois
    WHEN 1  THEN 'Janv.'  WHEN 2  THEN 'Févr.'  WHEN 3  THEN 'Mars'
    WHEN 4  THEN 'Avril'  WHEN 5  THEN 'Mai'    WHEN 6  THEN 'Juin'
    WHEN 7  THEN 'Juil.'  WHEN 8  THEN 'Août'   WHEN 9  THEN 'Sept.'
    WHEN 10 THEN 'Oct.'   WHEN 11 THEN 'Nov.'   WHEN 12 THEN 'Déc.'
    ELSE NEW.mois::text
  END;

  sortie_date := COALESCE(NEW.payment_date, CURRENT_DATE);

  INSERT INTO public.sorties_comptables (
    montant, date, categorie, description, payslip_id, created_by, status
  ) VALUES (
    NEW.net_a_payer,
    sortie_date,
    'salaires',
    'Salaire ' || COALESCE(emp_name, 'employé') || ' — ' || mois_label || ' ' || NEW.annee,
    NEW.id,
    NEW.created_by,
    'pending'
  );

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 9. Helper: salaire effectif d'un employé (override > base)
-- ============================================================================
CREATE OR REPLACE FUNCTION hr_effective_salary(emp_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT salaire_personnalise FROM hr_employee_pay_config
     WHERE employee_id = emp_id AND salaire_personnalise IS NOT NULL),
    (SELECT salaire_base FROM employees WHERE id = emp_id),
    0
  );
$$;

-- ============================================================================
-- 10. RPC: génération auto des fiches dues pour la période courante
-- ============================================================================
CREATE OR REPLACE FUNCTION hr_generate_due_payslips(target_user uuid DEFAULT NULL)
RETURNS TABLE (payslip_id uuid, employee_id uuid, schedule_id uuid, net_a_payer integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := CURRENT_DATE;
  current_period text := to_char(today, 'YYYY-MM');
  current_year int := EXTRACT(YEAR FROM today)::int;
  current_month int := EXTRACT(MONTH FROM today)::int;
  sched record;
  emp record;
  effective_day int;
  pay_date date;
  base_sal int;
  primes int;
  deductions int;
  net int;
  new_id uuid;
BEGIN
  FOR sched IN
    SELECT * FROM hr_payment_schedules
    WHERE actif = true
      AND (last_run_period IS NULL OR last_run_period <> current_period)
  LOOP
    -- jour effectif clampé à la fin du mois
    effective_day := LEAST(sched.day_of_month,
      EXTRACT(DAY FROM (date_trunc('month', today) + interval '1 month - 1 day'))::int);
    pay_date := make_date(current_year, current_month, effective_day);

    -- ne pas générer en avance
    IF pay_date > today THEN
      CONTINUE;
    END IF;

    FOR emp IN
      SELECT * FROM employees
      WHERE statut = 'actif'
        AND (
          sched.scope = 'all'
          OR (sched.scope = 'department' AND departement = sched.target_department)
          OR (sched.scope = 'employee' AND id = sched.target_employee_id)
        )
        AND NOT EXISTS (
          SELECT 1 FROM payslips
          WHERE payslips.employee_id = employees.id
            AND payslips.mois = current_month
            AND payslips.annee = current_year
        )
    LOOP
      base_sal := hr_effective_salary(emp.id);
      primes := COALESCE(
        (SELECT primes_recurrentes FROM hr_employee_pay_config WHERE employee_id = emp.id),
        0
      );
      deductions := COALESCE(
        (SELECT SUM(montant)::int FROM hr_deduction_occurrences
         WHERE employee_id = emp.id
           AND payslip_id IS NULL
           AND date >= date_trunc('month', today)
           AND date < date_trunc('month', today) + interval '1 month'),
        0
      );
      net := GREATEST(base_sal + primes - deductions, 0);

      INSERT INTO payslips (
        employee_id, mois, annee, salaire_base, primes, deductions,
        jours_absences, net_a_payer, payment_date, auto_generated, schedule_id, created_by, notes
      ) VALUES (
        emp.id, current_month, current_year, base_sal, primes, deductions,
        0, net, pay_date, true, sched.id, target_user,
        'Généré automatiquement — ' || sched.label
      ) RETURNING id INTO new_id;

      -- lier les occurrences de déduction du mois à la fiche
      UPDATE hr_deduction_occurrences
      SET payslip_id = new_id
      WHERE employee_id = emp.id
        AND payslip_id IS NULL
        AND date >= date_trunc('month', today)
        AND date < date_trunc('month', today) + interval '1 month';

      payslip_id := new_id;
      employee_id := emp.id;
      schedule_id := sched.id;
      net_a_payer := net;
      RETURN NEXT;
    END LOOP;

    UPDATE hr_payment_schedules
    SET last_run_period = current_period
    WHERE id = sched.id;
  END LOOP;
END;
$$;

-- ============================================================================
-- 11. Helper RPC: récap mensuel d'un employé (pour la vue détail)
-- ============================================================================
CREATE OR REPLACE FUNCTION hr_employee_monthly_summary(emp_id uuid, year_p int, month_p int)
RETURNS TABLE (
  total_reports int,
  total_hours numeric,
  approved_leave_days int,
  pending_leave_days int,
  rejected_leave_days int,
  deductions_total int,
  deductions_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
    period AS (
      SELECT make_date(year_p, month_p, 1) AS start_d,
             (make_date(year_p, month_p, 1) + interval '1 month')::date AS end_d
    ),
    rep AS (
      SELECT COUNT(*)::int AS n, COALESCE(SUM(heures_travaillees), 0)::numeric AS h
      FROM daily_reports, period
      WHERE employee_id = emp_id AND date >= period.start_d AND date < period.end_d
    ),
    lv AS (
      SELECT
        COALESCE(SUM(CASE WHEN statut='approuve' THEN nb_jours END),0)::int AS app,
        COALESCE(SUM(CASE WHEN statut='en_attente' THEN nb_jours END),0)::int AS pen,
        COALESCE(SUM(CASE WHEN statut='rejete' THEN nb_jours END),0)::int AS rej
      FROM leave_requests, period
      WHERE employee_id = emp_id
        AND date_debut < period.end_d AND date_fin >= period.start_d
    ),
    ded AS (
      SELECT COALESCE(SUM(montant),0)::int AS tot, COUNT(*)::int AS n
      FROM hr_deduction_occurrences, period
      WHERE employee_id = emp_id
        AND date >= period.start_d AND date < period.end_d
    )
  SELECT rep.n, rep.h, lv.app, lv.pen, lv.rej, ded.tot, ded.n
  FROM rep, lv, ded;
$$;
