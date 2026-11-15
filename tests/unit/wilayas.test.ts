// La liste est positionnelle (ligne n = wilaya n) : une ligne ajoutée, retirée ou
// déplacée décalerait tous les noms. Quelques repères connus le détectent.

import { expect, it } from 'vitest'
import { wilayaName, wilayas } from '@/domain/wilayas'

it('58 wilayas, chacune nommée une seule fois en français et en arabe', () => {
  expect(wilayas).toHaveLength(58)
  for (const w of wilayas) {
    expect(w.fr).toMatch(/^[A-Z]/)
    expect(w.ar).toMatch(/^[؀-ۿ ]+$/)
  }
  expect(new Set(wilayas.map(w => w.fr)).size).toBe(58)
  expect(new Set(wilayas.map(w => w.ar)).size).toBe(58)
})

it('le numéro donne la bonne wilaya', () => {
  expect(wilayaName(1, 'fr')).toBe('Adrar')
  expect(wilayaName(16, 'fr')).toBe('Alger')
  expect(wilayaName(16, 'ar')).toBe('الجزائر')
  expect(wilayaName(31, 'fr')).toBe('Oran')
  expect(wilayaName(48, 'fr')).toBe('Relizane')
  expect(wilayaName(58, 'fr')).toBe('El Meniaa')
  expect(wilayaName(0, 'fr')).toBeUndefined()
  expect(wilayaName(59, 'ar')).toBeUndefined()
})
