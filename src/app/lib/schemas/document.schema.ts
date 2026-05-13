import { z } from 'zod';

export const documentSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  type: z.string(),
  url: z.string().nullable().optional(),
  status: z.enum(['en_attente', 'valide', 'non_conforme']),
  uploaded_by: z.string().uuid().nullable().optional(),
  validated_by: z.string().uuid().nullable().optional(),
  validated_at: z.string().nullable().optional(),
  rejection_reason: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
});

export const createDocumentSchema = documentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateDocumentSchema = createDocumentSchema.partial();

export type Document = z.infer<typeof documentSchema>;
export type CreateDocument = z.infer<typeof createDocumentSchema>;
export type UpdateDocument = z.infer<typeof updateDocumentSchema>;
