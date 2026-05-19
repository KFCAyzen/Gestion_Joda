import { test, expect } from '@playwright/test';

test.describe('MODULE 22 — Cron et automatisations', () => {
  test('TC-CRON-001 — Endpoint check-late-payments existe', async ({ request }) => {
    const response = await request.get('/api/cron/check-late-payments');
    expect([200, 401, 403, 405, 500]).toContain(response.status());
  });

  test('TC-CRON-002 — Endpoint newsletter-auto existe', async ({ request }) => {
    const response = await request.post('/api/cron/newsletter-auto');
    expect([200, 401, 403, 405, 500]).toContain(response.status());
  });
});
