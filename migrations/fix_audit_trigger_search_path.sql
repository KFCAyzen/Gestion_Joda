-- Suppression d'un compte impossible — « Database error deleting user »
-- ----------------------------------------------------------------------------
-- Cause (logs Auth Supabase, 2026-10-29 01:21 UTC) :
--   ERROR: relation "audit_logs" does not exist (SQLSTATE 42P01)
--
-- audit_trigger_func() (posé sur public.users, user_permissions, students,
-- payments, entrees/sorties…) écrit dans « audit_logs » et lit « users » SANS
-- préfixe de schéma ni search_path fixé. Supabase Auth (GoTrue) se connecte
-- avec search_path = auth : quand il supprime auth.users, la cascade vers
-- public.users déclenche ce trigger, qui cherche auth.audit_logs → introuvable
-- → toute la suppression est annulée. Via PostgREST (search_path = public) la
-- même cascade passe, d'où une panne qui ne touchait que la suppression Auth.
--
-- Correctif : noms qualifiés + search_path figé (bonne pratique de toute
-- fonction SECURITY DEFINER). Corps identique par ailleurs. Idempotent.

CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_data RECORD;
BEGIN
  -- Récupérer les infos utilisateur
  SELECT id, email, role INTO user_data
  FROM public.users
  WHERE id = auth.uid();

  INSERT INTO public.audit_logs (
    table_name,
    operation,
    record_id,
    old_data,
    new_data,
    user_id,
    user_email,
    user_role
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    user_data.id,
    user_data.email,
    user_data.role
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Vérification : les fonctions de trigger du schéma public sans search_path
-- figé sont exposées au même piège quand une cascade Auth les déclenche
-- (à corriger seulement si elles utilisent des noms non qualifiés).
SELECT p.proname AS fonction_sans_search_path
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.prorettype = 'trigger'::regtype
   AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')
 ORDER BY 1;
