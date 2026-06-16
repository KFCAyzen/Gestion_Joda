-- ================================================================
-- FIX RACINE : must_change_password remis à true à CHAQUE login
-- ================================================================
-- Cause réelle (différente de fix_must_change_password_final.sql) :
--   Un SECOND trigger sur auth.users, ignoré jusqu'ici :
--     on_auth_user_created_sync_public_user
--       AFTER INSERT OR UPDATE ON auth.users
--       EXECUTE FUNCTION public.sync_auth_user_to_public_user()
--   Comme il se déclenche aussi sur UPDATE, il re-tire à chaque login
--   (Supabase met à jour last_sign_in_at), et sa clause ON CONFLICT faisait :
--       must_change_password = EXCLUDED.must_change_password
--   = COALESCE((raw_user_meta_data->>'must_change_password')::boolean, true)
--   => le flag remontait à true à chaque connexion, écrasant tout clear.
--
-- Correctif : règle CASE — une fois le flag à false en base, cette synchro
-- ne peut plus le repasser à true (seules les routes reset/forgot, qui
-- écrivent directement la table, ont ce droit).
--
--   Correctif 2 (risque connexe) : la même fonction faisait
--       role = EXCLUDED.role = COALESCE(metadata->>'role', 'student')
--   => à chaque login, un compte staff SANS rôle dans ses métadonnées était
--   rétrogradé en 'student'. On préserve désormais le rôle existant en base
--   quand les métadonnées ne fournissent pas de rôle explicite.
-- ================================================================

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_public_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    username,
    name,
    role,
    password_hash,
    must_change_password,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'contact_email', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    'managed_by_supabase_auth',
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, true),
    COALESCE(NEW.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email    = EXCLUDED.email,
    username = EXCLUDED.username,
    name     = EXCLUDED.name,
    -- Préserve le rôle existant en base si les métadonnées n'en fournissent
    -- pas d'explicite (évite la rétrogradation staff -> student à chaque login).
    role     = COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), public.users.role),
    -- Une fois passé à false, le flag ne peut plus revenir à true via cette
    -- synchro qui re-tire à chaque login (UPDATE de last_sign_in_at).
    must_change_password = CASE
      WHEN public.users.must_change_password = false THEN false
      ELSE EXCLUDED.must_change_password
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$function$;

-- Vérification : après ce fix, un login ne doit plus jamais repasser le flag à true.
-- Optionnel — repasser à false les comptes encore bloqués par erreur (métadonnées) :
-- UPDATE public.users SET must_change_password = false, updated_at = now()
-- WHERE role <> 'student' AND must_change_password = true;
