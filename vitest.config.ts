import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    testTimeout: 30_000,
    // La base embarquée met quelques secondes à démarrer et à jouer les migrations.
    hookTimeout: 120_000,
  },
})
