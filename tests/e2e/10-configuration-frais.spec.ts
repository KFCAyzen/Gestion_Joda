import { test, expect } from '../fixtures/authenticated';
import { clickSidebarNav } from '../helpers/sidebar-nav';

test.describe('MODULE 10 — Configuration des frais', () => {
  test('TC-CONF-001 — Page configuration accessible (admin)', async ({ adminPage }) => {
    await adminPage.goto('/fr/configuration-frais');
    await expect(adminPage).toHaveURL(/\/configuration-frais/);
    await expect(adminPage.getByTestId('page-title')).toBeVisible();
  });

  test('TC-CONF-001b — Nav sidebar vers configuration frais', async ({ adminPage }) => {
    await adminPage.goto('/fr/tableau-de-bord');
    await clickSidebarNav(adminPage, 'fee_config');
    await expect(adminPage).toHaveURL(/\/configuration-frais/, { timeout: 10_000 });
  });
});
