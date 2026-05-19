import { test, expect } from '../fixtures/authenticated';
import { clickSidebarNav } from '../helpers/sidebar-nav';

test.describe('MODULE 19 — Tableau de bord admin', () => {
  test('TC-DASH-001 — Page tableau de bord accessible', async ({ adminPage }) => {
    await adminPage.goto('/fr/tableau-de-bord');
    await expect(adminPage).toHaveURL(/\/tableau-de-bord/);
    await expect(adminPage.getByTestId('page-title')).toBeVisible();
  });

  test('TC-DASH-001b — Sidebar nav home navigue vers dashboard', async ({ adminPage }) => {
    await adminPage.goto('/fr/etudiants');
    await clickSidebarNav(adminPage, 'home');
    await expect(adminPage).toHaveURL(/\/tableau-de-bord/, { timeout: 10_000 });
  });

  test('TC-DASH-001-KPIs — KPIs présents', async ({ adminPage }) => {
    await adminPage.goto('/fr/tableau-de-bord');
    await adminPage.waitForTimeout(2500);
    const body = await adminPage.locator('body').textContent();
    const text = (body || '').toLowerCase();
    expect(text).toMatch(/dossier|paiement|étudiant|fcfa|revenu/);
  });

  test('TC-DASH-001-chart — Graphique des flux 7j rendu', async ({ adminPage }) => {
    await adminPage.goto('/fr/tableau-de-bord');
    await adminPage.waitForTimeout(3000);
    const svg = adminPage.locator('svg').first();
    await expect(svg).toBeVisible({ timeout: 5000 });
  });
});
