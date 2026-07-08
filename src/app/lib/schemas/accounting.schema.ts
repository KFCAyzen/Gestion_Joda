import { z } from 'zod';

export const deviseSchema = z.enum(['FCFA', 'USD']);
export type Devise = z.infer<typeof deviseSchema>;

export const entreeComptableSchema = z.object({
  id: z.string().uuid(),
  montant: z.number(),
  date: z.string(),
  type: z.string(),
  description: z.string(),
  devise: deviseSchema.default('FCFA'),
  student_id: z.string().uuid().nullable().optional(),
  payment_id: z.string().uuid().nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.string(),
});

export const sortieComptableSchema = z.object({
  id: z.string().uuid(),
  montant: z.number(),
  date: z.string(),
  categorie: z.string(),
  description: z.string(),
  devise: deviseSchema.default('FCFA'),
  justificatif_url: z.string().nullable().optional(),
  validated_by: z.string().uuid().nullable().optional(),
  validated_at: z.string().nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.string(),
});

export const budgetSchema = z.object({
  id: z.string().uuid(),
  categorie: z.string(),
  montant_prevu: z.number(),
  periode: z.enum(['mensuel', 'trimestriel', 'annuel']),
  created_at: z.string(),
});

export const customCategorySchema = z.object({
  id: z.string().uuid(),
  nom: z.string().min(1),
  type: z.enum(['entree', 'sortie']),
  created_at: z.string(),
});

export const createEntreeComptableSchema = entreeComptableSchema.omit({
  id: true,
  created_at: true,
});

export const createSortieComptableSchema = sortieComptableSchema.omit({
  id: true,
  created_at: true,
});

export type EntreeComptable = z.infer<typeof entreeComptableSchema>;
export type SortieComptable = z.infer<typeof sortieComptableSchema>;
export type Budget = z.infer<typeof budgetSchema>;
export type CustomCategory = z.infer<typeof customCategorySchema>;
export type CreateEntreeComptable = z.infer<typeof createEntreeComptableSchema>;
export type CreateSortieComptable = z.infer<typeof createSortieComptableSchema>;
