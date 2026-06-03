-- Aligne le net auto-généré sur la ventilation légale camerounaise (CNPS + impôts
-- sur salaire), en MIROIR du moteur TS `src/app/lib/cameroonPayroll.ts`.
-- Toute évolution de taux doit être répercutée des DEUX côtés.
--
-- ⚠️ Barèmes usuels (CGI + CNPS) — à vérifier annuellement avec un comptable.
-- Idempotent : CREATE OR REPLACE.

-- 1) Fonction de calcul du net (part salariale), déterministe sur base + primes.
CREATE OR REPLACE FUNCTION hr_compute_cameroon_net(
  p_base int,
  p_primes int,
  p_autres int DEFAULT 0
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  brut        numeric := GREATEST(COALESCE(p_base, 0), 0) + GREATEST(COALESCE(p_primes, 0), 0);
  autres      numeric := GREATEST(COALESCE(p_autres, 0), 0);
  pvid_base   numeric := LEAST(brut, 750000);
  pvid        numeric := round(pvid_base * 0.042);
  cfc         numeric := round(brut * 0.01);
  net_cat     numeric := brut * 12 * 0.70 - (round(LEAST(brut, 750000) * 0.042) * 12) - 500000;
  irpp_annuel numeric := 0;
  remaining   numeric;
  irpp        numeric;
  cac         numeric;
  rav         numeric;
  tdl         numeric;
  total_ret   numeric;
BEGIN
  -- IRPP annuel progressif sur le revenu net catégoriel
  IF net_cat > 0 THEN
    remaining := net_cat;
    irpp_annuel := irpp_annuel + LEAST(remaining, 2000000) * 0.10;
    remaining   := remaining - LEAST(remaining, 2000000);
    IF remaining > 0 THEN
      irpp_annuel := irpp_annuel + LEAST(remaining, 1000000) * 0.15;
      remaining   := remaining - LEAST(remaining, 1000000);
    END IF;
    IF remaining > 0 THEN
      irpp_annuel := irpp_annuel + LEAST(remaining, 2000000) * 0.25;
      remaining   := remaining - LEAST(remaining, 2000000);
    END IF;
    IF remaining > 0 THEN
      irpp_annuel := irpp_annuel + remaining * 0.35;
    END IF;
  END IF;
  irpp := round(irpp_annuel / 12);
  cac  := round(irpp * 0.10);

  -- RAV — barème mensuel sur le brut
  rav := CASE
    WHEN brut <= 50000   THEN 0
    WHEN brut <= 100000  THEN 750
    WHEN brut <= 200000  THEN 1950
    WHEN brut <= 300000  THEN 3250
    WHEN brut <= 400000  THEN 4550
    WHEN brut <= 500000  THEN 5850
    WHEN brut <= 600000  THEN 7150
    WHEN brut <= 700000  THEN 8450
    WHEN brut <= 800000  THEN 9750
    WHEN brut <= 900000  THEN 11050
    WHEN brut <= 1000000 THEN 12350
    ELSE 13000 END;

  -- TDL — barème mensuel sur le salaire de base
  tdl := CASE
    WHEN COALESCE(p_base, 0) <= 62000  THEN 0
    WHEN p_base <= 75000   THEN 250
    WHEN p_base <= 100000  THEN 500
    WHEN p_base <= 125000  THEN 750
    WHEN p_base <= 150000  THEN 1000
    WHEN p_base <= 200000  THEN 1250
    WHEN p_base <= 250000  THEN 1500
    WHEN p_base <= 300000  THEN 2000
    ELSE 2500 END;

  total_ret := pvid + cfc + irpp + cac + rav + tdl + autres;
  RETURN GREATEST(round(brut - total_ret), 0)::int;
END;
$$;

-- 2) RPC d'auto-génération — identique à update_hr_generate_due_payslips_targeted.sql,
--    seul le calcul du net change (appel à hr_compute_cameroon_net).
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
      net := hr_compute_cameroon_net(base_sal, primes, deductions);

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

    UPDATE hr_payment_schedules
    SET last_run_period = GREATEST(COALESCE(last_run_period, ''), run_period)
    WHERE id = sched.id;
  END LOOP;
END;
$$;
