import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Variables d\'environnement manquantes');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const testAccounts = [
    {
        email: 'superadmin@joda.com',
        password: 'Joda@Admin9',
        role: 'super_admin',
        name: 'Super Admin',
        username: 'superadmin'
    },
    {
        email: 'admin@joda.com',
        password: 'Joda@Admin9',
        role: 'admin',
        name: 'Admin',
        username: 'admin'
    },
    {
        email: 'agent@joda.com',
        password: 'Joda@Agent9',
        role: 'agent',
        name: 'Agent',
        username: 'agent'
    }
];

async function createTestAccounts() {
    console.log('🔧 Création des comptes de test...\n');

    for (const account of testAccounts) {
        console.log(`📧 Création de ${account.email}...`);

        // 1. Créer dans Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: account.email,
            password: account.password,
            email_confirm: true
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                console.log(`   ⚠️  Compte Auth existe déjà`);
                
                // Récupérer l'ID du compte existant
                const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
                
                if (listError) {
                    console.log(`   ❌ Erreur listUsers: ${listError.message}`);
                    continue;
                }
                
                const existingUser = listData.users.find(u => u.email === account.email);
                
                if (existingUser) {
                    // Mettre à jour le mot de passe
                    const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
                        password: account.password,
                        email_confirm: true
                    });
                    
                    if (updateError) {
                        console.log(`   ❌ Erreur update password: ${updateError.message}`);
                    } else {
                        console.log(`   ✅ Mot de passe mis à jour`);
                    }

                    // Upsert dans la table users
                    const { error: upsertError } = await supabase
                        .from('users')
                        .upsert({
                            id: existingUser.id,
                            email: account.email,
                            username: account.username,
                            name: account.name,
                            role: account.role,
                            password_hash: 'managed_by_supabase_auth',
                            must_change_password: false
                        }, { onConflict: 'id' });

                    if (upsertError) {
                        console.log(`   ❌ Erreur upsert users: ${upsertError.message}`);
                    } else {
                        console.log(`   ✅ Table users mise à jour`);
                    }
                } else {
                    console.log(`   ❌ Compte non trouvé dans la liste`);
                }
            } else {
                console.log(`   ❌ Erreur Auth: ${authError.message}`);
            }
            continue;
        }

        if (authData.user) {
            console.log(`   ✅ Compte Auth créé (ID: ${authData.user.id})`);

            // 2. Créer dans la table users
            const { error: dbError } = await supabase
                .from('users')
                .insert({
                    id: authData.user.id,
                    email: account.email,
                    username: account.username,
                    name: account.name,
                    role: account.role,
                    password_hash: 'managed_by_supabase_auth',
                    must_change_password: false
                });

            if (dbError) {
                console.log(`   ❌ Erreur DB: ${dbError.message}`);
            } else {
                console.log(`   ✅ Entrée users créée`);
            }
        }

        console.log('');
    }

    console.log('✅ Terminé!\n');
    console.log('📋 Comptes de test:');
    console.log('┌─────────────────────────────┬─────────────────┬──────────────┐');
    console.log('│ Email                       │ Mot de passe    │ Rôle         │');
    console.log('├─────────────────────────────┼─────────────────┼──────────────┤');
    testAccounts.forEach(acc => {
        console.log(`│ ${acc.email.padEnd(27)} │ ${acc.password.padEnd(15)} │ ${acc.role.padEnd(12)} │`);
    });
    console.log('└─────────────────────────────┴─────────────────┴──────────────┘');
}

createTestAccounts().catch(console.error);
