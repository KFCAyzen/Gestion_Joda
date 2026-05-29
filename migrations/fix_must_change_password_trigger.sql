-- ================================================================
-- FIX: trigger must_change_password bloquait forgot-password & reset
-- ================================================================
-- L'ancienne migration fix_must_change_password_default.sql avait :
--   1) DEFAULT false sur la colonne (laissait les comptes non forcés)
--   2) un trigger qui annulait silencieusement les UPDATE false → true
--
-- Conséquences observées :
--   • forgot-password met must_change_password=true → trigger l'annule
--   • reset-password (admin) idem → l'utilisateur n'est jamais forcé
--
-- Ce script corrige les deux points.
-- ================================================================

-- 1) Supprimer le trigger et sa fonction
DROP TRIGGER IF EXISTS trigger_protect_must_change_password ON public.users;
DROP FUNCTION IF EXISTS protect_must_change_password();

-- 2) Restaurer le DEFAULT à true (cohérent avec le schéma Zod côté code)
ALTER TABLE public.users
  ALTER COLUMN must_change_password SET DEFAULT true;

-- 3) Vérifications
SELECT
  column_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'must_change_password';
-- Attendu : column_default = true

SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_name = 'trigger_protect_must_change_password';
-- Attendu : aucune ligne (trigger supprimé)
