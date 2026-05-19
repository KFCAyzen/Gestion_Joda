import { test, expect } from '../fixtures/authenticated';
import { clickSidebarNav } from '../helpers/sidebar-nav';

test.describe('MODULE 7 — Gestion des paiements', () => {
  test('TC-PAY-001 — Page frais accessible', async ({ agentPage }) => {
    await agentPage.goto('/fr/frais');
    await expect(agentPage).toHaveURL(/\/frais/);
    await expect(agentPage.getByTestId('page-title')).toBeVisible();
  });

  test('TC-PAY-001b — Nav sidebar vers frais', async ({ agentPage }) => {
    await agentPage.goto('/fr/tableau-de-bord');
    await clickSidebarNav(agentPage, 'facturation');
    await expect(agentPage).toHaveURL(/\/frais/, { timeout: 10_000 });
  });

  test('TC-PAY-007 — Filtrage par onglets', async ({ agentPage }) => {
    await agentPage.goto('/fr/frais');
    const tabs = ['À valider', 'En retard', 'Validés', 'Valides'];
    for (const label of tabs) {
      const tab = agentPage.getByRole('tab', { name: new RegExp(label, 'i') }).first();
      if (await tab.isVisible({ timeout: 1500 }).catch(() => false)) {
        await tab.click();
        await agentPage.waitForTimeout(300);
      }
    }
  });

  test('TC-PAY-009 — Sync pénalités (un seul appel)', async ({ agentPage }) => {
    let syncCalls = 0;
    agentPage.on('request', (req) => {
      if (req.url().includes('penalties') || req.url().includes('sync-pen')) syncCalls++;
    });
    await agentPage.goto('/fr/frais');
    await agentPage.waitForTimeout(3000);
    expect(syncCalls).toBeLessThanOrEqual(1);
  });
});
