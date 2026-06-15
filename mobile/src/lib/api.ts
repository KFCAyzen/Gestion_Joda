import { supabase } from './supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

/**
 * Appel aux routes serveur Next (`/api/*`).
 *
 * Le natif n'a pas de cookies : on transmet la session via
 * `Authorization: Bearer <access_token>`. Côté serveur, `getServerSession`
 * (src/app/lib/auth.ts) sait lire ce header en plus des cookies web.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!API_BASE) throw new Error('EXPO_PUBLIC_API_BASE_URL manquant (voir mobile/.env.local)');

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);

  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

export { API_BASE };
