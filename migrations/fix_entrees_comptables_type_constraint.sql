-- ================================================================
-- FIX: Contrainte CHECK sur entrees_comptables.type
-- ================================================================
-- Cette migration corrige la contrainte CHECK pour accepter tous les types
-- utilisés dans l'application
-- ================================================================

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE public.entrees_comptables 
  DROP CONSTRAINT IF EXISTS entrees_comptables_type_check;

-- 2. Créer la nouvelle contrainte avec les bons types
ALTER TABLE public.entrees_comptables
  ADD CONSTRAINT entrees_comptables_type_check 
  CHECK (type IN ('paiement_procedure', 'paiement_cours', 'revenus_divers'));

-- 3. Vérification
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'entrees_comptables'::regclass
  AND contype = 'c'
  AND conname = 'entrees_comptables_type_check';

-- 4. Test d'insertion (sera rollback automatiquement)
DO $$
BEGIN
  -- Test avec chaque type valide
  INSERT INTO public.entrees_comptables (montant, date, type, description)
  VALUES (1000, NOW(), 'paiement_procedure', 'Test 1');
  
  INSERT INTO public.entrees_comptables (montant, date, type, description)
  VALUES (1000, NOW(), 'paiement_cours', 'Test 2');
  
  INSERT INTO public.entrees_comptables (montant, date, type, description)
  VALUES (1000, NOW(), 'revenus_divers', 'Test 3');
  
  RAISE NOTICE 'Tous les types sont valides ✅';
  
  -- Rollback des tests
  RAISE EXCEPTION 'Rollback des tests' USING ERRCODE = '00000';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM != 'Rollback des tests' THEN
      RAISE NOTICE 'Erreur: %', SQLERRM;
    END IF;
END $$;
