import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { LargeSecureStore } from './large-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY manquants. Voir mobile/.env.local',
  );
}

/**
 * Client Supabase natif (mobile).
 *
 * Différences avec le client web (`src/app/lib/supabase/client.ts`) :
 *  - session stockée chiffrée via {@link LargeSecureStore} (et non des cookies) ;
 *  - `detectSessionInUrl: false` (pas d'URL OAuth web ; le deep-link sera géré
 *    explicitement à l'étape Auth) ;
 *  - même URL + même clé anon que l'app web → même backend, mêmes RLS.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Supabase recommande de suspendre l'auto-refresh quand l'app passe en arrière-plan
// et de le relancer au premier plan (évite des refresh inutiles / erreurs réseau).
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
