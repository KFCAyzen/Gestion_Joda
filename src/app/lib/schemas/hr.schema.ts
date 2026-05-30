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
  payment_date: z.string().nullable().optional(),
  auto_generated: z.boolean().default(false),
  schedule_id: z.string().uuid().nullable().optional(),
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

// ─── Deduction rules / occurrences ─────────────────────────────────────────
export const deductionTypeEnum = z.enum([
  'absence_non_justifiee',
  'retard',
  'manquement_personnalise',
]);

export const deductionAmountTypeEnum = z.enum(['fixed', 'percent_base']);

export const deductionRuleSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1, 'Code requis').regex(/^[a-z0-9_]+$/, 'Code en snake_case'),
  label: z.string().min(1, 'Libellé requis'),
  type: deductionTypeEnum,
  amount_type: deductionAmountTypeEnum,
  amount: z.number().min(0, 'Montant ≥ 0'),
  actif: z.boolean().default(true),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createDeductionRuleSchema = deductionRuleSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateDeductionRuleSchema = createDeductionRuleSchema.partial();

export const deductionOccurrenceSchema = z.object({
  id: z.string().uuid(),
  employee_id: z.string().uuid(),
  rule_id: z.string().uuid(),
  date: z.string().min(1, 'Date requise'),
  montant: z.number().int().min(0),
  motif: z.string().nullable().optional(),
  payslip_id: z.string().uuid().nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createDeductionOccurrenceSchema = deductionOccurrenceSchema.omit({
  id: true,
  payslip_id: true,
  created_at: true,
  updated_at: true,
});

export const updateDeductionOccurrenceSchema = createDeductionOccurrenceSchema.partial();

// ─── Payment schedules ─────────────────────────────────────────────────────
export const scheduleScopeEnum = z.enum(['all', 'department', 'employee']);

export const paymentScheduleSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1, 'Libellé requis'),
  scope: scheduleScopeEnum,
  target_department: z.string().nullable().optional(),
  target_employee_id: z.string().uuid().nullable().optional(),
  day_of_month: z.number().int().min(1).max(31),
  actif: z.boolean().default(true),
  last_run_period: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createPaymentScheduleSchema = paymentScheduleSchema
  .omit({ id: true, last_run_period: true, created_at: true, updated_at: true })
  .superRefine((val, ctx) => {
    if (val.scope === 'department' && !val.target_department) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_department'], message: 'Département requis' });
    }
    if (val.scope === 'employee' && !val.target_employee_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_employee_id'], message: 'Employé requis' });
    }
  });

export const updatePaymentScheduleSchema = paymentScheduleSchema
  .omit({ id: true, created_at: true, updated_at: true })
  .partial();

// ─── Employee pay config ───────────────────────────────────────────────────
export const employeePayConfigSchema = z.object({
  id: z.string().uuid(),
  employee_id: z.string().uuid(),
  primes_recurrentes: z.number().int().min(0).default(0),
  salaire_personnalise: z.number().int().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const upsertEmployeePayConfigSchema = employeePayConfigSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type EmployeeInput = z.infer<typeof createEmployeeSchema>;
export type EmployeeUpdate = z.infer<typeof updateEmployeeSchema>;
export type LeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type LeaveReviewInput = z.infer<typeof reviewLeaveRequestSchema>;
export type PayslipInput = z.infer<typeof createPayslipSchema>;
export type PayslipUpdate = z.infer<typeof updatePayslipSchema>;
export type DailyReportInput = z.infer<typeof createDailyReportSchema>;
export type DailyReportUpdate = z.infer<typeof updateDailyReportSchema>;
export type DeductionRuleInput = z.infer<typeof createDeductionRuleSchema>;
export type DeductionRuleUpdate = z.infer<typeof updateDeductionRuleSchema>;
export type DeductionOccurrenceInput = z.infer<typeof createDeductionOccurrenceSchema>;
export type DeductionOccurrenceUpdate = z.infer<typeof updateDeductionOccurrenceSchema>;
export type PaymentScheduleInput = z.infer<typeof createPaymentScheduleSchema>;
export type PaymentScheduleUpdate = z.infer<typeof updatePaymentScheduleSchema>;
export type EmployeePayConfigInput = z.infer<typeof upsertEmployeePayConfigSchema>;
