import { expect, it } from 'vitest'
import { fitWithin, MAX_SIDE } from '@/lib/photos'

it('ramène une photo à 1600 pixels au plus sur son côté le plus long, sans l’agrandir', () => {
  expect(fitWithin(4000, 3000)).toEqual({ width: MAX_SIDE, height: 1200 })
  expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: MAX_SIDE })
  expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
  expect(fitWithin(10000, 1)).toEqual({ width: MAX_SIDE, height: 1 })
})
