-- ================================================================
-- FIX one-shot : passer must_change_password = false pour le super_admin
-- ================================================================
-- Symptôme observé : la colonne must_change_password repasse à TRUE
-- à chaque refresh pour le compte super_admin, ce qui re-affiche le
-- modal bloquant de changement de mot de passe.
--
-- Causes possibles (aucune n'est triviale à diagnostiquer sans accès
-- direct à la DB — voir le script diagnostic_must_change_password.sql
-- joint pour identifier la source) :
--   • un trigger résiduel qui réécrit la valeur sur UPDATE
--   • la valeur par défaut de la colonne (TRUE) ré-appliquée par un
--     ON CONFLICT/UPSERT qui omet le champ
--   • une fonction trigger personnalisée Supabase
--
-- Ce script :
--   1. Force must_change_password = false pour TOUS les comptes
--      admin / super_admin / supervisor / agent (jamais étudiant).
--   2. Vérifie le résultat immédiatement après.
--
-- Si après refresh la valeur repasse à TRUE :
--   → lance migrations/diagnostic_must_change_password.sql et
--     remonte la sortie.
-- ================================================================

BEGIN;

UPDATE public.users
SET
    must_change_password = false,
    updated_at = now()
WHERE role IN ('super_admin', 'admin', 'supervisor', 'agent');

-- Vérification immédiate
SELECT
    email,
    role,
    must_change_password,
    updated_at
FROM public.users
WHERE role IN ('super_admin', 'admin', 'supervisor', 'agent')
ORDER BY role DESC, email;

COMMIT;
