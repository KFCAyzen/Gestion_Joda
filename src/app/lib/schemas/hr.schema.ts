import { z } from 'zod';

export const employeeStatusEnum = z.enum(['actif', 'suspendu', 'inactif']);

export const sexeEnum = z.enum(['M', 'F', 'autre']);
export const situationMatrimonialeEnum = z.enum([
  'celibataire',
  'marie',
  'divorce',
  'veuf',
  'union_libre',
]);
export const typePieceEnum = z.enum(['cni', 'passeport', 'permis', 'recepisse', 'autre']);
export const typeContratEnum = z.enum([
  'cdi',
  'cdd',
  'stage',
  'consultant',
  'interim',
  'temps_partiel',
]);
export const typeHoraireEnum = z.enum(['temps_plein', 'temps_partiel', 'flexible', 'poste']);
export const languePrefereeEnum = z.enum([
  'francais',
  'anglais',
  'chinois',
  'espagnol',
  'arabe',
  'autre',
]);

const nullableString = z.string().nullable().optional().or(z.literal(''));
const nullableDate = z.string().nullable().optional().or(z.literal(''));

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
  // État civil & identité
  date_naissance: nullableDate,
  lieu_naissance: nullableString,
  sexe: sexeEnum.nullable().optional(),
  nationalite: nullableString,
  langue_preferee: languePrefereeEnum.nullable().optional(),
  situation_matrimoniale: situationMatrimonialeEnum.nullable().optional(),
  nombre_enfants: z.number().int().min(0).nullable().optional(),
  type_piece: typePieceEnum.nullable().optional(),
  numero_piece: nullableString,
  date_expiration_piece: nullableDate,
  lieu_emission_piece: nullableString,
  // Adresse
  adresse: nullableString,
  quartier: nullableString,
  ville: nullableString,
  pays: nullableString,
  // Contact d'urgence
  urgence_nom: nullableString,
  urgence_lien: nullableString,
  urgence_telephone: nullableString,
  urgence_email: z.string().email().nullable().optional().or(z.literal('')),
  // Contrat & emploi
  type_contrat: typeContratEnum.nullable().optional(),
  date_fin_contrat: nullableDate,
  periode_essai_mois: z.number().int().min(0).nullable().optional(),
  superieur_id: z.string().uuid().nullable().optional(),
  type_horaire: typeHoraireEnum.nullable().optional(),
  // Identifiant social (paie)
  numero_cnps: nullableString,
  numero_compte_bancaire: nullableString,
  // Suivi d'appels (call center) — désignation manuelle par l'admin
  suivi_appels: z.boolean().optional(),
  quota_appels: z.boolean().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createEmployeeSchema = employeeSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
  })
  .superRefine((val, ctx) => {
    if (val.type_contrat === 'cdd' && !val.date_fin_contrat) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_fin_contrat'],
        message: 'Date de fin requise pour un CDD',
      });
    }
  });

export const updateEmployeeSchema = employeeSchema
  .omit({ id: true, created_at: true, updated_at: true })
  .partial();

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
export const payslipAdjustmentSchema = z.object({
  type: z.enum(['bonus', 'deduction']),
  motif: z.string().trim().max(200).default(''),
  montant: z.number().int().min(0).default(0),
});

export const payslipSchema = z.object({
  id: z.string().uuid(),
  employee_id: z.string().uuid(),
  mois: z.number().int().min(1).max(12),
  annee: z.number().int().min(2020).max(2100),
  salaire_base: z.number().int().min(0),
  primes: z.number().int().min(0).default(0),
  deductions: z.number().int().min(0).default(0),
  adjustments: z.array(payslipAdjustmentSchema).default([]),
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
  // Compteurs d'appels (postes prospection / relation client) — entiers >= 0
  // Optionnels : non renseignés, la DB applique le défaut 0.
  nb_appels: z.number().int().min(0).optional(),
  nb_rdv_confirmes: z.number().int().min(0).optional(),
  nb_relances: z.number().int().min(0).optional(),
  nb_indisponibles: z.number().int().min(0).optional(),
  nb_rejets: z.number().int().min(0).optional(),
  nb_autres: z.number().int().min(0).optional(),
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

// ─── Employee evaluation ─────────────────────────────────────────────────────
const noteCritere = z.number().int().min(1, 'Note 1 à 5').max(5, 'Note 1 à 5');

export const employeeEvaluationSchema = z.object({
  id: z.string().uuid(),
  employee_id: z.string().uuid(),
  date_evaluation: z.string().min(1, 'Date requise'),
  periode: z.string().nullable().optional(),
  note_qualite: noteCritere,
  note_productivite: noteCritere,
  note_ponctualite: noteCritere,
  note_equipe: noteCritere,
  note_communication: noteCritere,
  note_initiative: noteCritere,
  note_discipline: noteCritere,
  note_globale: z.number().min(0).max(5),
  points_forts: z.string().nullable().optional(),
  axes_amelioration: z.string().nullable().optional(),
  commentaire: z.string().nullable().optional(),
  evaluateur_id: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createEmployeeEvaluationSchema = employeeEvaluationSchema.omit({
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
export type PayslipAdjustmentInput = z.infer<typeof payslipAdjustmentSchema>;
export type DailyReportInput = z.infer<typeof createDailyReportSchema>;
export type DailyReportUpdate = z.infer<typeof updateDailyReportSchema>;
export type DeductionRuleInput = z.infer<typeof createDeductionRuleSchema>;
export type DeductionRuleUpdate = z.infer<typeof updateDeductionRuleSchema>;
export type DeductionOccurrenceInput = z.infer<typeof createDeductionOccurrenceSchema>;
export type DeductionOccurrenceUpdate = z.infer<typeof updateDeductionOccurrenceSchema>;
export type PaymentScheduleInput = z.infer<typeof createPaymentScheduleSchema>;
export type PaymentScheduleUpdate = z.infer<typeof updatePaymentScheduleSchema>;
export type EmployeePayConfigInput = z.infer<typeof upsertEmployeePayConfigSchema>;
export type EmployeeEvaluationInput = z.infer<typeof createEmployeeEvaluationSchema>;
