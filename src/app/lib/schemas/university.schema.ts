import { z } from 'zod';

export const universitySchema = z.object({
  id: z.string().uuid(),
  nom: z.string(),
  code: z.string(),
  location: z.string(),
  category: z.enum(['Elite', 'Tier_1', 'Tier_2', 'Tier_3']),
  applicationFee: z.number(),
  status: z.enum(['Disponible', 'Fermée', 'En_attente']),
  programmes: z.array(z.string()),
  requirements: z.any().optional(),
  active: z.boolean(),
  createdBy: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createUniversitySchema = universitySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUniversitySchema = createUniversitySchema.partial();

export type University = z.infer<typeof universitySchema>;
export type CreateUniversity = z.infer<typeof createUniversitySchema>;
export type UpdateUniversity = z.infer<typeof updateUniversitySchema>;
