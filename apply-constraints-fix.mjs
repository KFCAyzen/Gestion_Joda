import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixConstraints() {
  console.log('🔧 Application des corrections de contraintes...\n');

  try {
    // 1. Tester l'insertion actuelle
    console.log('1️⃣ Test insertion avant correction...');
    const { error: testError } = await supabase
      .from('entrees_comptables')
      .insert({
        montant: 1000,
        date: new Date().toISOString(),
        type: 'paiement_procedure',
        description: 'Test avant correction'
      });

    if (testError) {
      console.log('❌ Erreur (attendue):', testError.message);
      console.log('\n2️⃣ Les contraintes doivent être corrigées dans Supabase SQL Editor');
      console.log('\n📋 Exécutez ce SQL dans Supabase Dashboard > SQL Editor:\n');
      console.log(`
-- Corriger les contraintes CHECK
ALTER TABLE public.entrees_comptables 
  DROP CONSTRAINT IF EXISTS entrees_comptables_type_check;

ALTER TABLE public.entrees_comptables
  ADD CONSTRAINT entrees_comptables_type_check 
  CHECK (type IN ('paiement_procedure', 'paiement_cours', 'revenus_divers'));

ALTER TABLE public.sorties_comptables 
  DROP CONSTRAINT IF EXISTS sorties_comptables_categorie_check;

ALTER TABLE public.sorties_comptables
  ADD CONSTRAINT sorties_comptables_categorie_check 
  CHECK (categorie IN (
    'loyer', 'salaires', 'fonctionnement', 'materiels', 
    'fournitures', 'transports', 'communication', 'partenaires', 'divers'
  ));

-- Vérification
SELECT 'entrees_comptables' as table_name, conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'entrees_comptables'::regclass AND contype = 'c'
UNION ALL
SELECT 'sorties_comptables', conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'sorties_comptables'::regclass AND contype = 'c';
      `);
      
      console.log('\n💡 Après avoir exécuté ce SQL, réessayez d\'ajouter une entrée comptable.');
    } else {
      console.log('✅ Les contraintes sont déjà correctes !');
      console.log('\n3️⃣ Test des différents types...');
      
      const types = ['paiement_procedure', 'paiement_cours', 'revenus_divers'];
      for (const type of types) {
        const { error } = await supabase
          .from('entrees_comptables')
          .insert({
            montant: 1000,
            date: new Date().toISOString(),
            type: type,
            description: `Test ${type}`
          })
          .select();
        
        if (error) {
          console.log(`❌ Type "${type}": ${error.message}`);
        } else {
          console.log(`✅ Type "${type}": OK`);
        }
      }
    }

  } catch (err) {
    console.error('Erreur:', err);
  }
}

fixConstraints();
