-- ================================================================
-- FIX DÉFINITIF : must_change_password revient à true pour super_admin
-- ================================================================
-- Causes identifiées :
--   1. raw_user_meta_data (auth.users) contient toujours must_change_password=true
--      après le clear → si le trigger re-fire (INSERT frais, pas de conflit),
--      la valeur est lue depuis le metadata et réécrite à true.
--   2. La clause ON CONFLICT DO UPDATE n'incluait pas must_change_password,
--      donc un éventuel INSERT frais sans conflit passait par le chemin INSERT
--      qui lit le metadata (true).
--
-- Corrections :
--   A. clear-password-flag efface maintenant aussi raw_user_meta_data (côté code).
--   B. Ce script ajoute must_change_password dans la clause ON CONFLICT avec
--      logique CASE : si la valeur en base est false, on la préserve toujours.
--   C. Recrée le trigger en INSERT seulement (sécurité).
--   D. Force must_change_password = false pour tous les non-étudiants existants.
-- ================================================================

-- ── A. Mettre à jour la fonction trigger ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_role text;
BEGIN
  resolved_role := coalesce(
    nullif(new.raw_app_meta_data ->> 'role', ''),
    nullif(new.raw_user_meta_data ->> 'role', ''),
    'student'
  );

  INSERT INTO public.users (
    id,
    email,
    username,
    name,
    role,
    telephone,
    password_hash,
    must_change_password,
    is_active,
    created_at,
    updated_at
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
    email        = excluded.email,
    username     = excluded.username,
    name         = excluded.name,
    role         = excluded.role,
    telephone    = excluded.telephone,
    password_hash = coalesce(public.users.password_hash, excluded.password_hash),
    -- Règle : une fois passé à false, must_change_password ne peut plus
    -- revenir à true via ce trigger (seules les routes reset/forgot-password
    -- ont le droit de le repasser à true explicitement).
    must_change_password = CASE
      WHEN public.users.must_change_password = false THEN false
      ELSE excluded.must_change_password
    END,
    updated_at   = now();

  RETURN new;
END;
$$;

-- ── B. Recréer le trigger en INSERT seulement ───────────────────────────────

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── C. Corriger immédiatement les comptes staff existants ───────────────────

UPDATE public.users
SET
    must_change_password = false,
    updated_at           = now()
WHERE role IN ('super_admin', 'admin', 'supervisor', 'agent')
  AND must_change_password = true;

-- ── D. Vérification ─────────────────────────────────────────────────────────

SELECT
    email,
    role,
    must_change_password,
    updated_at
FROM public.users
WHERE role IN ('super_admin', 'admin', 'supervisor', 'agent')
ORDER BY role DESC, email;
