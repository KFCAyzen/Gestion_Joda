import { FullConfig, chromium, BrowserContext } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

import { ensureTestAccounts, ensureTestStudent, ensureTestUniversity, cleanupTestData, TEST_PASSWORD } from './helpers/seed';
import { tagEmail, tagStudentUsername } from './helpers/supabase-admin';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const AUTH_DIR = path.resolve(__dirname, '.auth');

const ROUTES_TO_WARMUP = [
  '/fr/login',
  '/fr/tableau-de-bord',
  '/fr/etudiants',
  '/fr/candidatures',
  '/fr/universites',
  '/fr/utilisateurs',
  '/fr/dossiers',
  '/fr/frais',
  '/fr/cours-langues',
  '/fr/comptabilite',
  '/fr/configuration-frais',
  '/fr/communication',
  '/fr/newsletter',
  '/fr/logs-activites',
  '/fr/notifications',
  '/fr/performances',
  '/fr/stockage',
  '/fr/etudiant',
];

async function loginAndPersist(context: BrowserContext, identifier: string, expectedUrl: RegExp, storagePath: string): Promise<void> {
  const page = await context.newPage();
  await page.goto('/fr/login', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator('[data-testid="login-identifier"]').waitFor({ state: 'visible', timeout: 60_000 });
  await page.locator('[data-testid="login-identifier"]').fill(identifier);
  await page.locator('[data-testid="login-password"]').fill(TEST_PASSWORD);
  await page.locator('[data-testid="login-submit"]').click();
  await page.waitForURL(expectedUrl, { timeout: 120_000 });
  await context.storageState({ path: storagePath });
  await page.close();
}

async function warmupAndSaveAuthStates() {
  if (process.env.E2E_SKIP_WARMUP === '1') {
    console.log('[E2E] E2E_SKIP_WARMUP=1, warmup ignoré.');
    return;
  }

  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

  console.log('[E2E] Sauvegarde des sessions d\'auth (1 login par rôle, partagé pour tous les tests)…');
  const browser = await chromium.launch();
  try {
    for (const role of ['admin', 'agent', 'supervisor', 'super_admin'] as const) {
      const ctx = await browser.newContext({ baseURL: BASE_URL });
      try {
        await loginAndPersist(ctx, tagEmail(role), /\/tableau-de-bord/, path.join(AUTH_DIR, `${role}.json`));
        console.log(`  ✓ ${role}`);
      } catch (e: any) {
        console.warn(`  ✗ ${role}: ${e?.message?.slice(0, 80)}`);
      } finally {
        await ctx.close();
      }
    }

    // Étudiant : utilise username (pas email), redirige vers /etudiant
    const studentCtx = await browser.newContext({ baseURL: BASE_URL });
    try {
      await loginAndPersist(studentCtx, tagStudentUsername(), /\/etudiant/, path.join(AUTH_DIR, 'student.json'));
      console.log('  ✓ student');
    } catch (e: any) {
      console.warn(`  ✗ student: ${e?.message?.slice(0, 80)}`);
    } finally {
      await studentCtx.close();
    }

    // Warmup routes avec la session admin (pour pré-compiler côté serveur, déjà fait en mode build)
    console.log('[E2E] Préchauffage des routes…');
    const warmCtx = await browser.newContext({ baseURL: BASE_URL, storageState: path.join(AUTH_DIR, 'admin.json') });
    const page = await warmCtx.newPage();
    for (const route of ROUTES_TO_WARMUP) {
      try {
        process.stdout.write(`  → ${route}`);
        const start = Date.now();
        await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        process.stdout.write(` (${Date.now() - start} ms)\n`);
      } catch (e: any) {
        process.stdout.write(` SKIPPED\n`);
      }
    }
    await warmCtx.close();
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(_config: FullConfig) {
  if (process.env.E2E_KEEP_DATA === '1') {
    console.log('\n[E2E] E2E_KEEP_DATA=1, on réutilise les comptes existants (pas de cleanup initial).');
  } else {
    console.log('\n[E2E] Nettoyage des données de test précédentes…');
    await cleanupTestData();
  }

  console.log('[E2E] Création/mise à jour des comptes de test…');
  const accounts = await ensureTestAccounts();

  console.log('[E2E] Création des données seed (étudiant, université)…');
  await ensureTestStudent(accounts.student.authId, accounts.agent.authId);
  await ensureTestUniversity();

  await warmupAndSaveAuthStates();

  console.log('[E2E] Setup terminé.\n');
}
