import { defineConfig, devices } from '@playwright/test'
import { loadTestEnv } from '../../scripts/lib/test-env.cjs'

// Garde-fou : quitte immediatement si .env.test.local manque, est incomplet ou vise la production.
const env = loadTestEnv() as { url: string; anonKey: string; serviceKey: string }
const PORT = 3200

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts/,
  globalSetup: './global-setup.ts',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: '../../test-results/real',
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Desktop Chrome'],
    // Pas de trace/video/capture : elles pourraient contenir des jetons de session.
    trace: 'off', video: 'off', screenshot: 'off',
  },
  webServer: {
    command: `npx next dev --webpack -p ${PORT}`,
    cwd: '../..',
    url: `http://localhost:${PORT}`,
    // Jamais de serveur deja lance : il pourrait pointer vers la production.
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: env.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: env.anonKey,
      SUPABASE_SERVICE_ROLE_KEY: env.serviceKey, // route /api/account/delete (serveur uniquement)
      NEXT_PUBLIC_LAUNCH_DATE: '2099-01-01T00:00:00Z',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
})
