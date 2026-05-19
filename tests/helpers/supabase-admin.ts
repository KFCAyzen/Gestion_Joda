import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises dans .env.local',
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export const TEST_PREFIX = 'e2e_';

export function tagEmail(role: string): string {
  return `${TEST_PREFIX}${role}@joda-tests.local`;
}

// Le LoginPage applique slugifyPart() au username avant d'appeler buildStudentAuthEmail :
// l'underscore est remplacé par un point. Pour que login + auth correspondent, on utilise
// directement la forme slugifiée comme username de l'étudiant de test.
export function tagStudentUsername(suffix = ''): string {
  return `e2e.student${suffix}`;
}

export function studentAuthEmail(username: string): string {
  // Reproduit slugifyPart() : non-alphanumérique → '.'
  const slug = username
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return `${slug}@students.joda.app`;
}
