import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTriggers() {
  console.log('🔍 Vérification des triggers sur la table users...\n');
  
  // Requête pour lister les triggers
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        trigger_name,
        event_manipulation,
        action_statement,
        action_timing
      FROM information_schema.triggers
      WHERE event_object_table = 'users'
      ORDER BY trigger_name;
    `
  });

  if (error) {
    console.log('❌ Impossible de vérifier les triggers (permission insuffisante)');
    console.log('Erreur:', error.message);
    console.log('\n💡 Vérifiez manuellement dans Supabase SQL Editor avec:');
    console.log(`
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
ORDER BY trigger_name;
    `);
  } else if (data && data.length > 0) {
    console.log('📋 Triggers trouvés:');
    data.forEach(t => {
      console.log(`\n  Nom: ${t.trigger_name}`);
      console.log(`  Événement: ${t.event_manipulation}`);
      console.log(`  Timing: ${t.action_timing}`);
      console.log(`  Action: ${t.action_statement}`);
    });
  } else {
    console.log('✅ Aucun trigger trouvé sur la table users');
  }

  // Vérifier la valeur par défaut de la colonne
  console.log('\n🔍 Vérification de la valeur par défaut de must_change_password...\n');
  
  const { data: colData, error: colError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'must_change_password';
    `
  });

  if (colError) {
    console.log('💡 Vérifiez manuellement dans Supabase SQL Editor avec:');
    console.log(`
SELECT column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'must_change_password';
    `);
  } else if (colData) {
    console.log('Valeur par défaut:', colData[0]?.column_default || 'NULL');
  }
}

checkTriggers();
