import { supabaseAdmin, tagEmail, tagStudentUsername, studentAuthEmail, TEST_PREFIX } from './supabase-admin';

export const TEST_PASSWORD = 'TestJoda!2026';

export interface TestAccount {
  authId: string;
  email: string;
  username: string;
  role: 'super_admin' | 'admin' | 'supervisor' | 'agent' | 'student';
  name: string;
}

export const ACCOUNTS = {
  superAdmin: { role: 'super_admin', name: 'E2E Super Admin', username: `${TEST_PREFIX}superadmin` },
  admin: { role: 'admin', name: 'E2E Admin', username: `${TEST_PREFIX}admin` },
  supervisor: { role: 'supervisor', name: 'E2E Supervisor', username: `${TEST_PREFIX}supervisor` },
  agent: { role: 'agent', name: 'E2E Agent', username: `${TEST_PREFIX}agent` },
  student: { role: 'student', name: 'E2E Student', username: tagStudentUsername() },
} as const;

export async function ensureTestAccounts(): Promise<Record<string, TestAccount>> {
  const sb = supabaseAdmin();
  const results: Record<string, TestAccount> = {};

  for (const [key, def] of Object.entries(ACCOUNTS)) {
    const email = def.role === 'student' ? studentAuthEmail(def.username) : tagEmail(def.role);

    const { data: existing } = await sb
      .from('users')
      .select('id, email, username, role, name')
      .eq('username', def.username)
      .maybeSingle();

    let authId: string;

    if (existing?.id) {
      authId = existing.id;
      try {
        await sb.auth.admin.updateUserById(authId, { password: TEST_PASSWORD, email_confirm: true });
      } catch (e: any) {
        console.warn(`  update ${def.role} password warn: ${e?.message}`);
      }
    } else {
      const { data: list } = await sb.auth.admin.listUsers({ perPage: 200 });
      const existingAuth = list?.users?.find((u: any) => u.email === email);

      if (existingAuth) {
        authId = existingAuth.id;
        await sb.auth.admin.updateUserById(authId, { password: TEST_PASSWORD, email_confirm: true });
      } else {
        const { data: created, error } = await sb.auth.admin.createUser({
          email,
          password: TEST_PASSWORD,
          email_confirm: true,
          user_metadata: { name: def.name, username: def.username, role: def.role },
          app_metadata: { role: def.role },
        });
        if (error || !created.user) throw new Error(`createUser ${def.role}: ${error?.message}`);
        authId = created.user.id;
      }

      const { error: upsertErr } = await sb.from('users').upsert(
        {
          id: authId,
          email,
          username: def.username,
          role: def.role,
          name: def.name,
          password_hash: '',
          is_active: true,
          must_change_password: false,
          contact_email: def.role === 'student' ? `${TEST_PREFIX}student.contact@joda-tests.local` : email,
        },
        { onConflict: 'id' },
      );
      if (upsertErr) throw new Error(`upsert users ${def.role}: ${upsertErr.message}`);
    }

    results[key] = { authId, email, username: def.username, role: def.role as TestAccount['role'], name: def.name };
  }

  return results;
}

export async function ensureTestStudent(accountAuthId: string, agentId: string): Promise<string> {
  const sb = supabaseAdmin();
  const { data: existing } = await sb
    .from('students')
    .select('id')
    .eq('user_id', accountAuthId)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await sb
    .from('students')
    .insert({
      user_id: accountAuthId,
      created_by: agentId,
      nom: 'Test',
      prenom: 'Etudiant',
      email: `${TEST_PREFIX}student.contact@joda-tests.local`,
      telephone: '+237600000000',
      nationalite: 'Camerounaise',
      choix: 'procedure_seule',
      niveau: 'bachelor',
      langue: 'mandarin',
    })
    .select('id')
    .single();
  if (error) throw new Error(`ensureTestStudent: ${error.message}`);
  return data.id;
}

export async function ensureTestUniversity(): Promise<string> {
  const sb = supabaseAdmin();
  const nom = `${TEST_PREFIX}Université Pékin`;
  const { data: existing } = await sb.from('universities').select('id').eq('nom', nom).maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await sb
    .from('universities')
    .insert({
      nom,
      pays: 'Chine',
      ville: 'Pékin',
      programme: 'Test program',
      niveau_etude: 'bachelor',
      active: true,
    })
    .select('id')
    .single();
  if (error) throw new Error(`ensureTestUniversity: ${error.message}`);
  return data.id;
}

export async function cleanupTestData(): Promise<void> {
  const sb = supabaseAdmin();

  try { await sb.from('payments').delete().like('reference', `${TEST_PREFIX}%`); } catch {}
  try { await sb.from('documents').delete().like('url', `%${TEST_PREFIX}%`); } catch {}
  try { await sb.from('entrees_comptables').delete().like('description', `${TEST_PREFIX}%`); } catch {}
  try { await sb.from('sorties_comptables').delete().like('description', `${TEST_PREFIX}%`); } catch {}
  try { await sb.from('dossier_bourses').delete().like('notes_internes', `${TEST_PREFIX}%`); } catch {}
  try { await sb.from('applications').delete().like('notes', `${TEST_PREFIX}%`); } catch {}
  try { await sb.from('students').delete().like('email', `${TEST_PREFIX}%`); } catch {}
  try { await sb.from('universities').delete().like('nom', `${TEST_PREFIX}%`); } catch {}

  const { data: testUsers } = await sb
    .from('users')
    .select('id, username')
    .or(`username.like.${TEST_PREFIX}%,username.like.e2e.%`);
  if (testUsers?.length) {
    for (const u of testUsers) {
      try {
        await sb.auth.admin.deleteUser(u.id);
      } catch {}
    }
    await sb
      .from('users')
      .delete()
      .or(`username.like.${TEST_PREFIX}%,username.like.e2e.%`);
  }
}

export async function getAccountId(role: string): Promise<string | null> {
  const sb = supabaseAdmin();
  const username = role === 'student' ? tagStudentUsername() : `${TEST_PREFIX}${role}`;
  const { data } = await sb.from('users').select('id').eq('username', username).maybeSingle();
  return data?.id ?? null;
}
