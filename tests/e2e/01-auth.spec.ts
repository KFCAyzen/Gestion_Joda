import { test, expect } from '@playwright/test';
import { TEST_PASSWORD } from '../helpers/seed';
import { tagEmail, tagStudentUsername } from '../helpers/supabase-admin';
import { logout } from '../helpers/auth-utils';

test.describe('MODULE 1 — Authentification', () => {
  test('TC-AUTH-001 — Connexion réussie (admin)', async ({ page }) => {
    await page.goto('/fr/login');
    await page.getByTestId('login-identifier').fill(tagEmail('admin'));
    await page.getByTestId('login-password').fill(TEST_PASSWORD);
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/tableau-de-bord/, { timeout: 30_000 });
    await expect(page.getByTestId('page-title')).toBeVisible();
  });

  test('TC-AUTH-002 — Connexion réussie (étudiant)', async ({ page }) => {
    await page.goto('/fr/login');
    await page.getByTestId('login-identifier').fill(tagStudentUsername());
    await page.getByTestId('login-password').fill(TEST_PASSWORD);
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/etudiant/, { timeout: 30_000 });
  });

  test('TC-AUTH-003 — Connexion échouée (mauvais mot de passe)', async ({ page }) => {
    await page.goto('/fr/login');
    await page.getByTestId('login-identifier').fill(tagEmail('admin'));
    await page.getByTestId('login-password').fill('mauvais-mdp');
    await page.getByTestId('login-submit').click();
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-AUTH-005 — Accès route protégée sans session', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/fr/tableau-de-bord');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('TC-AUTH-006 — Déconnexion', async ({ page }) => {
    await page.goto('/fr/login');
    await page.getByTestId('login-identifier').fill(tagEmail('admin'));
    await page.getByTestId('login-password').fill(TEST_PASSWORD);
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/tableau-de-bord/, { timeout: 30_000 });
    await logout(page);
  });

  test('TC-AUTH-007 — Mot de passe oublié (email)', async ({ page }) => {
    // IMPORTANT : ne PAS utiliser tagEmail('admin') ici — l'API forgot-password
    // génère un nouveau mot de passe et le persiste, ce qui casserait toutes les
    // sessions admin suivantes. On utilise un email factice (inexistant) :
    // l'API retourne 200 de toute façon pour empêcher l'énumération.
    await page.goto('/fr/login');
    await page.getByTestId('login-forgot-btn').click();
    await page.getByTestId('forgot-input').fill('e2e_inexistant@joda-tests.local');
    await page.getByTestId('forgot-submit').click();
    await page.waitForTimeout(1500);
    await expect(page.getByTestId('forgot-cancel').or(page.getByText(/envoyé|sent/i)).first()).toBeVisible();
  });

  test('TC-AUTH-012 — Redirection étudiant vers portail depuis /login', async ({ page }) => {
    await page.goto('/fr/login');
    await page.getByTestId('login-identifier').fill(tagStudentUsername());
    await page.getByTestId('login-password').fill(TEST_PASSWORD);
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/etudiant/, { timeout: 30_000 });

    await page.goto('/fr/login');
    await expect(page).toHaveURL(/\/etudiant|\/tableau-de-bord/, { timeout: 15_000 });
  });

  test('TC-AUTH-013 — Theme toggle visible sur login', async ({ page }) => {
    await page.goto('/fr/login');
    await expect(page.getByTestId('theme-toggle')).toBeVisible();
  });

  test('TC-AUTH-014 — Switcher de langue visible sur login', async ({ page }) => {
    await page.goto('/fr/login');
    await expect(page.getByTestId('lang-switcher')).toBeVisible();
    await page.getByTestId('lang-switcher').click();
    await expect(page.getByTestId('lang-option-en')).toBeVisible();
  });
});
