import { defineConfig, devices } from '@playwright/test'

// Supabase factice : tout appel réseau est intercepté par page.route dans les tests.
const PORT = 3100

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx next dev --webpack -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-factice',
      NEXT_PUBLIC_LAUNCH_DATE: '2099-01-01T00:00:00Z', // période gratuite : tous les artisans listés
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
})
