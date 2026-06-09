import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createOfflineFirstClient, isDesktop } from '../desktop/offline-client';

/**
 * Singleton côté navigateur. `createClient()` est appelé à chaque rendu dans de
 * nombreux composants ; sans mémoïsation, chaque appel fabriquait un nouveau
 * `createBrowserClient` (donc une nouvelle instance GoTrueClient ET un nouveau
 * client Realtime). Conséquences observées :
 *   - « Multiple GoTrueClient instances » : contention sur le verrou d'auth
 *     `navigator.locks` → l'onglet finit par se figer.
 *   - Les effets qui mettent `supabase` en dépendance (ex. abonnements Realtime)
 *     se ré-abonnaient à chaque rendu, multipliant les WebSockets.
 * On garde donc UNE seule instance par contexte navigateur.
 */
let browserClient: SupabaseClient | null = null;

/**
 * Crée (ou réutilise) le client Supabase :
 *   - Web   : `@supabase/ssr` classique (online uniquement)
 *   - Desktop (Electron) : wrapper offline-first qui redirige les opérations
 *     sur les 12 tables métier vers SQLite local. Sync bidirectionnelle
 *     en arrière-plan via le main process Electron.
 *
 * Le détecteur `isDesktop()` regarde `window.jodaDesktop` exposé par le preload.
 */
export function createClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Côté serveur (SSR), pas de singleton : chaque requête repart de zéro.
    if (typeof window === 'undefined') {
        return createBrowserClient(url, key);
    }

    if (!browserClient) {
        browserClient = isDesktop()
            ? createOfflineFirstClient(url, key)
            : createBrowserClient(url, key);
    }
    return browserClient;
}
