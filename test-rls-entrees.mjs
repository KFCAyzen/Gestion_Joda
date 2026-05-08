import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Test avec le client normal (RLS activé)
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Test avec service role (RLS bypass)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRLS() {
  console.log('🔍 Test des permissions RLS sur entrees_comptables...\n');

  // 1. Se connecter en tant que super_admin
  console.log('1️⃣ Connexion en tant que superadmin@joda.com...');
  const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
    email: 'superadmin@joda.com',
    password: 'Joda@Admin9'
  });

  if (authError) {
    console.log('❌ Erreur connexion:', authError.message);
    return;
  }
  console.log('✅ Connecté:', authData.user.email);

  // 2. Vérifier le rôle dans la table users
  console.log('\n2️⃣ Vérification du rôle...');
  const { data: userData, error: userError } = await supabaseClient
    .from('users')
    .select('role')
    .eq('id', authData.user.id)
    .single();

  if (userError) {
    console.log('❌ Erreur récupération user:', userError.message);
  } else {
    console.log('✅ Rôle:', userData.role);
  }

  // 3. Tester l'insertion avec le client normal (RLS)
  console.log('\n3️⃣ Test insertion avec RLS (client normal)...');
  const { data: insertData, error: insertError } = await supabaseClient
    .from('entrees_comptables')
    .insert({
      montant: 1000,
      date: new Date().toISOString(),
      type: 'paiement_procedure',
      description: 'Test RLS',
      created_by: authData.user.id
    })
    .select();

  if (insertError) {
    console.log('❌ Erreur insertion:', insertError.message);
    console.log('Code:', insertError.code);
    console.log('Détails:', insertError.details);
  } else {
    console.log('✅ Insertion réussie:', insertData);
    // Nettoyer
    if (insertData && insertData[0]) {
      await supabaseAdmin.from('entrees_comptables').delete().eq('id', insertData[0].id);
    }
  }

  // 4. Vérifier les politiques RLS
  console.log('\n4️⃣ Vérification des politiques RLS...');
  console.log('\n💡 Exécutez ce SQL dans Supabase pour voir les politiques:');
  console.log(`
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'entrees_comptables'
ORDER BY policyname;
  `);

  await supabaseClient.auth.signOut();
}

testRLS();
