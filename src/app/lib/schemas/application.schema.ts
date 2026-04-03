import { z } from 'zod';

export const applicationSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  universityId: z.string().uuid(),
  desiredProgram: z.string().optional(),
  studyLevel: z.string().default('Licence'),
  languageLevel: z.string().default('HSK 3'),
  scholarshipType: z.string().default('Complète'),
  status: z.enum([
    'document_recu',
    'en_attente',
    'en_cours',
    'document_manquant',
    'admission_validee',
    'admission_rejetee',
    'termine'
  ]),
  notes: z.string().optional(),
  submittedAt: z.date(),
  updatedAt: z.date(),
});

export const createApplicationSchema = applicationSchema.omit({
  id: true,
  submittedAt: true,
  updatedAt: true,
});

export const updateApplicationSchema = createApplicationSchema.partial();

export const updateApplicationStatusSchema = z.object({
  status: applicationSchema.shape.status,
});

export type Application = z.infer<typeof applicationSchema>;
export type CreateApplication = z.infer<typeof createApplicationSchema>;
export type UpdateApplication = z.infer<typeof updateApplicationSchema>;
export type UpdateApplicationStatus = z.infer<typeof updateApplicationStatusSchema>;
