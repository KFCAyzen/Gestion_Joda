import { test, expect } from '../fixtures/authenticated';
import { clickSidebarNav } from '../helpers/sidebar-nav';

test.describe('MODULE 15 — Performances', () => {
  test('TC-PERF-001 — Page performances accessible', async ({ adminPage }) => {
    await adminPage.goto('/fr/performances');
    await expect(adminPage).toHaveURL(/\/performances/);
    await expect(adminPage.getByTestId('page-title')).toBeVisible();
  });

  test('TC-PERF-001b — Nav sidebar vers performances', async ({ adminPage }) => {
    await adminPage.goto('/fr/tableau-de-bord');
    await clickSidebarNav(adminPage, 'performance');
    await expect(adminPage).toHaveURL(/\/performances/, { timeout: 10_000 });
  });

  test('TC-PERF-002 — Filtres de période visibles', async ({ adminPage }) => {
    await adminPage.goto('/fr/performances');
    await adminPage.waitForTimeout(1500);
    const body = await adminPage.locator('body').textContent();
    const text = (body || '').toLowerCase();
    const matches = [/7\s*j/, /30\s*j/, /mois/, /année|year/, /tout|all/];
    const found = matches.filter((re) => re.test(text)).length;
    expect(found).toBeGreaterThanOrEqual(2);
  });
});
