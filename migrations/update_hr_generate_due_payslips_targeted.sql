-- Évolution : hr_generate_due_payslips supporte une période cible (mois/année)
-- Modes :
--   • Auto (target_year/month = NULL) : génère pour le mois courant, respecte
--     le garde-fou pay_date > today et le verrou last_run_period.
--   • Ciblé (target_year + target_month renseignés) : génère pour cette période
--     précise, bypass pay_date>today et bypass le verrou last_run_period.
-- Anti-double-génération conservé via NOT EXISTS payslip(emp, mois, annee).
-- Idempotent : CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION hr_generate_due_payslips(
  target_user uuid DEFAULT NULL,
  target_year int DEFAULT NULL,
  target_month int DEFAULT NULL
)
RETURNS TABLE (payslip_id uuid, employee_id uuid, schedule_id uuid, net_a_payer integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  today date := CURRENT_DATE;
  is_targeted boolean := (target_year IS NOT NULL AND target_month IS NOT NULL);
  run_year int := COALESCE(target_year, EXTRACT(YEAR FROM today)::int);
  run_month int := COALESCE(target_month, EXTRACT(MONTH FROM today)::int);
  run_period text := to_char(make_date(run_year, run_month, 1), 'YYYY-MM');
  month_start date := make_date(run_year, run_month, 1);
  month_end date := (month_start + interval '1 month - 1 day')::date;
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
  IF is_targeted AND (target_month < 1 OR target_month > 12) THEN
    RAISE EXCEPTION 'target_month must be 1..12 (got %)', target_month;
  END IF;

  FOR sched IN
    SELECT * FROM hr_payment_schedules
    WHERE actif = true
      AND (is_targeted OR last_run_period IS NULL OR last_run_period <> run_period)
  LOOP
    effective_day := LEAST(sched.day_of_month, EXTRACT(DAY FROM month_end)::int);
    pay_date := make_date(run_year, run_month, effective_day);

    -- Garde-fou anti-anticipation : seulement en mode auto
    IF NOT is_targeted AND pay_date > today THEN
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
            AND payslips.mois = run_month
            AND payslips.annee = run_year
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
           AND date >= month_start
           AND date < month_start + interval '1 month'),
        0
      );
      net := GREATEST(base_sal + primes - deductions, 0);

      INSERT INTO payslips (
        employee_id, mois, annee, salaire_base, primes, deductions,
        jours_absences, net_a_payer, payment_date, auto_generated, schedule_id, created_by, notes
      ) VALUES (
        emp.id, run_month, run_year, base_sal, primes, deductions,
        0, net, pay_date, true, sched.id, target_user,
        CASE WHEN is_targeted
             THEN 'Généré (période ciblée) — ' || sched.label
             ELSE 'Généré automatiquement — ' || sched.label
        END
      ) RETURNING id INTO new_id;

      -- Lier les occurrences du mois ciblé non encore liées
      UPDATE hr_deduction_occurrences
      SET payslip_id = new_id
      WHERE employee_id = emp.id
        AND payslip_id IS NULL
        AND date >= month_start
        AND date < month_start + interval '1 month';

      payslip_id := new_id;
      employee_id := emp.id;
      schedule_id := sched.id;
      net_a_payer := net;
      RETURN NEXT;
    END LOOP;

    -- last_run_period = max(existant, période traitée) — pour ne pas régresser
    UPDATE hr_payment_schedules
    SET last_run_period = GREATEST(COALESCE(last_run_period, ''), run_period)
    WHERE id = sched.id;
  END LOOP;
END;
$$;
