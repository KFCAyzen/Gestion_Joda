import { Page, expect } from '@playwright/test';

/**
 * Mapping nav item → section parente (cf. src/app/[locale]/(app)/layout.tsx).
 * Permet d'ouvrir la bonne section avant de cliquer sur un item enfant car
 * seules les 3 premières sections sont ouvertes au démarrage de l'AppShell.
 */
const NAV_TO_SECTION: Record<string, string> = {
  home: 'pilotage',
  performance: 'pilotage',
  reservations: 'operations',
  clients: 'operations',
  dossiers: 'operations',
  com: 'communication',
  newsletter: 'communication',
  chambres: 'ressources',
  facturation: 'ressources',
  cours_langues: 'ressources',
  comptabilite: 'finance',
  hr: 'rh',
  users: 'administration',
  activity_logs: 'administration',
  fee_config: 'administration',
  storage: 'systeme',
};

/**
 * Clique sur un item de navigation de la sidebar (`nav-${id}`), en ouvrant
 * d'abord la section parente si elle est repliée.
 */
export async function clickSidebarNav(page: Page, navId: string): Promise<void> {
  const sectionId = NAV_TO_SECTION[navId];
  const navBtn = page.getByTestId(`nav-${navId}`);

  // 1. S'assurer que la sidebar est rendue (attendre une section header au moins)
  if (sectionId) {
    const sectionHeader = page.getByTestId(`sidebar-section-${sectionId}`);
    await sectionHeader.waitFor({ state: 'visible', timeout: 15_000 });

    // 2. Si le bouton de nav n'est pas visible après 1s, c'est que la section est repliée
    //    → ouvrir la section en cliquant le header puis laisser l'animation se faire.
    const visible = await navBtn.isVisible({ timeout: 1_000 }).catch(() => false);
    if (!visible) {
      await sectionHeader.click();
      // Petite pause pour laisser l'animation d'expand se terminer avant le clic suivant.
      await page.waitForTimeout(300);
    }
  }

  // 3. Attendre que le bouton soit visible, stable, puis cliquer.
  await navBtn.waitFor({ state: 'visible', timeout: 10_000 });
  await navBtn.scrollIntoViewIfNeeded();
  await navBtn.click();
}

/**
 * Vérifie que l'item de navigation n'est PAS accessible (pour les tests RBAC).
 * Doit ouvrir la section parente pour s'assurer qu'il est vraiment absent.
 */
export async function expectNavHidden(page: Page, navId: string): Promise<void> {
  const sectionId = NAV_TO_SECTION[navId];
  if (sectionId) {
    const sectionHeader = page.getByTestId(`sidebar-section-${sectionId}`);
    if (await sectionHeader.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sectionHeader.click();
      await page.waitForTimeout(200);
    }
  }
  await expect(page.getByTestId(`nav-${navId}`)).toHaveCount(0);
}
