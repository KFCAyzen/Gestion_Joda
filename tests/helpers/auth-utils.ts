import { Page, expect } from '@playwright/test';
import { TEST_PASSWORD } from './seed';
import { tagEmail, tagStudentUsername } from './supabase-admin';

const LOGIN_TIMEOUT = 60_000;

export async function loginAs(page: Page, role: 'admin' | 'agent' | 'supervisor' | 'super_admin'): Promise<void> {
  await page.goto('/fr/login', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-identifier').waitFor({ state: 'visible', timeout: LOGIN_TIMEOUT });

  await page.getByTestId('login-identifier').fill(tagEmail(role));
  await page.getByTestId('login-password').fill(TEST_PASSWORD);

  await page.getByTestId('login-submit').click();

  try {
    await page.waitForURL(/\/tableau-de-bord/, { timeout: LOGIN_TIMEOUT });
  } catch (e) {
    // Diagnostiquer : capture erreur affichée à l'écran pour faciliter le debug
    const bodyText = await page.locator('body').textContent().catch(() => '');
    const errMsg = (bodyText || '').match(/(Identifiants incorrects[^\n]*|Erreur[^\n]*)/i)?.[1];
    throw new Error(
      `loginAs(${role}) failed: ${errMsg ?? 'no error message visible'} (URL=${page.url()})`,
    );
  }
}

export async function loginAsStudent(page: Page): Promise<void> {
  await page.goto('/fr/login', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-identifier').waitFor({ state: 'visible', timeout: LOGIN_TIMEOUT });

  await page.getByTestId('login-identifier').fill(tagStudentUsername());
  await page.getByTestId('login-password').fill(TEST_PASSWORD);

  await page.getByTestId('login-submit').click();

  try {
    await page.waitForURL(/\/etudiant/, { timeout: LOGIN_TIMEOUT });
  } catch (e) {
    const bodyText = await page.locator('body').textContent().catch(() => '');
    const errMsg = (bodyText || '').match(/(Identifiants incorrects[^\n]*|Erreur[^\n]*)/i)?.[1];
    throw new Error(`loginAsStudent failed: ${errMsg ?? 'no error message visible'} (URL=${page.url()})`);
  }
}

export async function logout(page: Page): Promise<void> {
  const logoutBtn = page.getByTestId('btn-logout').or(page.getByTestId('portal-logout')).first();
  await logoutBtn.click();
  const confirm = page.getByTestId('confirm-yes');
  if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirm.click();
  }
  await page.waitForURL(/\/login/, { timeout: 15_000 });
}

export async function expectRedirectedToLogin(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
}
