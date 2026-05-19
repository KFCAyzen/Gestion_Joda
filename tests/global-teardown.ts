import { config as loadEnv } from 'dotenv';
import path from 'node:path';

loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

import { cleanupTestData } from './helpers/seed';

export default async function globalTeardown() {
  if (process.env.E2E_KEEP_DATA === '1') {
    console.log('\n[E2E] E2E_KEEP_DATA=1, données conservées.');
    return;
  }
  console.log('\n[E2E] Nettoyage final…');
  await cleanupTestData();
  console.log('[E2E] Teardown terminé.\n');
}
