import { z } from 'zod';

export const paymentConfigTrancheSchema = z.object({
  tranche: z.number(),
  label: z.string(),
  montant: z.number(),
});

export const paymentConfigSchema = z.object({
  id: z.string().uuid().optional(),
  service_type: z.enum([
    'bourse_bachelor',
    'bourse_master',
    'bourse_bachelor_intl',
    'bourse_master_intl',
    'mandarin',
    'anglais',
  ]),
  label: z.string(),
  tranches: z.array(paymentConfigTrancheSchema),
  grace_days: z.number().min(0),
  daily_penalty: z.number().min(0),
  deadline_offset_days: z.number().min(0),
  updated_at: z.string().nullable().optional(),
  updated_by: z.string().uuid().nullable().optional(),
});

export type PaymentConfigTranche = z.infer<typeof paymentConfigTrancheSchema>;
export type PaymentConfig = z.infer<typeof paymentConfigSchema>;
export type ServiceType = PaymentConfig['service_type'];
