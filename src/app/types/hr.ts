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
