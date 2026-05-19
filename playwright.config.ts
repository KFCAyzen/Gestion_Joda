import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';

loadEnv({ path: path.resolve(__dirname, '.env.local') });

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './tests/.artifacts',
  timeout: 120_000,
  expect: { timeout: 10_000 },

  fullyParallel: false,
  workers: 1,
  // 1 retry par défaut : absorbe les rares flakys (animation sidebar, race conditions),
  // sans masquer les vrais bugs (un test qui échoue 2× est un vrai échec).
  retries: 1,
  forbidOnly: !!process.env.CI,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/.report', open: 'never' }],
    ['json', { outputFile: 'tests/.report/results.json' }],
  ],

  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),

  use: {
    baseURL: BASE_URL,
    locale: 'fr-FR',
    timezoneId: 'Africa/Douala',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Mode build pour stabilité : pas de recompilation Turbopack à chaud.
  // Override avec `E2E_DEV=1` pour utiliser `next dev` (itération rapide pendant le dev des tests).
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : process.env.E2E_DEV === '1'
      ? {
          command: 'npm run dev',
          url: BASE_URL,
          reuseExistingServer: true,
          timeout: 180_000,
          stdout: 'ignore',
          stderr: 'pipe',
        }
      : {
          command: 'npm run start',
          url: BASE_URL,
          reuseExistingServer: true,
          timeout: 180_000,
          stdout: 'ignore',
          stderr: 'pipe',
        },
});
