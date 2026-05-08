import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY, // service role pour bypasser RLS
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const updates = [
    { email: 'superadmin@joda.com', role: 'super_admin', name: 'Super Administrateur', username: 'superadmin' },
    { email: 'admin@joda.com',      role: 'admin',       name: 'Administrateur',       username: 'admin' },
    { email: 'agent@joda.com',      role: 'agent',       name: 'Agent Joda',           username: 'agent' },
];

for (const u of updates) {
    const { error } = await supabase
        .from('users')
        .update({ role: u.role, name: u.name, username: u.username, must_change_password: false })
        .eq('email', u.email);

    if (error) {
        console.log('ECHEC  ' + u.email + ' : ' + error.message);
    } else {
        console.log('OK     ' + u.email + ' => role=' + u.role);
    }
}

console.log('\nVerification :');
const { data } = await supabase.from('users').select('email, role, name').in('email', updates.map(u => u.email));
for (const row of data ?? []) {
    console.log(' -', row.email, '|', row.role, '|', row.name);
}
