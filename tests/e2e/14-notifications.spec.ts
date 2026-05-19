import { test, expect } from '../fixtures/authenticated';

test.describe('MODULE 14 — Notifications', () => {
  test('TC-NOTIF-001 — Page notifications accessible', async ({ agentPage }) => {
    await agentPage.goto('/fr/notifications');
    await expect(agentPage).toHaveURL(/\/notifications/);
    await expect(agentPage.getByTestId('page-title')).toBeVisible();
  });

  test('TC-NOTIF-002 — Cloche visible dans le header', async ({ agentPage }) => {
    await agentPage.goto('/fr/tableau-de-bord');
    await expect(agentPage.getByTestId('btn-notifications')).toBeVisible();
  });

  test('TC-NOTIF-002b — Clic sur cloche navigue vers notifications', async ({ agentPage }) => {
    await agentPage.goto('/fr/tableau-de-bord');
    await agentPage.getByTestId('btn-notifications').click();
    await expect(agentPage).toHaveURL(/\/notifications/, { timeout: 10_000 });
  });
});
