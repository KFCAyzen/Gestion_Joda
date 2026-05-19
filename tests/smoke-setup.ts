import { config as loadEnv } from 'dotenv';
import path from 'node:path';

loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

import { ensureTestAccounts, ensureTestStudent, ensureTestUniversity, cleanupTestData } from './helpers/seed';

(async () => {
  try {
    console.log('[smoke] cleanup…');
    await cleanupTestData();
    console.log('[smoke] accounts…');
    const accounts = await ensureTestAccounts();
    console.log('[smoke] student…');
    await ensureTestStudent(accounts.student.authId, accounts.agent.authId);
    console.log('[smoke] university…');
    await ensureTestUniversity();
    console.log('[smoke] OK');
    process.exit(0);
  } catch (e: any) {
    console.error('[smoke] FAILED:', e?.message ?? e);
    console.error(e?.stack);
    process.exit(1);
  }
})();
