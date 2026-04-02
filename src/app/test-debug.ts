import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://phtwieeyufkxrttmwsfd.supabase.co',
  'sb_publishable_jVPT1HsYJ3M2iwKx-jgN-A_wDBhoD6Z'
);

async function test() {
  console.log('🔐 Test connexion...\n');
  
  // Test 1: Authentification
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'superadmin@gmail.com',
    password: 'Admin123'
  });
  
  if (authError) {
    console.log('❌ Auth error:', authError.message);
    return;
  }
  
  console.log('✅ Auth OK, user ID:', authData.user?.id);
  
  // Test 2: Vérifier dans la table users (avec le anon key, cela peut être bloqué par RLS)
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user?.id)
    .single();
  
  if (userError) {
    console.log('❌ User table error:', userError.message);
    console.log('   Code:', userError.code);
  } else {
    console.log('✅ User in table:', userData);
  }
}

test();