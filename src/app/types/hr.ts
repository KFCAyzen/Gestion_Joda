export type EmployeeStatus = 'actif' | 'suspendu' | 'inactif';

export type Sexe = 'M' | 'F' | 'autre';
export type SituationMatrimoniale =
  | 'celibataire'
  | 'marie'
  | 'divorce'
  | 'veuf'
  | 'union_libre';
export type TypePiece = 'cni' | 'passeport' | 'permis' | 'recepisse' | 'autre';
export type TypeContrat =
  | 'cdi'
  | 'cdd'
  | 'stage'
  | 'consultant'
  | 'interim'
  | 'temps_partiel';
export type TypeHoraire = 'temps_plein' | 'temps_partiel' | 'flexible' | 'poste';
export type LanguePreferee =
  | 'francais'
  | 'anglais'
  | 'chinois'
  | 'espagnol'
  | 'arabe'
  | 'autre';

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
  // État civil & identité
  date_naissance: string | null;
  lieu_naissance: string | null;
  sexe: Sexe | null;
  nationalite: string | null;
  langue_preferee: LanguePreferee | null;
  situation_matrimoniale: SituationMatrimoniale | null;
  nombre_enfants: number | null;
  type_piece: TypePiece | null;
  numero_piece: string | null;
  date_expiration_piece: string | null;
  lieu_emission_piece: string | null;
  // Adresse
  adresse: string | null;
  quartier: string | null;
  ville: string | null;
  pays: string | null;
  // Contact d'urgence
  urgence_nom: string | null;
  urgence_lien: string | null;
  urgence_telephone: string | null;
  urgence_email: string | null;
  // Contrat & emploi
  type_contrat: TypeContrat | null;
  date_fin_contrat: string | null;
  periode_essai_mois: number | null;
  superieur_id: string | null;
  type_horaire: TypeHoraire | null;
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
