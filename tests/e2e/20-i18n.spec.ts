import { test, expect } from '@playwright/test';

test.describe('MODULE 20 — Internationalisation et thème (page login)', () => {
  test('TC-I18N-001 — Basculement FR → EN via lang-switcher', async ({ page }) => {
    await page.goto('/fr/login');
    await expect(page.getByTestId('lang-switcher')).toBeVisible();
    await page.getByTestId('lang-switcher').click();
    await page.getByTestId('lang-option-en').click();
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test('TC-I18N-002 — Basculement thème light/dark via theme-toggle', async ({ page }) => {
    await page.goto('/fr/login');
    const initialClass = await page.locator('html').getAttribute('class');
    await page.getByTestId('theme-toggle').click();
    await page.waitForTimeout(800);
    const afterClass = await page.locator('html').getAttribute('class');
    expect(afterClass).not.toBe(initialClass);
  });
});
