-- ================================================================
-- FIX : « Database error creating new user » à l'ajout d'un étudiant
-- ================================================================
-- Symptôme (UI) :
--   « Le compte d'authentification n'a pas pu être créé à cause d'une
--     configuration base de données. »
--   → getCreateUserErrorMessage() mappe l'erreur GoTrue
--     "Database error creating new user".
--
-- Cause :
--   GoTrue renvoie ce message générique dès qu'un trigger AFTER INSERT
--   sur auth.users LÈVE une exception : l'INSERT dans auth.users est
--   alors annulé et le compte n'est pas créé.
--   Deux triggers font le MÊME travail (INSERT INTO public.users) à
--   chaque signup :
--     - on_auth_user_created                 -> handle_new_user()
--     - on_auth_user_created_sync_public_user -> sync_auth_user_to_public_user()
--   N'importe quel écart (colonne manquante, contrainte UNIQUE/NOT NULL,
--   type) dans l'un des deux fait échouer TOUTE la création de compte.
--
-- Correctifs :
--   A. handle_new_user() devient le SEUL gestionnaire d'INSERT et son
--      corps est protégé par EXCEPTION WHEN OTHERS : en cas d'échec on
--      journalise un WARNING et on RETURN NEW — la création du compte
--      Auth n'est JAMAIS bloquée. La route API create-user upsert de
--      toute façon le profil juste après (fiabilité conservée).
--   B. Le trigger de synchro ne se déclenche plus qu'en UPDATE (son rôle
--      réel : garder role / must_change_password cohérents au login).
--      Fini le double-INSERT au signup.
--   C. sync_auth_user_to_public_user() est aussi rendue défensive.
--
-- Idempotent : réexécutable sans effet de bord.
-- ================================================================

-- ── A. Trigger d'INSERT résilient ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_role text;
BEGIN
  -- SÉCURITÉ : le rôle ne se lit QUE depuis raw_app_meta_data (fixé côté
  -- serveur via l'API admin / service role). NE JAMAIS le lire depuis
  -- raw_user_meta_data, que le client contrôle (auth.signUp options.data,
  -- auth.updateUser { data }) → sinon élévation de privilège (role='super_admin').
  -- Tous les flux légitimes (create-user, register, seed) posent app_metadata.role.
  resolved_role := coalesce(
    nullif(new.raw_app_meta_data ->> 'role', ''),
    'student'
  );

  INSERT INTO public.users (
    id, email, username, name, role, telephone,
    password_hash, must_change_password, is_active, created_at, updated_at
  )
  VALUES (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    resolved_role,
    nullif(new.raw_user_meta_data ->> 'telephone', ''),
    'managed_by_supabase_auth',
    coalesce((new.raw_user_meta_data ->> 'must_change_password')::boolean, resolved_role = 'student'),
    coalesce((new.raw_user_meta_data ->> 'is_active')::boolean, true),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email         = excluded.email,
    username      = excluded.username,
    name          = excluded.name,
    role          = excluded.role,
    telephone     = excluded.telephone,
    password_hash = coalesce(public.users.password_hash, excluded.password_hash),
    must_change_password = CASE
      WHEN public.users.must_change_password = false THEN false
      ELSE excluded.must_change_password
    END,
    updated_at    = now();

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Ne JAMAIS bloquer la création du compte Auth : le profil sera (ou a été)
  -- créé par la route API create-user. On trace la vraie cause dans les logs
  -- Postgres pour diagnostic.
  RAISE WARNING '[handle_new_user] profil non inséré pour % (%): %',
    new.id, new.email, SQLERRM;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── B+C. Synchro : UPDATE seulement, et défensive ───────────────────────────
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_public_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id, email, username, name, role,
    password_hash, must_change_password, created_at, updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'contact_email', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    -- SÉCURITÉ : rôle depuis app_metadata (serveur) uniquement, jamais user_metadata.
    COALESCE(NEW.raw_app_meta_data ->> 'role', 'student'),
    'managed_by_supabase_auth',
    COALESCE((NEW.raw_user_meta_data ->> 'must_change_password')::boolean, true),
    COALESCE(NEW.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email    = EXCLUDED.email,
    username = EXCLUDED.username,
    name     = EXCLUDED.name,
    -- SÉCURITÉ : ce trigger tire à CHAQUE login (UPDATE de last_sign_in_at).
    -- Le rôle ne suit QUE app_metadata (serveur) ; sinon un utilisateur pourrait
    -- s'auto-promouvoir via auth.updateUser({ data: { role: 'super_admin' } })
    -- (il contrôle raw_user_meta_data). À défaut, on préserve le rôle en base.
    role     = COALESCE(NULLIF(NEW.raw_app_meta_data ->> 'role', ''), public.users.role),
    must_change_password = CASE
      WHEN public.users.must_change_password = false THEN false
      ELSE EXCLUDED.must_change_password
    END,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[sync_auth_user_to_public_user] synchro échouée pour % : %',
    NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Ne plus tirer au signup (INSERT) : handle_new_user s'en charge.
DROP TRIGGER IF EXISTS on_auth_user_created_sync_public_user ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_public_user
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user_to_public_user();

-- ── Diagnostic (optionnel) ──────────────────────────────────────────────────
-- Après réessai d'ajout d'un étudiant, si le profil n'est pas créé, la vraie
-- cause apparaît dans les logs Postgres (Dashboard > Logs > Postgres) sous
-- « [handle_new_user] profil non inséré ... : <erreur SQL réelle> ».
-- Triggers restants attendus sur auth.users :
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth' AND event_object_table = 'users'
ORDER BY trigger_name;
-- Attendu :
--   on_auth_user_created                  | INSERT | AFTER
--   on_auth_user_created_sync_public_user | UPDATE | AFTER
