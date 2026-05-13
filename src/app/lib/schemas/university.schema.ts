import { z } from 'zod';

export const universitySchema = z.object({
  id: z.string().uuid(),
  nom: z.string(),
  pays: z.string().nullable().optional(),
  ville: z.string().nullable().optional(),
  programme: z.string().nullable().optional(),
  niveau_etude: z.string().nullable().optional(),
  criteres_admission: z.string().nullable().optional(),
  active: z.boolean().default(true),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
});

export const createUniversitySchema = universitySchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateUniversitySchema = createUniversitySchema.partial();

export type University = z.infer<typeof universitySchema>;
export type CreateUniversity = z.infer<typeof createUniversitySchema>;
export type UpdateUniversity = z.infer<typeof updateUniversitySchema>;
