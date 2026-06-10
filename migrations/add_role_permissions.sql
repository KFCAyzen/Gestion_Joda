-- ================================================================
-- ROLE PERMISSIONS — permissions par défaut éditables par rôle
-- ================================================================
-- À exécuter dans l'éditeur SQL Supabase APRÈS relecture.
-- Idempotent (IF NOT EXISTS + DROP POLICY IF EXISTS).
--
-- Contexte : jusqu'ici les permissions par défaut de chaque rôle étaient
-- codées en dur dans src/app/types/permissions.ts (DEFAULT_ROLE_PERMISSIONS).
-- Cette table permet de les MODIFIER au niveau du rôle (effet sur TOUS les
-- comptes de ce rôle), tout en gardant le code comme repli (hors-ligne /
-- table absente).
--
-- Résolution effective d'une permission pour un utilisateur :
--   1) surcharge explicite dans user_permissions (granted true/false) — prioritaire
--   2) sinon, set du rôle dans role_permissions SI le rôle y est « configuré »
--      (au moins une ligne) — granted = la ligne correspondante
--   3) sinon, repli sur DEFAULT_ROLE_PERMISSIONS (code)
--   → super_admin garde TOUJOURS tout (verrou anti-lockout, forcé côté client).
--
-- La table n'est PAS pré-remplie : un rôle non « configuré » suit les défauts du
-- code. Le premier passage en édition « matérialise » le set courant du rôle
-- (toutes les permissions avec granted = défaut), puis applique la modification.

-- Pré-requis : public.get_auth_user_role() (cf. FIX_RLS_RECURSION_v5). (Re)créée
-- ici par sécurité — lit le rôle depuis le JWT, sans requête (pas de récursion).
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata'  ->> 'role', ''),
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'role', '')
  )
$$;

-- ----------------------------------------------------------------
-- Table
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role        TEXT        NOT NULL,
  permission  TEXT        NOT NULL,
  granted     BOOLEAN     NOT NULL DEFAULT false,
  updated_by  UUID,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role, permission)
);

-- ----------------------------------------------------------------
-- RLS : lecture pour tout compte authentifié (chacun doit pouvoir
-- résoudre les permissions de son rôle) ; écriture admin/super_admin.
-- ----------------------------------------------------------------
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_permissions_select" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_write"  ON public.role_permissions;

CREATE POLICY "role_permissions_select" ON public.role_permissions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "role_permissions_write" ON public.role_permissions
  FOR ALL
  USING (public.get_auth_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.get_auth_user_role() IN ('admin', 'super_admin'));

-- ----------------------------------------------------------------
-- Vérification
-- ----------------------------------------------------------------
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'role_permissions'
ORDER BY policyname;
