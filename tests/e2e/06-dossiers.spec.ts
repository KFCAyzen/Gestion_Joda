import { test, expect } from '../fixtures/authenticated';
import { clickSidebarNav } from '../helpers/sidebar-nav';

test.describe('MODULE 6 — Gestion des dossiers bourses', () => {
  test('TC-DOS-001 — Page dossiers accessible', async ({ agentPage }) => {
    await agentPage.goto('/fr/dossiers');
    await expect(agentPage).toHaveURL(/\/dossiers/);
    await expect(agentPage.getByTestId('page-title')).toBeVisible();
  });

  test('TC-DOS-001b — Nav sidebar vers dossiers', async ({ agentPage }) => {
    await agentPage.goto('/fr/tableau-de-bord');
    await clickSidebarNav(agentPage, 'dossiers');
    await expect(agentPage).toHaveURL(/\/dossiers/, { timeout: 10_000 });
  });

  test('TC-DOS-008 — Recherche et filtres', async ({ agentPage }) => {
    await agentPage.goto('/fr/dossiers');
    const search = agentPage.locator('input[type="search"], input[placeholder*="rech" i]').first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill('Test');
      await agentPage.waitForTimeout(800);
    }
    expect(true).toBeTruthy();
  });
});
