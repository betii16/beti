import { expect, it } from 'vitest'
import { href, switchLocalePath } from '@/i18n/config'

it('préfixe un chemin interne par la langue', () => {
  expect(href('fr')).toBe('/fr')
  expect(href('ar', '/recherche')).toBe('/ar/recherche')
})

it('garde la page en changeant de langue', () => {
  expect(switchLocalePath('/fr', 'ar')).toBe('/ar')
  expect(switchLocalePath('/fr/recherche', 'ar')).toBe('/ar/recherche')
  expect(switchLocalePath('/ar/artisans/alger', 'fr')).toBe('/fr/artisans/alger')
  // Seul le premier segment est la langue : un « fr » plus loin dans l'adresse ne bouge pas.
  expect(switchLocalePath('/ar/fr', 'fr')).toBe('/fr/fr')
})
