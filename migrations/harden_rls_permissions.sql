-- ================================================================
-- HARDEN RLS — combler les trous serveur des permissions
-- ================================================================
-- À exécuter dans l'éditeur SQL Supabase APRÈS relecture.
-- Idempotent (DROP POLICY IF EXISTS + CREATE).
--
-- Contexte : les vérifications de permissions de l'app sont côté CLIENT
-- (hook usePermissions / ProtectedRoute). La RLS est la seule vraie barrière.
-- Cette migration corrige deux écarts :
--   1) `dossier_bourses` (candidatures + dossiers) n'avait AUCUNE RLS
--      → n'importe quel compte authentifié (même étudiant) pouvait tout
--        lire/écrire via l'API. On active une RLS basée sur le rôle.
--   2) La comptabilité était réservée admin/super_admin au niveau RLS.
--      Pour que le « comptable » (un compte à qui on accorde accounting.view
--      dans la gestion des permissions) ait réellement accès aux données,
--      les policies consultent désormais aussi user_permissions.
--
-- ⚠️ Limite assumée : Candidatures et Dossiers partagent la table
--    `dossier_bourses`. La règle « Candidatures réservées au super_admin »
--    reste donc une distinction d'INTERFACE uniquement — au niveau données,
--    le personnel (agent/superviseur/admin/SA) garde l'accès car le module
--    Dossiers en a besoin. Une vraie séparation exigerait de scinder la table.
--
-- Pré-requis : la fonction public.get_auth_user_role() (cf. FIX_RLS_RECURSION_v5)
-- doit exister. On la (re)crée ici par sécurité.

-- ----------------------------------------------------------------
-- Helper rôle (lecture JWT, aucune requête → pas de récursion RLS)
-- ----------------------------------------------------------------
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
-- Helper : surcharge de permission explicite et ACCORDÉE pour l'appelant.
-- SECURITY DEFINER → peut lire user_permissions sans dépendre de sa RLS.
-- (Ne gère QUE les accords explicites ; les défauts de rôle restent portés
--  par les vérifications de rôle dans chaque policy.)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_granted_permission(p_perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = auth.uid()
      AND permission = p_perm
      AND granted = true
  );
$$;

-- ================================================================
-- 1) dossier_bourses — activer la RLS (table auparavant non protégée)
-- ================================================================
ALTER TABLE public.dossier_bourses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dossier_bourses_staff_all"      ON public.dossier_bourses;
DROP POLICY IF EXISTS "dossier_bourses_student_select" ON public.dossier_bourses;

-- Personnel : accès complet (le module Dossiers en dépend).
CREATE POLICY "dossier_bourses_staff_all" ON public.dossier_bourses
  FOR ALL
  USING (public.get_auth_user_role() IN ('agent', 'supervisor', 'admin', 'super_admin'))
  WITH CHECK (public.get_auth_user_role() IN ('agent', 'supervisor', 'admin', 'super_admin'));

-- Étudiant : lecture de son propre dossier uniquement.
CREATE POLICY "dossier_bourses_student_select" ON public.dossier_bourses
  FOR SELECT
  USING (
    student_id IN (SELECT id FROM public.students WHERE created_by = auth.uid())
  );

-- ================================================================
-- 2) Comptabilité — admin/super_admin OU comptable explicitement autorisé
-- ================================================================

-- entrees_comptables
DROP POLICY IF EXISTS "entrees_admin_select" ON public.entrees_comptables;
DROP POLICY IF EXISTS "entrees_admin_all"    ON public.entrees_comptables;

CREATE POLICY "entrees_accounting_select" ON public.entrees_comptables
  FOR SELECT
  USING (
    public.get_auth_user_role() IN ('admin', 'super_admin')
    OR public.has_granted_permission('accounting.view')
  );

CREATE POLICY "entrees_accounting_write" ON public.entrees_comptables
  FOR ALL
  USING (
    public.get_auth_user_role() IN ('admin', 'super_admin')
    OR public.has_granted_permission('accounting.create')
  )
  WITH CHECK (
    public.get_auth_user_role() IN ('admin', 'super_admin')
    OR public.has_granted_permission('accounting.create')
  );

-- sorties_comptables
DROP POLICY IF EXISTS "sorties_admin_select" ON public.sorties_comptables;
DROP POLICY IF EXISTS "sorties_admin_all"    ON public.sorties_comptables;

CREATE POLICY "sorties_accounting_select" ON public.sorties_comptables
  FOR SELECT
  USING (
    public.get_auth_user_role() IN ('admin', 'super_admin')
    OR public.has_granted_permission('accounting.view')
  );

-- Écriture/validation : create pour créer, validate pour valider une sortie.
CREATE POLICY "sorties_accounting_write" ON public.sorties_comptables
  FOR ALL
  USING (
    public.get_auth_user_role() IN ('admin', 'super_admin')
    OR public.has_granted_permission('accounting.create')
    OR public.has_granted_permission('accounting.validate')
  )
  WITH CHECK (
    public.get_auth_user_role() IN ('admin', 'super_admin')
    OR public.has_granted_permission('accounting.create')
    OR public.has_granted_permission('accounting.validate')
  );

-- ----------------------------------------------------------------
-- Vérification
-- ----------------------------------------------------------------
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('dossier_bourses', 'entrees_comptables', 'sorties_comptables')
ORDER BY tablename, policyname;
