import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(50),
  name: z.string().nullable().optional(),
  role: z.enum(['super_admin', 'admin', 'agent', 'supervisor', 'user', 'student']),
  avatar: z.string().url().nullable().optional(),
  telephone: z.string().nullable().optional(),
  must_change_password: z.boolean().default(true),
  is_active: z.boolean().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
});

export const createUserSchema = userSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  password: z.string().min(6),
});

export const updateUserSchema = createUserSchema.partial();

export const loginSchema = z.object({
  username: z.string().min(1, 'Le nom d\'utilisateur est requis'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Minimum 3 caractères').max(50),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Minimum 6 caractères'),
  name: z.string().optional(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Ancien mot de passe requis'),
  newPassword: z.string().min(6, 'Minimum 6 caractères'),
});

export type User = z.infer<typeof userSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type Login = z.infer<typeof loginSchema>;
export type Register = z.infer<typeof registerSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
