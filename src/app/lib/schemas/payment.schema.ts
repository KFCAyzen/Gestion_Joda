import { z } from 'zod';

export const paymentSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  montant: z.number(),
  type: z.enum(['bourse', 'mandarin', 'anglais', 'inscription', 'autre']),
  tranche: z.number().nullable().optional(),
  status: z.enum(['attente', 'en_validation', 'paye', 'retard', 'annule']),
  date_limite: z.string().nullable().optional(),
  date_paiement: z.string().nullable().optional(),
  penalites: z.number().default(0),
  penalites_annulee: z.boolean().nullable().optional(),
  validated_by: z.string().uuid().nullable().optional(),
  validated_at: z.string().nullable().optional(),
  facture_url: z.string().nullable().optional(),
  recu_url: z.string().nullable().optional(),
  initiated_by_student: z.boolean().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
});

export const createPaymentSchema = paymentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updatePaymentSchema = createPaymentSchema.partial();

export const updatePaymentStatusSchema = z.object({
  status: paymentSchema.shape.status,
});

export type Payment = z.infer<typeof paymentSchema>;
export type CreatePayment = z.infer<typeof createPaymentSchema>;
export type UpdatePayment = z.infer<typeof updatePaymentSchema>;
export type UpdatePaymentStatus = z.infer<typeof updatePaymentStatusSchema>;
