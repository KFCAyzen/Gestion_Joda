-- ================================================================
-- COMPTABILITÉ — Reprise des contrôles (fin de pause_controles_compta.sql)
-- ================================================================
-- À exécuter dans l'éditeur SQL Supabase JUSTE APRÈS le déploiement du
-- nouveau code (web + apps mobiles de la branche feat/compta-tracabilite-sorties).
-- Idempotent.
--
-- Rétablit exactement l'état des phases 1 à 3 :
--   1. trigger de contrôle du circuit des sorties réactivé ;
--   2. droits « legacy » retirés, policies restrictives des entrées remises.
--
-- Sorties saisies pendant la pause : celles restées « en attente » devront
-- être complétées (bénéficiaire + justificatif) avant validation, depuis le
-- Livre comptable ; celles validées restent validées et deviennent
-- verrouillées. Le journal comptabilite_audit dit qui a fait quoi pendant la pause.

-- 1) Circuit des sorties.
ALTER TABLE public.sorties_comptables ENABLE TRIGGER sorties_comptables_controle_biud;

-- 2) Droits : retour à ceux de la phase 1.
DROP POLICY IF EXISTS "sorties_legacy_select" ON public.sorties_comptables;
DROP POLICY IF EXISTS "sorties_legacy_write" ON public.sorties_comptables;
DROP POLICY IF EXISTS "entrees_legacy_write" ON public.entrees_comptables;

DROP POLICY IF EXISTS "entrees_update_restrict" ON public.entrees_comptables;
CREATE POLICY "entrees_update_restrict" ON public.entrees_comptables
  AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING ((SELECT public.compta_has_permission('accounting.edit')))
  WITH CHECK ((SELECT public.compta_has_permission('accounting.edit')));

DROP POLICY IF EXISTS "entrees_delete_restrict" ON public.entrees_comptables;
CREATE POLICY "entrees_delete_restrict" ON public.entrees_comptables
  AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING ((SELECT public.compta_has_permission('accounting.delete')));

-- ================================================================
-- Vérification : le trigger de contrôle doit apparaître « actif ».
-- ================================================================
SELECT tgname,
       CASE tgenabled WHEN 'D' THEN 'désactivé' ELSE 'actif' END AS etat
FROM pg_trigger
WHERE tgrelid = 'public.sorties_comptables'::regclass AND NOT tgisinternal
ORDER BY tgname;
