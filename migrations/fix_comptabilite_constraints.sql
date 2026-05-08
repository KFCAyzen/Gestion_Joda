-- ================================================================
-- FIX: Contraintes CHECK sur tables comptables
-- ================================================================
-- Cette migration corrige les contraintes CHECK pour accepter tous les types
-- utilisés dans l'application AccountingPage.tsx
-- ================================================================

-- ----------------------------------------------------------------
-- 1. ENTREES COMPTABLES
-- ----------------------------------------------------------------

-- Supprimer l'ancienne contrainte
ALTER TABLE public.entrees_comptables 
  DROP CONSTRAINT IF EXISTS entrees_comptables_type_check;

-- Créer la nouvelle contrainte avec les types corrects
ALTER TABLE public.entrees_comptables
  ADD CONSTRAINT entrees_comptables_type_check 
  CHECK (type IN ('paiement_procedure', 'paiement_cours', 'revenus_divers'));

-- ----------------------------------------------------------------
-- 2. SORTIES COMPTABLES
-- ----------------------------------------------------------------

-- Supprimer l'ancienne contrainte
ALTER TABLE public.sorties_comptables 
  DROP CONSTRAINT IF EXISTS sorties_comptables_categorie_check;

-- Créer la nouvelle contrainte avec les catégories correctes
ALTER TABLE public.sorties_comptables
  ADD CONSTRAINT sorties_comptables_categorie_check 
  CHECK (categorie IN (
    'loyer',
    'salaires',
    'fonctionnement',
    'materiels',
    'fournitures',
    'transports',
    'communication',
    'partenaires',
    'divers'
  ));

-- ----------------------------------------------------------------
-- 3. VÉRIFICATION
-- ----------------------------------------------------------------

SELECT 
  'entrees_comptables' as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'entrees_comptables'::regclass
  AND contype = 'c'
  AND conname = 'entrees_comptables_type_check'

UNION ALL

SELECT 
  'sorties_comptables' as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'sorties_comptables'::regclass
  AND contype = 'c'
  AND conname = 'sorties_comptables_categorie_check';

-- ----------------------------------------------------------------
-- 4. TEST (sera rollback automatiquement)
-- ----------------------------------------------------------------

DO $$
BEGIN
  -- Test entrees_comptables
  INSERT INTO public.entrees_comptables (montant, date, type, description)
  VALUES (1000, NOW(), 'paiement_procedure', 'Test entrée 1');
  
  INSERT INTO public.entrees_comptables (montant, date, type, description)
  VALUES (1000, NOW(), 'paiement_cours', 'Test entrée 2');
  
  INSERT INTO public.entrees_comptables (montant, date, type, description)
  VALUES (1000, NOW(), 'revenus_divers', 'Test entrée 3');
  
  -- Test sorties_comptables
  INSERT INTO public.sorties_comptables (montant, date, categorie, description)
  VALUES (1000, NOW(), 'loyer', 'Test sortie 1');
  
  INSERT INTO public.sorties_comptables (montant, date, categorie, description)
  VALUES (1000, NOW(), 'salaires', 'Test sortie 2');
  
  INSERT INTO public.sorties_comptables (montant, date, categorie, description)
  VALUES (1000, NOW(), 'divers', 'Test sortie 3');
  
  RAISE NOTICE '✅ Tous les types et catégories sont valides';
  
  -- Rollback des tests
  RAISE EXCEPTION 'Rollback des tests' USING ERRCODE = '00000';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM != 'Rollback des tests' THEN
      RAISE NOTICE '❌ Erreur: %', SQLERRM;
    END IF;
END $$;
