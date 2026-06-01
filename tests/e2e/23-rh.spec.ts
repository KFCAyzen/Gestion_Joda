import { test, expect } from '../fixtures/authenticated';
import { test as basicTest } from '@playwright/test';
import { supabaseAdmin, TEST_PREFIX } from '../helpers/supabase-admin';
import { clickSidebarNav, expectNavHidden } from '../helpers/sidebar-nav';

/**
 * MODULE 23 — Ressources humaines (RH / paie)
 *
 * Couvre le module `/rh` (composant HRManagement, section sidebar `rh`,
 * API `/api/hr/*`). Le module est réservé aux rôles supervisor / admin /
 * super_admin (cf. layout.tsx section `rh` + ProtectedRoute requiredRole="supervisor").
 */
test.describe('MODULE 23 — Ressources humaines', () => {
  test('TC-RH-001 — Page RH accessible (admin)', async ({ adminPage }) => {
    await adminPage.goto('/fr/rh');
    await expect(adminPage).toHaveURL(/\/rh/);
    await expect(adminPage.getByTestId('page-title')).toBeVisible();
  });

  test('TC-RH-001b — Nav sidebar vers RH (admin)', async ({ adminPage }) => {
    await adminPage.goto('/fr/tableau-de-bord');
    await clickSidebarNav(adminPage, 'hr');
    await expect(adminPage).toHaveURL(/\/rh/, { timeout: 10_000 });
  });

  test('TC-RH-002 — Superviseur accède au module RH', async ({ supervisorPage }) => {
    await supervisorPage.goto('/fr/tableau-de-bord');
    await clickSidebarNav(supervisorPage, 'hr');
    await expect(supervisorPage).toHaveURL(/\/rh/, { timeout: 10_000 });
    await expect(supervisorPage.getByTestId('page-title')).toBeVisible();
  });

  test('TC-RH-003 — Agent ne voit pas le module RH (RBAC)', async ({ agentPage }) => {
    await agentPage.goto('/fr/tableau-de-bord');
    await expectNavHidden(agentPage, 'hr');
  });

  test('TC-RH-004-DB — Insertion employé via admin client', async () => {
    const sb = supabaseAdmin();
    const nom = `${TEST_PREFIX}Employe_${Date.now()}`;
    const { data, error } = await sb
      .from('employees')
      .insert({
        nom,
        prenom: 'Test',
        poste: 'Agent de test',
        date_embauche: new Date().toISOString().slice(0, 10),
        salaire_base: 150_000,
        statut: 'actif',
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.nom).toBe(nom);
    if (data?.id) await sb.from('employees').delete().eq('id', data.id);
  });

  test('TC-RH-005-DB — Génération fiche de paie liée à un employé', async () => {
    const sb = supabaseAdmin();
    const nom = `${TEST_PREFIX}Paie_${Date.now()}`;

    const { data: emp, error: empErr } = await sb
      .from('employees')
      .insert({
        nom,
        prenom: 'Salaire',
        poste: 'Comptable',
        date_embauche: new Date().toISOString().slice(0, 10),
        salaire_base: 200_000,
        statut: 'actif',
      })
      .select('id')
      .single();
    expect(empErr).toBeNull();

    const now = new Date();
    const { data: slip, error: slipErr } = await sb
      .from('payslips')
      .insert({
        employee_id: emp!.id,
        mois: now.getMonth() + 1,
        annee: now.getFullYear(),
        salaire_base: 200_000,
        primes: 0,
        deductions: 0,
        jours_absences: 0,
        net_a_payer: 200_000,
      })
      .select()
      .single();
    expect(slipErr).toBeNull();
    expect(slip?.net_a_payer).toBe(200_000);

    // Nettoyage : fiche de paie puis employé.
    if (slip?.id) await sb.from('payslips').delete().eq('id', slip.id);
    if (emp?.id) await sb.from('employees').delete().eq('id', emp.id);
  });

  basicTest('TC-RH-006 — API generate-payslips protégée sans session', async ({ request }) => {
    const response = await request.post('/api/hr/generate-payslips', { data: {} });
    expect([401, 403]).toContain(response.status());
  });

  basicTest('TC-RH-007 — API publique verify rejette des paramètres invalides', async ({ request }) => {
    const response = await request.post('/api/hr/public/verify', {
      data: { employee_id: 'not-a-uuid' },
    });
    expect([400, 401]).toContain(response.status());
  });
});
