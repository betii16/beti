// Icônes du site et de l'appli installée, au logo « Le bloc » : « be / ti » en Unbounded noir
// sur le dégradé Pétale ; en tout petit (onglet du navigateur), le « b » seul.
// À relancer chaque fois que le logo change : node scripts/make-icons.mjs
// (next/og vient avec Next ; tests/unit/manifest.test.ts vérifie les fichiers produits.)

import { writeFileSync } from 'node:fs'
import { ImageResponse } from 'next/og.js'
import { createElement as h } from 'react'

// La police du logo, demandée à Google Fonts pour les seules lettres utiles (TTF : next/og ne lit pas le woff2).
const css = await (await fetch('https://fonts.googleapis.com/css2?family=Unbounded:wght@800&text=beti')).text()
const fontUrl = css.match(/src: url\(([^)]+)\) format\('(?:truetype|opentype)'\)/)?.[1]
if (!fontUrl) throw new Error(`Google Fonts n'a pas rendu Unbounded en TTF : ${css.slice(0, 200)}`)
const unbounded = await (await fetch(fontUrl)).arrayBuffer()

// La même couleur à opacité nulle plutôt que « transparent » : next/og mélangerait sinon avec du noir (fond terne).
const PETALE =
  'radial-gradient(circle at 12% 12%, #ffc2d1 0%, rgba(255, 194, 209, 0) 58%), radial-gradient(circle at 88% 88%, #e0c3fc 0%, rgba(224, 195, 252, 0) 58%)'

/** round : coins arrondis et fond transparent autour ; sans lui, plein cadre (Android et iOS découpent eux-mêmes). */
async function icon(path, size, { lines = ['be', 'ti'], scale = 0.3, round = false } = {}) {
  const fontSize = Math.round(size * scale)
  const image = new ImageResponse(
    h(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffe3d3',
          backgroundImage: PETALE,
          borderRadius: round ? Math.round(size * 0.225) : 0,
        },
      },
      h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            fontFamily: 'Unbounded',
            fontSize,
            lineHeight: 0.92,
            letterSpacing: -0.03 * fontSize,
            color: '#111111',
            textShadow: `0 0 ${Math.round(fontSize * 0.12)}px rgba(255, 255, 255, 0.6)`,
          },
        },
        ...lines.map(line => h('div', { key: line }, line)),
      ),
    ),
    { width: size, height: size, fonts: [{ name: 'Unbounded', data: unbounded, weight: 800, style: 'normal' }] },
  )
  writeFileSync(path, Buffer.from(await image.arrayBuffer()))
}

await icon('public/icon-192.png', 192, { round: true })
await icon('public/icon-512.png', 512, { round: true })
// Les masques d'Android gardent le cercle central (80 %) : le bloc y tient avec de la marge.
await icon('public/icon-maskable-512.png', 512, { scale: 0.24 })
// Icône de l'écran d'accueil d'iOS et icône des onglets : Next les relie seul depuis le dossier de la page.
await icon('src/app/[lang]/apple-icon.png', 180)
await icon('src/app/[lang]/icon.png', 64, { lines: ['b'], scale: 0.72, round: true })
console.log('icônes écrites')
