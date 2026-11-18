import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    testTimeout: 30_000,
    // Chaque fichier de tests/db compile son Postgres embarqué (WebAssembly). En
    // parallèle, un processus tombe en « out of memory » dès que la machine a peu de
    // mémoire libre : à six de front le 2026-11-15, à trois le 2026-11-18 (5 Go
    // libres). Un fichier à la fois : une vingtaine de secondes, et ça tient.
    maxWorkers: 1,
    // La base embarquée met quelques secondes à démarrer et à jouer les migrations.
    hookTimeout: 120_000,
  },
})
