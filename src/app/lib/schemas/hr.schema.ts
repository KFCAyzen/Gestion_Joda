import { z } from 'zod';

export const employeeStatusEnum = z.enum(['actif', 'suspendu', 'inactif']);

export const leaveTypeEnum = z.enum([
  'annuel',
  'maladie',
  'maternite',
  'paternite',
  'sans_solde',
  'autre',
]);

export const leaveStatusEnum = z.enum(['en_attente', 'approuve', 'rejete']);

// ─── Employee ──────────────────────────────────────────────────────────────
export const employeeSchema = z.object({
  id: z.string().uuid(),
  matricule: z.string().nullable().optional(),
  nom: z.string().min(1, 'Nom requis'),
  prenom: z.string().min(1, 'Prénom requis'),
  email: z.string().email().nullable().optional().or(z.literal('')),
  telephone: z.string().nullable().optional(),
  poste: z.string().min(1, 'Poste requis'),
  departement: z.string().nullable().optional(),
  date_embauche: z.string().min(1, "Date d'embauche requise"),
  salaire_base: z.number().int().min(0, 'Salaire ≥ 0'),
  statut: employeeStatusEnum.default('actif'),
  user_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createEmployeeSchema = employeeSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

// ─── Leave request ─────────────────────────────────────────────────────────
export const leaveRequestSchema = z.object({
  id: z.string().uuid(),
  employee_id: z.string().uuid(),
  type: leaveTypeEnum,
  date_debut: z.string().min(1, 'Date début requise'),
  date_fin: z.string().min(1, 'Date fin requise'),
  nb_jours: z.number().int().min(1),
  motif: z.string().nullable().optional(),
  statut: leaveStatusEnum.default('en_attente'),
  reviewed_by: z.string().uuid().nullable().optional(),
  reviewed_at: z.string().nullable().optional(),
  reviewer_comment: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createLeaveRequestSchema = leaveRequestSchema.omit({
  id: true,
  reviewed_by: true,
  reviewed_at: true,
  reviewer_comment: true,
  statut: true,
  created_at: true,
  updated_at: true,
});

export const reviewLeaveRequestSchema = z.object({
  statut: z.enum(['approuve', 'rejete']),
  reviewer_comment: z.string().nullable().optional(),
});

// ─── Payslip ───────────────────────────────────────────────────────────────
export const payslipSchema = z.object({
  id: z.string().uuid(),
  employee_id: z.string().uuid(),
  mois: z.number().int().min(1).max(12),
  annee: z.number().int().min(2020).max(2100),
  salaire_base: z.number().int().min(0),
  primes: z.number().int().min(0).default(0),
  deductions: z.number().int().min(0).default(0),
  jours_absences: z.number().int().min(0).default(0),
  net_a_payer: z.number().int().min(0),
  notes: z.string().nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createPayslipSchema = payslipSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updatePayslipSchema = createPayslipSchema.partial();

// ─── Daily report ──────────────────────────────────────────────────────────
export const dailyReportSchema = z.object({
  id: z.string().uuid(),
  employee_id: z.string().uuid(),
  date: z.string(),
  activites: z.string().min(1, 'Activités requises'),
  heures_travaillees: z.number().min(0).max(24).default(8),
  observations: z.string().nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createDailyReportSchema = dailyReportSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateDailyReportSchema = createDailyReportSchema.partial();

export type EmployeeInput = z.infer<typeof createEmployeeSchema>;
export type EmployeeUpdate = z.infer<typeof updateEmployeeSchema>;
export type LeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type LeaveReviewInput = z.infer<typeof reviewLeaveRequestSchema>;
export type PayslipInput = z.infer<typeof createPayslipSchema>;
export type PayslipUpdate = z.infer<typeof updatePayslipSchema>;
export type DailyReportInput = z.infer<typeof createDailyReportSchema>;
export type DailyReportUpdate = z.infer<typeof updateDailyReportSchema>;
