// Aucun message SQL brut à l'écran : chaque code levé par la base doit être
// reconnu par errorCode() et avoir sa phrase en français et en arabe.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { ar } from '@/i18n/dictionaries/ar'
import { fr } from '@/i18n/dictionaries/fr'
import { ERROR_CODES, errorCode } from '@/lib/errors'

const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations')
const sqlCodes = [
  ...new Set(
    readdirSync(MIGRATIONS).flatMap(file =>
      [...readFileSync(join(MIGRATIONS, file), 'utf8').matchAll(/raise exception '([a-z_]+)'/g)].map(m => m[1]),
    ),
  ),
]
// Levé par un déclencheur que l'API ne peut pas atteindre : elle n'a aucun droit d'écriture sur audit_log.
const INTERNAL = ['audit_log_append_only']

afterEach(() => {
  vi.restoreAllMocks()
})

it('chaque code levé par le SQL est reconnu', () => {
  expect(sqlCodes.length).toBeGreaterThan(40)
  const unknown = sqlCodes.filter(c => !INTERNAL.includes(c) && errorCode({ message: c, code: 'P0001' }) === 'unknown')
  expect(unknown).toEqual([])
})

it('chaque code de l’application existe vraiment dans le SQL', () => {
  // Une faute de frappe dans ERROR_CODES donnerait un message que personne ne verrait jamais.
  // Les seuls codes qui ne viennent pas du SQL : ceux du service d'authentification et du réseau.
  expect(ERROR_CODES.filter(c => !sqlCodes.includes(c))).toEqual([
    'email_invalid',
    'email_not_deliverable',
    'code_invalid',
    'code_rate_limited',
    'network',
    'unknown',
  ])
})

it('chaque code a sa phrase en français et en arabe', () => {
  for (const code of ERROR_CODES) {
    expect(fr.errors[code], code).toMatch(/^[A-ZÉ].+\.$/)
    expect(ar.errors[code], code).toMatch(/[؀-ۿ]{3}/)
  }
})

it('range les erreurs qui ne viennent pas de nos fonctions, et consigne l’inconnu', () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(errorCode({ message: 'invalid_bio', code: 'P0001' })).toBe('invalid_input')
  expect(errorCode({ message: 'permission denied for function save_profile', code: '42501' })).toBe('not_authenticated')
  expect(errorCode({ message: 'JWT expired', code: 'PGRST303' })).toBe('not_authenticated')
  expect(errorCode({ message: 'TypeError: fetch failed', code: '' })).toBe('network')
  expect(log).not.toHaveBeenCalled()

  expect(errorCode({ message: 'duplicate key value violates unique constraint "x"', code: '23505' })).toBe('unknown')
  expect(errorCode(null)).toBe('unknown')
  expect(log).toHaveBeenCalledTimes(2)
})
