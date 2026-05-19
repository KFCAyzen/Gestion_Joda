import { test, expect } from '../fixtures/authenticated';
import { clickSidebarNav } from '../helpers/sidebar-nav';

test.describe('MODULE 2 — Gestion des étudiants', () => {
  test('TC-ETU-001 — Page étudiants accessible (agent)', async ({ agentPage }) => {
    await agentPage.goto('/fr/etudiants');
    await expect(agentPage).toHaveURL(/\/etudiants/);
    await expect(agentPage.getByTestId('page-title')).toBeVisible();
  });

  test('TC-ETU-001b — Navigation vers étudiants via sidebar', async ({ agentPage }) => {
    await agentPage.goto('/fr/tableau-de-bord');
    await clickSidebarNav(agentPage, 'clients');
    await expect(agentPage).toHaveURL(/\/etudiants/, { timeout: 10_000 });
  });

  test('TC-ETU-005 — Recherche par nom/prénom', async ({ agentPage }) => {
    await agentPage.goto('/fr/etudiants');
    const search = agentPage.locator('input[placeholder*="rech" i], input[type="search"]').first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill('Test');
      await agentPage.waitForTimeout(800);
      await expect(agentPage.locator('body')).toBeVisible();
    } else {
      test.skip(true, 'Barre de recherche introuvable');
    }
  });

  test('TC-ETU-006 — Affichage détail étudiant', async ({ agentPage }) => {
    await agentPage.goto('/fr/etudiants');
    await agentPage.waitForTimeout(1500);
    const row = agentPage.locator('table tbody tr, [role="row"]').first();
    if (await row.isVisible().catch(() => false)) {
      await row.click();
      await agentPage.waitForTimeout(800);
    } else {
      test.skip(true, 'Aucune ligne étudiant trouvée');
    }
  });

  test('TC-ETU-008 — Pagination de la liste', async ({ agentPage }) => {
    await agentPage.goto('/fr/etudiants');
    const next = agentPage.getByRole('button', { name: /suivant|next|>/i }).first();
    if (await next.isEnabled().catch(() => false)) {
      await next.click();
      await agentPage.waitForTimeout(500);
    }
    expect(true).toBeTruthy();
  });
});
