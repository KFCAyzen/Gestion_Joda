import { z } from 'zod';

// "dossier_bourses" table — used as both application & dossier
export const applicationSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  university_id: z.string().uuid().nullable().optional(),
  desired_program: z.string().nullable().optional(),
  study_level: z.string().nullable().optional(),
  language_level: z.string().nullable().optional(),
  scholarship_type: z.string().nullable().optional(),
  status: z.enum([
    'document_recu',
    'en_attente',
    'en_cours',
    'document_manquant',
    'admission_validee',
    'admission_rejetee',
    'en_attente_universite',
    'visa_en_cours',
    'termine',
  ]),
  notes_internes: z.string().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
});

export const createApplicationSchema = applicationSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateApplicationSchema = createApplicationSchema.partial();

export const updateApplicationStatusSchema = z.object({
  status: applicationSchema.shape.status,
});

export type Application = z.infer<typeof applicationSchema>;
export type CreateApplication = z.infer<typeof createApplicationSchema>;
export type UpdateApplication = z.infer<typeof updateApplicationSchema>;
export type UpdateApplicationStatus = z.infer<typeof updateApplicationStatusSchema>;
