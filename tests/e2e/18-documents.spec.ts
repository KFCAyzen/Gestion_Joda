import { test, expect } from '../fixtures/authenticated';
import { supabaseAdmin, TEST_PREFIX } from '../helpers/supabase-admin';

test.describe('MODULE 18 — Gestion documents (staff)', () => {
  test('TC-DOC-001-DB — Création document via admin client', async () => {
    const sb = supabaseAdmin();
    const { data: student } = await sb
      .from('students')
      .select('id')
      .like('email', `${TEST_PREFIX}%`)
      .maybeSingle();

    if (!student) {
      test.skip(true, 'Aucun étudiant de test en base');
      return;
    }

    const url = `https://example.com/${TEST_PREFIX}passeport_${Date.now()}.pdf`;
    const { data, error } = await sb
      .from('documents')
      .insert({
        student_id: student.id,
        type: 'passeport',
        url,
        status: 'en_attente',
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.status).toBe('en_attente');

    if (data?.id) {
      const { error: updateError } = await sb
        .from('documents')
        .update({ status: 'valide' })
        .eq('id', data.id);
      expect(updateError).toBeNull();
      await sb.from('documents').delete().eq('id', data.id);
    }
  });
});
