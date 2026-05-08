import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('URL:', url ? url.substring(0, 30) + '...' : 'MANQUANT');
console.log('KEY:', key ? key.substring(0, 20) + '...' : 'MANQUANT');

const supabase = createClient(url, key);

const accounts = [
    { email: 'admin@joda.com', password: 'Joda@Admin9' },
    { email: 'agent@joda.com', password: 'Joda@Agent9' },
];

for (const acc of accounts) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: acc.email, password: acc.password });
    if (error) {
        console.log('ECHEC  ' + acc.email + ' => ' + error.message);
    } else {
        const { data: profile } = await supabase.from('users').select('role, name').eq('id', data.user.id).single();
        console.log('OK     ' + acc.email + ' | role=' + profile?.role + ' | name=' + profile?.name);
        await supabase.auth.signOut();
    }
}
