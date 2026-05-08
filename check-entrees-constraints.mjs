import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkConstraints() {
  console.log('🔍 Vérification des contraintes sur entrees_comptables...\n');

  // Test avec différents types
  const testTypes = ['revenus_divers', 'frais_inscription', 'cours_langue', 'autre'];
  
  for (const type of testTypes) {
    const { data, error } = await supabase
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
      // Supprimer le test
      if (data && data[0]) {
        await supabase.from('entrees_comptables').delete().eq('id', data[0].id);
      }
    }
  }

  console.log('\n💡 Vérifiez la contrainte dans Supabase SQL Editor avec:');
  console.log(`
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'entrees_comptables'::regclass
  AND contype = 'c';
  `);
}

checkConstraints();
