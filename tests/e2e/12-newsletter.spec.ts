import { test, expect } from '../fixtures/authenticated';
import { clickSidebarNav } from '../helpers/sidebar-nav';

test.describe('MODULE 12 — Newsletter', () => {
  test('TC-NEWS-001 — Page newsletter accessible (admin)', async ({ adminPage }) => {
    await adminPage.goto('/fr/newsletter');
    await expect(adminPage).toHaveURL(/\/newsletter/);
    await expect(adminPage.getByTestId('page-title')).toBeVisible();
  });

  test('TC-NEWS-001b — Nav sidebar vers newsletter', async ({ adminPage }) => {
    await adminPage.goto('/fr/tableau-de-bord');
    await clickSidebarNav(adminPage, 'newsletter');
    await expect(adminPage).toHaveURL(/\/newsletter/, { timeout: 10_000 });
  });

  test('TC-NEWS-003 — Endpoint cron newsletter-auto existant', async ({ request }) => {
    const response = await request.post('/api/cron/newsletter-auto');
    expect([200, 401, 403, 405, 500]).toContain(response.status());
  });
});
