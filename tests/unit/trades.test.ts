// Un mot de métier tapé seul dans la recherche choisit le métier (src/domain/trades.ts).

import { expect, it } from 'vitest'
import { TRADE_WORD_COUNT, TRADE_WORDS, tradeFromQuery } from '@/domain/trades'

it('reconnaît un métier, sans accents, majuscules ni voyelles arabes', () => {
  expect(tradeFromQuery('plombier')).toBe('plomberie')
  expect(tradeFromQuery('  Plombier ')).toBe('plomberie')
  expect(tradeFromQuery('electricien')).toBe('electricite')
  expect(tradeFromQuery('ÉLECTRICIEN')).toBe('electricite')
  expect(tradeFromQuery('سبّاك')).toBe('plomberie')
  expect(tradeFromQuery('اقفال')).toBe('serrurerie')
  expect(tradeFromQuery('femme  de  ménage')).toBe('menage')
})

it('ne choisit rien pour un autre mot, ni pour une phrase', () => {
  expect(tradeFromQuery('chauffe-eau')).toBeUndefined()
  expect(tradeFromQuery('plombier chauffe-eau')).toBeUndefined()
  expect(tradeFromQuery('')).toBeUndefined()
  expect(tradeFromQuery(undefined)).toBeUndefined()
})

it('un mot ne désigne qu’un seul métier', () => {
  expect(TRADE_WORDS.size).toBe(TRADE_WORD_COUNT)
})
