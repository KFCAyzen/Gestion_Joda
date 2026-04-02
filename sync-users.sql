-- Synchroniser les utilisateurs de auth.users vers public.users
-- Avec gestion des conflits

-- Insérer ou mettre à jour les utilisateurs
INSERT INTO users (id, email, username, name, role, password_hash, must_change_password, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'role', 'student'),
  'managed_by_supabase_auth',
  true,
  au.created_at,
  au.updated_at
FROM auth.users au
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = COALESCE(EXCLUDED.name, users.name),
  role = COALESCE(EXCLUDED.role, users.role);