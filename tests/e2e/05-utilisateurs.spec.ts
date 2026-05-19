import { test, expect } from '../fixtures/authenticated';
import { clickSidebarNav, expectNavHidden } from '../helpers/sidebar-nav';

test.describe('MODULE 5 — Gestion des utilisateurs staff', () => {
  test('TC-USR-001 — Page utilisateurs accessible (admin)', async ({ adminPage }) => {
    await adminPage.goto('/fr/utilisateurs');
    await expect(adminPage).toHaveURL(/\/utilisateurs/);
    await expect(adminPage.getByTestId('page-title')).toBeVisible();
  });

  test('TC-USR-001b — Nav sidebar vers utilisateurs (admin)', async ({ adminPage }) => {
    await adminPage.goto('/fr/tableau-de-bord');
    await clickSidebarNav(adminPage, 'users');
    await expect(adminPage).toHaveURL(/\/utilisateurs/, { timeout: 10_000 });
  });

  test('TC-USR-002 — Un agent ne voit pas l\'item utilisateurs dans la sidebar', async ({ agentPage }) => {
    await agentPage.goto('/fr/tableau-de-bord');
    await expectNavHidden(agentPage, 'users');
  });
});
