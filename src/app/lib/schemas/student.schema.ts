import { z } from 'zod';

export const studentSchema = z.object({
  id: z.string().uuid(),
  nom: z.string().min(1),
  prenom: z.string().min(1),
  email: z.string().email(),
  telephone: z.string().optional(),
  age: z.number().min(15).max(100).optional(),
  sexe: z.enum(['M', 'F']),
  niveau: z.string(),
  filiere: z.string(),
  langue: z.string().default('Anglais'),
  diplome_acquis: z.string().optional(),
  choix: z.enum(['procedure_seule', 'procedure_cours', 'cours_seuls']).default('procedure_seule'),
  userId: z.string().uuid().optional(),
  createdBy: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createStudentSchema = studentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateStudentSchema = createStudentSchema.partial();

export type Student = z.infer<typeof studentSchema>;
export type CreateStudent = z.infer<typeof createStudentSchema>;
export type UpdateStudent = z.infer<typeof updateStudentSchema>;
