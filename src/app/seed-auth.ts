// Script de création des comptes Supabase Auth de test
// Nécessite la service_role_key (accès admin)
// Exécuter avec: npx tsx src/app/seed-auth.ts

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Charge .env puis .env.local (Next.js convention)
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.');
    process.exit(1);
}

// Client avec service_role_key pour créer des utilisateurs Auth
const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_ACCOUNTS = [
    {
        email: 'superadmin@joda.com',
        password: 'Joda@Admin9',
        role: 'super_admin',
        username: 'superadmin',
        name: 'Super Administrateur',
    },
    {
        email: 'admin@joda.com',
        password: 'Joda@Admin9',
        role: 'admin',
        username: 'admin',
        name: 'Administrateur',
    },
    {
        email: 'agent@joda.com',
        password: 'Joda@Agent9',
        role: 'agent',
        username: 'agent',
        name: 'Agent Joda',
    },
];

async function seedAuthAccounts() {
    console.log('🔑 Création des comptes Supabase Auth de test...\n');

    for (const account of TEST_ACCOUNTS) {
        try {
            // Supprimer tout enregistrement orphelin dans public.users pour éviter les conflits de trigger
            await supabase.from('users').delete().eq('email', account.email);

            // Créer le compte Auth (ou le mettre à jour s'il existe déjà)
            const { data, error } = await supabase.auth.admin.createUser({
                email: account.email,
                password: account.password,
                email_confirm: true, // pas besoin de confirmation email
            });

            if (error) {
                if (error.message.includes('already been registered')) {
                    console.log(`⚠️  ${account.email} existe déjà dans Auth — mise à jour du profil...`);

                    // Récupérer l'ID existant
                    const { data: existing } = await supabase.auth.admin.listUsers();
                    const existingUser = existing?.users?.find(u => u.email === account.email);
                    if (!existingUser) {
                        console.error(`   ❌ Impossible de trouver ${account.email}`);
                        continue;
                    }

                    await upsertProfile(existingUser.id, account);
                    console.log(`   ✅ Profil mis à jour (id: ${existingUser.id})`);
                } else {
                    console.error(`   ❌ Erreur Auth pour ${account.email}:`, error.message);
                }
                continue;
            }

            if (data?.user) {
                await upsertProfile(data.user.id, account);
                console.log(`✅ ${account.email}  [${account.role}]  (id: ${data.user.id})`);
            }
        } catch (err) {
            console.error(`❌ Exception pour ${account.email}:`, err);
        }
    }

    console.log('\n📋 Comptes disponibles :');
    console.log('┌─────────────────────────────┬─────────────────┬──────────────┐');
    console.log('│ Email                       │ Mot de passe    │ Rôle         │');
    console.log('├─────────────────────────────┼─────────────────┼──────────────┤');
    for (const a of TEST_ACCOUNTS) {
        console.log(`│ ${a.email.padEnd(27)} │ ${a.password.padEnd(15)} │ ${a.role.padEnd(12)} │`);
    }
    console.log('└─────────────────────────────┴─────────────────┴──────────────┘');
    console.log('\n✅ Terminé.');
}

async function upsertProfile(
    userId: string,
    account: { email: string; role: string; username: string; name: string },
) {
    const { error } = await supabase.from('users').upsert(
        {
            id: userId,
            email: account.email,
            username: account.username,
            name: account.name,
            role: account.role,
            password_hash: 'managed_by_supabase_auth',
            must_change_password: false,
        },
        { onConflict: 'id' },
    );

    if (error) {
        console.error(`   ⚠️  Erreur profil pour ${account.email}:`, error.message);
    }
}

seedAuthAccounts();
