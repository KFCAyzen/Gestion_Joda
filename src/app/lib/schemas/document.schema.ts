import { z } from 'zod';

export const documentSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  type: z.string(),
  name: z.string(),
  url: z.string().url().optional(),
  status: z.enum(['en_attente', 'valide', 'rejete']),
  uploadedAt: z.date(),
  updatedAt: z.date(),
});

export const createDocumentSchema = documentSchema.omit({
  id: true,
  uploadedAt: true,
  updatedAt: true,
});

export const updateDocumentSchema = createDocumentSchema.partial();

export type Document = z.infer<typeof documentSchema>;
export type CreateDocument = z.infer<typeof createDocumentSchema>;
export type UpdateDocument = z.infer<typeof updateDocumentSchema>;
