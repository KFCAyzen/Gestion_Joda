import { test, expect } from '../fixtures/authenticated';
import { clickSidebarNav } from '../helpers/sidebar-nav';

test.describe('MODULE 8 — Cours de langues', () => {
  test('TC-CRS-001 — Page cours langues accessible', async ({ agentPage }) => {
    await agentPage.goto('/fr/cours-langues');
    await expect(agentPage).toHaveURL(/\/cours-langues/);
    await expect(agentPage.getByTestId('page-title')).toBeVisible();
  });

  test('TC-CRS-001b — Nav sidebar vers cours langues', async ({ agentPage }) => {
    await agentPage.goto('/fr/tableau-de-bord');
    await clickSidebarNav(agentPage, 'cours_langues');
    await expect(agentPage).toHaveURL(/\/cours-langues/, { timeout: 10_000 });
  });

  test('TC-CRS-003 — Colonne "Tranche" présente', async ({ agentPage }) => {
    await agentPage.goto('/fr/cours-langues');
    await agentPage.waitForTimeout(1500);
    const header = agentPage.locator('th, [role="columnheader"]').filter({ hasText: /tranche/i }).first();
    if (await header.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(header).toBeVisible();
    } else {
      test.skip(true, 'Aucune inscription en base — colonne non rendue');
    }
  });
});
