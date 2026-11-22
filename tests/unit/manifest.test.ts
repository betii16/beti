// Fiche d'installation de l'appli (public/site.webmanifest) : chaque icône qu'elle
// annonce existe, à la taille annoncée. Les icônes sont produites par scripts/make-icons.mjs.

import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

const manifest = JSON.parse(readFileSync('public/site.webmanifest', 'utf8')) as {
  start_url: string
  icons: { src: string; sizes: string; purpose: string }[]
}

it('les icônes annoncées existent, à la bonne taille', () => {
  expect(manifest.icons.map(icon => icon.purpose).sort()).toEqual(['any', 'any', 'maskable'])
  for (const icon of manifest.icons) {
    const file = readFileSync(`public${icon.src}`)
    // Un PNG donne sa largeur et sa hauteur aux octets 16 à 23.
    expect(`${file.readUInt32BE(16)}x${file.readUInt32BE(20)}`, icon.src).toBe(icon.sizes)
  }
})

it('l’appli installée s’ouvre sur l’accueil, que le proxy envoie vers la bonne langue', () => {
  expect(manifest.start_url).toBe('/')
})
