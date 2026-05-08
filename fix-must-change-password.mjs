import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixMustChangePassword() {
  console.log('🔧 Correction de must_change_password...\n');

  // 1. Mettre à jour les comptes admin/super_admin/agent
  console.log('1️⃣ Mise à jour des comptes admin/super_admin/agent...');
  const { error: updateError } = await supabase
    .from('users')
    .update({ must_change_password: false })
    .in('role', ['admin', 'super_admin', 'agent', 'supervisor']);

  if (updateError) {
    console.error('❌ Erreur:', updateError.message);
    return;
  }
  console.log('✅ Comptes mis à jour\n');

  // 2. Vérifier les comptes de test
  console.log('2️⃣ Vérification des comptes de test...');
  const { data, error } = await supabase
    .from('users')
    .select('email, role, must_change_password')
    .in('email', ['superadmin@joda.com', 'admin@joda.com', 'agent@joda.com'])
    .order('role', { ascending: false });

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  console.log('\n📊 État actuel:');
  console.log('┌─────────────────────────────┬──────────────┬──────────────────────┐');
  console.log('│ Email                       │ Rôle         │ Must Change Password │');
  console.log('├─────────────────────────────┼──────────────┼──────────────────────┤');
  data.forEach(u => {
    const status = u.must_change_password ? '❌ true' : '✅ false';
    console.log(`│ ${u.email.padEnd(27)} │ ${u.role.padEnd(12)} │ ${status.padEnd(20)} │`);
  });
  console.log('└─────────────────────────────┴──────────────┴──────────────────────┘');

  console.log('\n💡 Pour corriger définitivement la valeur par défaut:');
  console.log('   Exécutez migrations/fix_must_change_password_default.sql dans Supabase SQL Editor');
}

fixMustChangePassword();
