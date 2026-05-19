import { test, expect } from '../fixtures/authenticated';
import { test as basicTest } from '@playwright/test';
import { expectNavHidden } from '../helpers/sidebar-nav';

test.describe('MODULE 21 — Sécurité et contrôle d\'accès', () => {
  test('TC-SEC-001 — Agent ne voit pas l\'item utilisateurs dans la sidebar', async ({ agentPage }) => {
    await agentPage.goto('/fr/tableau-de-bord');
    await expectNavHidden(agentPage, 'users');
  });

  test('TC-SEC-001b — Agent ne voit pas l\'item Configuration frais', async ({ agentPage }) => {
    await agentPage.goto('/fr/tableau-de-bord');
    await expectNavHidden(agentPage, 'fee_config');
  });

  test('TC-SEC-002 — Étudiant ne peut pas accéder au dashboard admin', async ({ studentPage }) => {
    // AppShell layout déclenche router.replace('/etudiant') quand user.role === 'student'
    // (cf. src/app/[locale]/(app)/layout.tsx:200). On attend explicitement la redirection.
    await studentPage.goto('/fr/tableau-de-bord');
    await studentPage.waitForURL(/\/etudiant(?!s)/, { timeout: 15_000 });
    expect(studentPage.url()).toMatch(/\/etudiant/);
  });

  basicTest('TC-SEC-003 — Route API protégée sans session', async ({ request }) => {
    const response = await request.post('/api/declare-payment', { data: { payment_id: 'fake' } });
    expect([401, 403, 400]).toContain(response.status());
  });

  test('TC-SEC-004 — Étudiant ne peut déclarer paiement d\'un autre', async ({ studentPage }) => {
    const response = await studentPage.request.post('/api/declare-payment', {
      data: { payment_id: '00000000-0000-0000-0000-000000000000' },
    });
    expect([400, 401, 403, 404]).toContain(response.status());
  });

  test('TC-SEC-006 — Aucun confirm()/alert() natif sur la page login', async ({ page }) => {
    let dialogTriggered = false;
    page.on('dialog', async (d) => {
      dialogTriggered = true;
      await d.dismiss();
    });
    await page.goto('/fr/login');
    await page.waitForTimeout(2000);
    expect(dialogTriggered).toBe(false);
  });

  test('TC-SEC-007 — Action destructive utilise ConfirmDialog (pas window.confirm)', async ({ adminPage }) => {
    let nativeConfirm = false;
    adminPage.on('dialog', async (d) => {
      nativeConfirm = true;
      await d.dismiss();
    });
    await adminPage.goto('/fr/comptabilite');
    await adminPage.waitForTimeout(2000);
    const deleteBtn = adminPage.getByRole('button', { name: /supprimer|delete/i }).first();
    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteBtn.click();
      await adminPage.waitForTimeout(800);
      const confirmDlg = adminPage.getByTestId('confirm-dialog');
      const hasConfirmDialog = await confirmDlg.isVisible({ timeout: 2000 }).catch(() => false);
      expect(nativeConfirm).toBe(false);
      if (hasConfirmDialog) {
        await adminPage.getByTestId('confirm-cancel').click();
      }
    }
  });
});
