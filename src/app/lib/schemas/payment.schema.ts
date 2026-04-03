import { z } from 'zod';

export const paymentSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  montant: z.number(),
  motif: z.string(),
  date: z.date(),
  type: z.enum(['frais_dossier', 'premiere_tranche', 'deuxieme_tranche', 'troisieme_tranche', 'autre']),
  tranche: z.number().default(1),
  status: z.enum(['en_attente', 'valide', 'rejete', 'rembourse']),
  reference: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createPaymentSchema = paymentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updatePaymentSchema = createPaymentSchema.partial();

export const updatePaymentStatusSchema = z.object({
  status: paymentSchema.shape.status,
});

export type Payment = z.infer<typeof paymentSchema>;
export type CreatePayment = z.infer<typeof createPaymentSchema>;
export type UpdatePayment = z.infer<typeof updatePaymentSchema>;
export type UpdatePaymentStatus = z.infer<typeof updatePaymentStatusSchema>;
