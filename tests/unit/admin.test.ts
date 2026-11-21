import { expect, it } from 'vitest'
import { containsPattern, searchText } from '@/lib/admin/search'

it('nettoie le texte cherché et prend les jokers à la lettre', () => {
  expect(searchText('  Karim ')).toBe('Karim')
  expect(searchText(undefined)).toBe('')
  expect(searchText(['a', 'b'])).toBe('')
  expect(searchText('x'.repeat(100))).toHaveLength(60)
  expect(containsPattern('Karim')).toBe('%Karim%')
  expect(containsPattern('50%_off')).toBe('%50\\%\\_off%')
  expect(containsPattern('a\\b')).toBe('%a\\\\b%')
})
