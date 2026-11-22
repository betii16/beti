// MapLibre charge son worker par une adresse : le site sert une copie du fichier
// (public/maplibre-gl-worker.mjs, voir src/components/live-map.tsx). Après une mise
// à jour de maplibre-gl, la copie doit suivre, sinon la carte reste vide.

import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

it('le worker servi par le site est celui de la version installée de maplibre-gl', () => {
  const served = readFileSync('public/maplibre-gl-worker.mjs')
  const installed = readFileSync('node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs')
  // Si ce test échoue : copier le second fichier sur le premier.
  expect(served.equals(installed)).toBe(true)
})
