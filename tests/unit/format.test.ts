import { describe, it, expect } from 'vitest'
import { formatDA, formatNumber, hasAmount, categoryLabel } from '@/lib/format'

const norm = (s: string) => s.replace(/[  ]/g, ' ')

describe('hasAmount', () => {
  it.each([[null], [undefined], [0], [-5], [NaN], ['abc'], ['0'], [Infinity]])('faux pour %s', v => expect(hasAmount(v)).toBe(false))
  it.each([[1], [2500], ['3000'], [0.5]])('vrai pour %s', v => expect(hasAmount(v)).toBe(true))
})

describe('formatNumber', () => {
  it('sépare les milliers en français', () => {
    expect(norm(formatNumber(12500, 'fr'))).toBe('12 500')
  })
  it('limite à 2 décimales', () => {
    expect(formatNumber(1.23456, 'fr')).toBe('1,23')
  })
  it('jamais d’espace fine U+202F', () => {
    expect(formatNumber(1234567, 'fr')).not.toContain(' ')
  })
  it('arabe : non vide', () => {
    expect(formatNumber(3000, 'ar').length).toBeGreaterThan(0)
  })
})

describe('formatDA', () => {
  it('FR : suffixe DA', () => expect(norm(formatDA(12500))).toBe('12 500 DA'))
  it('AR : suffixe دج', () => expect(formatDA(3000, 'ar').endsWith(' دج')).toBe(true))
  it('accepte une chaîne numérique', () => expect(norm(formatDA('2500'))).toBe('2 500 DA'))
  it.each([[null], [undefined], [0], [-100], ['x']])('jamais « 0 DA » pour %s', v => {
    expect(formatDA(v as never)).toBe('—')
  })
  it('repli personnalisé', () => expect(formatDA(0, 'fr', 'Sur devis')).toBe('Sur devis'))
})

describe('categoryLabel', () => {
  it('slug connu FR / AR', () => {
    expect(categoryLabel('plomberie', 'fr')).toBe('Plomberie')
    expect(categoryLabel('plomberie', 'ar')).toBe('السباكة')
  })
  it('slug inconnu : lisible et capitalisé', () => {
    expect(categoryLabel('travaux-de_toiture', 'fr')).toBe('Travaux de toiture')
  })
  it('vide / null / espaces : Autre', () => {
    expect(categoryLabel('', 'fr')).toBe('Autre')
    expect(categoryLabel(null, 'fr')).toBe('Autre')
    expect(categoryLabel('   ', 'ar')).toBe('أخرى')
  })
})
