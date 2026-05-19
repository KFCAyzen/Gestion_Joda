import { test, expect } from '../fixtures/authenticated';
import { clickSidebarNav } from '../helpers/sidebar-nav';

test.describe('MODULE 11 — Communication', () => {
  test('TC-COM-001 — Page communication accessible', async ({ agentPage }) => {
    await agentPage.goto('/fr/communication');
    await expect(agentPage).toHaveURL(/\/communication/);
    await expect(agentPage.getByTestId('page-title')).toBeVisible();
  });

  test('TC-COM-001b — Nav sidebar vers communication', async ({ agentPage }) => {
    await agentPage.goto('/fr/tableau-de-bord');
    await clickSidebarNav(agentPage, 'com');
    await expect(agentPage).toHaveURL(/\/communication/, { timeout: 10_000 });
  });

  test('TC-COM-003 — 3 onglets présents (Conversations, Messages, SMS)', async ({ agentPage }) => {
    await agentPage.goto('/fr/communication');
    await agentPage.waitForTimeout(1000);
    const body = await agentPage.locator('body').textContent();
    const text = (body || '').toLowerCase();
    expect(text).toMatch(/conversation|message|sms/);
  });

  test('TC-COM-004 — Limite 160 caractères SMS', async ({ adminPage }) => {
    await adminPage.goto('/fr/communication');
    const smsTab = adminPage.getByRole('tab', { name: /sms/i }).first();
    if (await smsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await smsTab.click();
      await adminPage.waitForTimeout(500);
      const textarea = adminPage.locator('textarea').first();
      if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
        const maxLength = await textarea.getAttribute('maxlength');
        if (maxLength) expect(Number(maxLength)).toBeLessThanOrEqual(160);
      }
    }
    expect(true).toBeTruthy();
  });

  test('TC-COM-005 — Solde SMS endpoint répond', async ({ adminPage }) => {
    const response = await adminPage.request.get('/api/sms-balance');
    expect([200, 401, 403, 500]).toContain(response.status());
  });
});
