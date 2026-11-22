// Les filtres de recherche viennent de l'adresse, donc du visiteur.

import { expect, it } from 'vitest'
import { parseSearch, searchQuery, type SearchFilters } from '@/domain/search'

it('lit des filtres valides', () => {
  expect(parseSearch({ categorie: 'plomberie', wilaya: '16', q: '  fuite ', page: '3' })).toEqual({
    categorie: 'plomberie',
    wilaya: 16,
    q: 'fuite',
    page: 3,
  })
})

it('ignore ce qui n’est pas valide au lieu de le transmettre à la base', () => {
  expect(parseSearch({})).toEqual({ page: 1 })
  expect(parseSearch({ categorie: 'pirate', wilaya: '59', q: '   ', page: '0' })).toEqual({ page: 1 })
  expect(parseSearch({ categorie: ['plomberie', 'peinture'], wilaya: '16; drop table', q: ['a', 'b'], page: 'abc' })).toEqual({
    page: 1,
  })
  expect(parseSearch({ wilaya: '', q: 'x'.repeat(61), page: '201' })).toEqual({ page: 1 })
  for (const pres of ['36.75', '36.75,abc', '36.75,3.06,1', '91,3', '36.75,181', ',', '36.75,', ' 36.75,3.06', '1e1,3', ['36.75,3.06', '1,1']]) {
    expect(parseSearch({ pres }), String(pres)).toEqual({ page: 1 })
  }
})

it('écrit une adresse que la lecture retrouve à l’identique', () => {
  expect(searchQuery({ page: 1 })).toBe('')
  expect(searchQuery({ categorie: 'peinture', page: 1 })).toBe('?categorie=peinture')
  const filters: SearchFilters = { categorie: 'serrurerie', wilaya: 31, q: 'porte blindée & clés', pres: [36.75, -1.5], page: 4 }
  const back = Object.fromEntries(new URLSearchParams(searchQuery(filters)))
  expect(parseSearch(back)).toEqual(filters)
})
