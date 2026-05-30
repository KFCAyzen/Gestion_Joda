export type EmployeeStatus = 'actif' | 'suspendu' | 'inactif';

export type LeaveType =
  | 'annuel'
  | 'maladie'
  | 'maternite'
  | 'paternite'
  | 'sans_solde'
  | 'autre';

export type LeaveStatus = 'en_attente' | 'approuve' | 'rejete';

export interface Employee {
  id: string;
  matricule: string | null;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  poste: string;
  departement: string | null;
  date_embauche: string;
  salaire_base: number;
  statut: EmployeeStatus;
  user_id: string | null;
  notes: string | null;
  report_pin: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  type: LeaveType;
  date_debut: string;
  date_fin: string;
  nb_jours: number;
  motif: string | null;
  statut: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payslip {
  id: string;
  employee_id: string;
  mois: number;
  annee: number;
  salaire_base: number;
  primes: number;
  deductions: number;
  jours_absences: number;
  net_a_payer: number;
  notes: string | null;
  created_by: string | null;
  payment_date: string | null;
  auto_generated: boolean;
  schedule_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyReport {
  id: string;
  employee_id: string;
  date: string;
  activites: string;
  heures_travaillees: number;
  observations: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Paye / Déductions / Échéancier ────────────────────────────────────────

export type DeductionType =
  | 'absence_non_justifiee'
  | 'retard'
  | 'manquement_personnalise';

export type DeductionAmountType = 'fixed' | 'percent_base';

export interface DeductionRule {
  id: string;
  code: string;
  label: string;
  type: DeductionType;
  amount_type: DeductionAmountType;
  amount: number;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeductionOccurrence {
  id: string;
  employee_id: string;
  rule_id: string;
  date: string;
  montant: number;
  motif: string | null;
  payslip_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ScheduleScope = 'all' | 'department' | 'employee';

export interface PaymentSchedule {
  id: string;
  label: string;
  scope: ScheduleScope;
  target_department: string | null;
  target_employee_id: string | null;
  day_of_month: number;
  actif: boolean;
  last_run_period: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeePayConfig {
  id: string;
  employee_id: string;
  primes_recurrentes: number;
  salaire_personnalise: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
