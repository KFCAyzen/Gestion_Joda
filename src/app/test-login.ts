// Script de test de connexion Supabase
// Exécuter avec: npx tsx src/app/test-login.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://phtwieeyufkxrttmwsfd.supabase.co';
const supabaseKey = 'sb_publishable_jVPT1HsYJ3M2iwKx-jgN-A_wDBhoD6Z';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  console.log('🧪 Test de connexion...\n');
  
  const email = 'superadmin@gmail.com';
  const password = 'Admin123';
  
  try {
    // 1. Test d'authentification
    console.log('1. Test authentification avec Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (authError) {
      console.error('❌ Erreur Auth:', authError.message);
      return;
    }
    
    console.log('✅ Authentification réussie!');
    console.log('   User ID:', authData.user?.id);
    console.log('   Email:', authData.user?.email);
    
    // 2. Vérifier dans la table users
    console.log('\n2. Vérification dans la table users...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user?.id)
      .single();
    
    if (userError) {
      console.log('⚠️ User pas dans table users:', userError.message);
      
      // Créer l'utilisateur
      console.log('\n3. Création du user dans la table users...');
      const { error: insertError } = await supabase.from('users').insert({
        id: authData.user?.id,
        email: authData.user?.email,
        username: 'superadmin',
        name: 'Super Admin',
        role: 'super_admin',
        password_hash: 'managed_by_supabase_auth',
        must_change_password: false
      });
      
      if (insertError) {
        console.error('❌ Erreur création:', insertError.message);
      } else {
        console.log('✅ User créé avec succès!');
      }
    } else {
      console.log('✅ User trouvé dans la table users:');
      console.log('   ID:', userData.id);
      console.log('   Username:', userData.username);
      console.log('   Role:', userData.role);
      console.log('   Email:', userData.email);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testLogin();