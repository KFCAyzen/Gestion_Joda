import { z } from 'zod';

export const notificationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.enum([
    'document_manquant',
    'paiement_valide',
    'retard_paiement',
    'mise_a_jour_dossier',
    'message_recu',
    'info',
  ]),
  titre: z.string(),
  message: z.string(),
  read: z.boolean().default(false),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  created_at: z.string(),
});

export const createNotificationSchema = notificationSchema.omit({
  id: true,
  created_at: true,
});

export type Notification = z.infer<typeof notificationSchema>;
export type CreateNotification = z.infer<typeof createNotificationSchema>;
