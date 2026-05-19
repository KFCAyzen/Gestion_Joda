import { test as base, Page, Browser } from '@playwright/test';
import path from 'node:path';

const AUTH_DIR = path.resolve(__dirname, '..', '.auth');

/**
 * Fixtures qui démarrent avec un browser context déjà authentifié, en
 * réutilisant les `storageState` créés par `global-setup.ts`.
 *
 * Bénéfices vs login UI à chaque test :
 *   - aucun appel à Supabase auth (pas de rate-limit)
 *   - chaque test démarre ~7-8s plus vite
 *   - plus représentatif du parcours utilisateur (sessions persistantes)
 */
async function newAuthedPage(browser: Browser, role: 'admin' | 'agent' | 'supervisor' | 'super_admin' | 'student'): Promise<Page> {
  const context = await browser.newContext({ storageState: path.join(AUTH_DIR, `${role}.json`) });
  return context.newPage();
}

type Fixtures = {
  adminPage: Page;
  agentPage: Page;
  supervisorPage: Page;
  superAdminPage: Page;
  studentPage: Page;
};

export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const page = await newAuthedPage(browser, 'admin');
    await use(page);
    await page.context().close();
  },
  agentPage: async ({ browser }, use) => {
    const page = await newAuthedPage(browser, 'agent');
    await use(page);
    await page.context().close();
  },
  supervisorPage: async ({ browser }, use) => {
    const page = await newAuthedPage(browser, 'supervisor');
    await use(page);
    await page.context().close();
  },
  superAdminPage: async ({ browser }, use) => {
    const page = await newAuthedPage(browser, 'super_admin');
    await use(page);
    await page.context().close();
  },
  studentPage: async ({ browser }, use) => {
    const page = await newAuthedPage(browser, 'student');
    await use(page);
    await page.context().close();
  },
});

export { expect } from '@playwright/test';
