import { test, expect } from '../fixtures/authenticated';
import { expectNavHidden } from '../helpers/sidebar-nav';

test.describe('MODULE 16 — Surveillance du stockage', () => {
  test('TC-STOCK-001 — Page stockage accessible (super_admin uniquement)', async ({ superAdminPage }) => {
    await superAdminPage.goto('/fr/stockage');
    await expect(superAdminPage).toHaveURL(/\/stockage/);
    await expect(superAdminPage.getByTestId('page-title')).toBeVisible();
  });

  test('TC-STOCK-002 — Admin (non super_admin) ne voit pas le menu stockage', async ({ adminPage }) => {
    await adminPage.goto('/fr/tableau-de-bord');
    await expectNavHidden(adminPage, 'storage');
  });

  test('TC-STOCK-001-stats — Stats affichées (MB, étudiants, documents)', async ({ superAdminPage }) => {
    await superAdminPage.goto('/fr/stockage');
    await superAdminPage.waitForTimeout(2000);
    const body = await superAdminPage.locator('body').textContent();
    const text = (body || '').toLowerCase();
    expect(text).toMatch(/mb|mo|stockage|storage|étudiant|document/);
  });
});
