// Tout ce que la connexion reçoit du visiteur : adresse, code, page de retour.

import { expect, it } from 'vitest'
import { isValidEmail, normalizeCode, normalizeEmail, safeNext, suggestEmail } from '@/lib/auth/input'

it('nettoie et contrôle une adresse e-mail', () => {
  expect(normalizeEmail('  Karim.B @Gmail.COM ')).toBe('karim.b@gmail.com')
  expect(isValidEmail('karim.b@gmail.com')).toBe(true)
  expect(isValidEmail('k@poste.dz')).toBe(true)
  for (const bad of ['', 'karim', 'karim@', '@gmail.com', 'karim@gmail', 'karim@@gmail.com', 'karim@gmail..com', `${'x'.repeat(250)}@a.dz`]) {
    expect(isValidEmail(bad), bad).toBe(false)
  }
})

it('propose la bonne adresse quand le domaine est une faute de frappe courante', () => {
  expect(suggestEmail('karim@gmial.com')).toBe('karim@gmail.com')
  expect(suggestEmail('karim@hotmail.con')).toBe('karim@hotmail.com')
  expect(suggestEmail('karim@gmail.com')).toBeNull()
  expect(suggestEmail('karim')).toBeNull()
})

it('n’accepte qu’un code de six chiffres', () => {
  expect(normalizeCode('123456')).toBe('123456')
  expect(normalizeCode(' 123 456 ')).toBe('123456')
  expect(normalizeCode('١٢٣٤٥٦')).toBe('123456')
  for (const bad of ['', '12345', '1234567', '12345a', '12 34', '１２３４５６', '123456; drop']) {
    expect(normalizeCode(bad), bad).toBeNull()
  }
})

it('ne renvoie après connexion que vers une page du site', () => {
  for (const ok of ['/fr', '/ar', '/fr/compte', '/ar/artisans/00000000-0000-4000-8000-000000000001/demande', '/fr/recherche?categorie=plomberie&wilaya=16']) {
    expect(safeNext(ok), ok).toBe(ok)
  }
  for (const bad of [
    null,
    undefined,
    '',
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '/\t/evil.com',
    '/fr\n/evil.com',
    '/compte',
    '/en/compte',
    '/français',
    '/fr.evil.com',
    'fr/compte',
    'javascript:alert(1)',
    '/fr/connexion',
    '/ar/connexion?next=/ar/compte',
    `/fr/${'x'.repeat(2100)}`,
  ]) {
    expect(safeNext(bad), String(bad)).toBe('')
  }
})
