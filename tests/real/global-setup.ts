// Pose l'identifiant d'execution (partage avec les workers) et balaie en fin de run.
import { loadTestEnv } from '../../scripts/lib/test-env.cjs'

export default async function globalSetup() {
  loadTestEnv() // refuse la production ou une config incomplete (exit 1)
  process.env.BETI_RUN_ID = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  // Le balayage de fin d'execution est dans global-teardown.ts
  return async () => {
    const { sweepRun } = await import('./fixtures')
    const n = await sweepRun()
    if (n > 0) console.warn(`[cleanup] ${n} compte(s) de test restant(s) supprime(s) par le balayage final.`)
  }
}
