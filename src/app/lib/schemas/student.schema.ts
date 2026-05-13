import { z } from 'zod';

export const studentSchema = z.object({
  id: z.string().uuid(),
  nom: z.string().min(1),
  prenom: z.string().min(1),
  email: z.string().email(),
  telephone: z.string().nullable().optional(),
  age: z.number().min(0).max(120).nullable().optional(),
  sexe: z.enum(['M', 'F']),
  niveau: z.string(),
  filiere: z.string(),
  langue: z.string().default('Anglais'),
  diplome_acquis: z.string().nullable().optional(),
  choix: z.enum(['procedure_seule', 'procedure_cours', 'cours_seuls']).default('procedure_seule'),
  nationalite: z.string().nullable().optional(),
  user_id: z.string().uuid().nullable().optional(),
  created_by: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
});

export const createStudentSchema = studentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateStudentSchema = createStudentSchema.partial();

export type Student = z.infer<typeof studentSchema>;
export type CreateStudent = z.infer<typeof createStudentSchema>;
export type UpdateStudent = z.infer<typeof updateStudentSchema>;
