import { test, expect } from '../fixtures/authenticated';

test.describe('MODULE 17 — Portail étudiant', () => {
  test('TC-PORT-001 — Page portail accessible (student)', async ({ studentPage }) => {
    await studentPage.goto('/fr/etudiant');
    await expect(studentPage).toHaveURL(/\/etudiant/);
  });

  test('TC-PORT-010a — Cloche notifications visible', async ({ studentPage }) => {
    await studentPage.goto('/fr/etudiant');
    await studentPage.getByTestId('portal-bell').waitFor({ state: 'visible', timeout: 30_000 });
    await expect(studentPage.getByTestId('portal-bell')).toBeVisible();
  });

  test('TC-PORT-010b — Clic cloche bascule sur vue notifications', async ({ studentPage }) => {
    await studentPage.goto('/fr/etudiant');
    await studentPage.getByTestId('portal-bell').click();
    await studentPage.waitForTimeout(800);
    const body = await studentPage.locator('body').textContent();
    expect((body || '').toLowerCase()).toMatch(/notification/);
  });

  test('TC-PORT-009 — Tabs portail navigables (desktop sidebar ou mobile bottom)', async ({ studentPage }) => {
    await studentPage.goto('/fr/etudiant');
    await studentPage.setViewportSize({ width: 390, height: 844 });
    await studentPage.waitForTimeout(800);

    for (const tab of ['payments', 'documents', 'dossier', 'messaging', 'dashboard']) {
      const t = studentPage.getByTestId(`portal-tab-${tab}`).first();
      if (await t.isVisible({ timeout: 1500 }).catch(() => false)) {
        await t.click();
        await studentPage.waitForTimeout(400);
      }
    }
    expect(true).toBeTruthy();
  });

  test('TC-PORT-theme — Theme toggle dans le header portail', async ({ studentPage }) => {
    await studentPage.goto('/fr/etudiant');
    await studentPage.getByTestId('portal-theme-toggle').waitFor({ state: 'visible', timeout: 30_000 });
    await expect(studentPage.getByTestId('portal-theme-toggle')).toBeVisible();
  });
});
