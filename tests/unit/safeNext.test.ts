import { describe, it, expect } from 'vitest'
import { safeNext } from '@/lib/safeNext'

describe('safeNext', () => {
  it.each(['/map', '/recherche?q=plombier&wilaya=16', '/artisan/abc-123#avis', '/mon-espace'])('accepte le chemin interne %s', p => {
    expect(safeNext(p)).toBe(p)
  })
  it.each([
    ['//evil.com'], ['///evil.com'], ['/\\evil.com'], ['\\\\evil.com'], ['https://evil.com'],
    ['http://evil.com/x'], ['javascript:alert(1)'], ['evil.com'], ['map'], ['/auth/login'], ['/auth/register?x=1'],
    ['/\t/evil.com'], ['/\n/evil.com'], ['/\r/evil.com'], ['/\u0000/evil.com'],
  ])('refuse %j', p => {
    expect(safeNext(p)).toBe('')
  })
  it('renvoie vide pour null, undefined et chaîne vide', () => {
    expect(safeNext(null)).toBe('')
    expect(safeNext(undefined)).toBe('')
    expect(safeNext('')).toBe('')
  })
  it('refuse une valeur démesurée', () => {
    expect(safeNext('/' + 'a'.repeat(5000))).toBe('')
  })
  it('un chemin encodé %2f%2f reste un chemin interne (non décodé par le navigateur)', () => {
    expect(safeNext('/%2f%2fevil.com')).toBe('/%2f%2fevil.com')
    expect(safeNext('%2f%2fevil.com')).toBe('')
  })
  it('accepte /authors mais pas /auth/', () => {
    expect(safeNext('/authors')).toBe('/authors')
    expect(safeNext('/auth')).toBe('/auth')
  })
})
