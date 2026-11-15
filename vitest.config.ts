import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    testTimeout: 30_000,
    // Chaque fichier de tests/db compile son Postgres embarqué (WebAssembly). À six
    // en même temps, un processus tombait parfois en « out of memory » (2026-11-15).
    maxWorkers: 3,
    // La base embarquée met quelques secondes à démarrer et à jouer les migrations.
    hookTimeout: 120_000,
  },
})
