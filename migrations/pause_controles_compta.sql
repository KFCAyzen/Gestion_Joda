-- ================================================================
-- COMPTABILITÉ — Mise en pause des contrôles (retour au fonctionnement d'avant)
-- ================================================================
-- À exécuter dans l'éditeur SQL Supabase. Idempotent. Réversible par
-- reprise_controles_compta.sql, à lancer au déploiement du nouveau code.
--
-- Pourquoi : les migrations des phases 1 à 3 sont appliquées mais le code
-- déployé est encore l'ancien. L'ancien livre comptable (web et app admin)
-- ne sait ni joindre un justificatif ni nommer un bénéficiaire ; la base
-- refuse donc de valider ses sorties (et le web affiche quand même « Sortie
-- validée »), et elle refuse aussi la suppression et la modification d'une
-- sortie validée.
--
-- ⚠️ Pendant la pause, la base n'empêche plus l'auto-validation, la
-- validation sans justificatif ni la suppression d'une sortie. Tout reste
-- tracé dans comptabilite_audit.
--
-- Ce script désactive UNIQUEMENT ce qui bloque l'ancien code :
--   1. le trigger de contrôle du circuit des sorties (phase 1) ;
--   2. les droits d'écriture tels qu'ils étaient avant la phase 1
--      (harden_rls_permissions.sql), suppression comprise, rajoutés à côté
--      des nouveaux (les droits s'additionnent : personne n'en perd).
--
-- Ce qui reste actif, sans effet sur l'ancien code :
--   - le journal comptabilite_audit (ancienne ET nouvelle valeur, auteur) ;
--   - les tables des phases 2 et 3 (bons de caisse, arrêtés, clôtures,
--     budgets, grille) : vides et inutilisées par l'ancien code ; leurs
--     contrôles ne s'appliquent que si on les remplit ;
--   - la correction de sécurité du cache du solde (l'ancien code ne
--     l'utilise pas).

-- 1) Circuit des sorties : plus de contrôle en base pendant la pause.
ALTER TABLE public.sorties_comptables DISABLE TRIGGER sorties_comptables_controle_biud;

-- 2) Droits d'avant la phase 1 (noms « legacy » pour les retirer à la reprise).
DROP POLICY IF EXISTS "sorties_legacy_select" ON public.sorties_comptables;
CREATE POLICY "sorties_legacy_select" ON public.sorties_comptables
  FOR SELECT
  USING (
    public.get_auth_user_role() IN ('admin', 'super_admin')
    OR public.has_granted_permission('accounting.view')
  );

DROP POLICY IF EXISTS "sorties_legacy_write" ON public.sorties_comptables;
CREATE POLICY "sorties_legacy_write" ON public.sorties_comptables
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

-- Entrées : les policies RESTRICTIVES de la phase 1 s'appliqueraient
-- par-dessus tout droit rajouté ; on les retire pendant la pause.
DROP POLICY IF EXISTS "entrees_update_restrict" ON public.entrees_comptables;
DROP POLICY IF EXISTS "entrees_delete_restrict" ON public.entrees_comptables;

DROP POLICY IF EXISTS "entrees_legacy_write" ON public.entrees_comptables;
CREATE POLICY "entrees_legacy_write" ON public.entrees_comptables
  FOR ALL
  USING (
    public.get_auth_user_role() IN ('admin', 'super_admin')
    OR public.has_granted_permission('accounting.create')
  )
  WITH CHECK (
    public.get_auth_user_role() IN ('admin', 'super_admin')
    OR public.has_granted_permission('accounting.create')
  );

-- ================================================================
-- Vérification : le trigger de contrôle doit apparaître « désactivé ».
-- ================================================================
SELECT tgname,
       CASE tgenabled WHEN 'D' THEN 'désactivé' ELSE 'actif' END AS etat
FROM pg_trigger
WHERE tgrelid = 'public.sorties_comptables'::regclass AND NOT tgisinternal
ORDER BY tgname;
