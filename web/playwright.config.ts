import { defineConfig, devices } from '@playwright/test';

const authenticatedSupabaseUrl = process.env.E2E_SUPABASE_URL;
const authenticatedSupabaseKey = process.env.E2E_SUPABASE_PUBLISHABLE_KEY;

export default defineConfig({
  testDir: './tests/e2e',
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 4173',
    url: 'http://localhost:4173',
    env: {
      VITE_SUPABASE_URL: authenticatedSupabaseUrl ?? 'http://127.0.0.1:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: authenticatedSupabaseKey ?? 'playwright-public-test-key',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
