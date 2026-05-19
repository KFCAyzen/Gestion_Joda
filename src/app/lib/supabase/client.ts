import { createBrowserClient } from '@supabase/ssr';
import { createOfflineFirstClient, isDesktop } from '../desktop/offline-client';

/**
 * Crée le client Supabase :
 *   - Web   : `@supabase/ssr` classique (online uniquement)
 *   - Desktop (Electron) : wrapper offline-first qui redirige les opérations
 *     sur les 12 tables métier vers SQLite local. Sync bidirectionnelle
 *     en arrière-plan via le main process Electron.
 *
 * Le détecteur `isDesktop()` regarde `window.jodaDesktop` exposé par le preload.
 */
export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (isDesktop()) {
        return createOfflineFirstClient(url, key);
    }
    return createBrowserClient(url, key);
}
