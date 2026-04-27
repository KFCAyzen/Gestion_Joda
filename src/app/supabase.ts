import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Singleton — évite les instances multiples GoTrueClient
const globalKey = 'supabase_singleton';
declare global { var supabase_singleton: SupabaseClient | undefined; }

export const supabase: SupabaseClient =
    globalThis[globalKey] ?? (globalThis[globalKey] = createClient(supabaseUrl, supabaseKey));

export function createSecondarySupabaseClient() {
    return createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storageKey: `joda-ephemeral-${Date.now()}`,
        },
    });
}
