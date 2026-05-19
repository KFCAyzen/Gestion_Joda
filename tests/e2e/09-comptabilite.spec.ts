import { test, expect } from '../fixtures/authenticated';
import { supabaseAdmin, TEST_PREFIX } from '../helpers/supabase-admin';
import { clickSidebarNav } from '../helpers/sidebar-nav';

test.describe('MODULE 9 — Comptabilité', () => {
  test('TC-COMPT-001 — Page comptabilité accessible (admin)', async ({ adminPage }) => {
    await adminPage.goto('/fr/comptabilite');
    await expect(adminPage).toHaveURL(/\/comptabilite/);
    await expect(adminPage.getByTestId('page-title')).toBeVisible();
  });

  test('TC-COMPT-001b — Nav sidebar vers comptabilité', async ({ adminPage }) => {
    await adminPage.goto('/fr/tableau-de-bord');
    await clickSidebarNav(adminPage, 'comptabilite');
    await expect(adminPage).toHaveURL(/\/comptabilite/, { timeout: 10_000 });
  });

  test('TC-COMPT-001-DB — Insertion entrée comptable via admin client', async () => {
    const sb = supabaseAdmin();
    const description = `${TEST_PREFIX}entree_${Date.now()}`;
    const { data, error } = await sb
      .from('entrees_comptables')
      .insert({
        description,
        montant: 50_000,
        type: 'revenus_divers',
        date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.description).toBe(description);
    if (data?.id) await sb.from('entrees_comptables').delete().eq('id', data.id);
  });
});
