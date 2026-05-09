-- ================================================================
-- Ajout du champ initiated_by_student à la table payments
-- Permet de distinguer les paiements déclarés par l'étudiant
-- À exécuter dans Supabase SQL Editor
-- ================================================================

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS initiated_by_student boolean DEFAULT false;

-- Vérification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payments'
  AND column_name = 'initiated_by_student';
