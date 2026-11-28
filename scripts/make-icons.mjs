// Icônes du site, de l'appli installée et de l'appli native, au logo « Le bloc » : « be / ti » en
// Unbounded noir sur le dégradé Pétale ; en tout petit (onglet du navigateur), le « b » seul.
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

/**
 * round : coins arrondis et fond transparent autour ; sans lui, plein cadre (Android et iOS découpent eux-mêmes).
 * fond : « petale » (le dégradé), une couleur, ou null pour un fond transparent.
 */
async function icon(path, size, { lines = ['be', 'ti'], scale = 0.3, round = false, fond = 'petale' } = {}) {
  const fontSize = Math.round(size * scale)
  const background = fond === 'petale' ? { backgroundColor: '#ffe3d3', backgroundImage: PETALE } : fond ? { backgroundColor: fond } : {}
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
          ...background,
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

// Appli native (Android et iOS) : les sources que @capacitor/assets décline dans toutes les tailles
// (npx capacitor-assets generate --android --ios). L'icône adaptative d'Android superpose un premier
// plan sur un fond ; le fichier qu'écrit @capacitor/assets (mipmap-anydpi-v26) cale chaque image sur la
// zone visible, donc le bloc y prend la même taille que sur l'icône classique, et tient dans le masque rond.
await icon('assets/icon-only.png', 1024)
await icon('assets/icon-background.png', 1024, { lines: [] })
await icon('assets/icon-foreground.png', 1024, { scale: 0.28, fond: null })
// Écran de lancement : blanc comme le site, pour qu'il n'y ait pas d'éclair de couleur à l'ouverture.
await icon('assets/splash.png', 2732, { scale: 0.11, fond: '#ffffff' })
await icon('assets/splash-dark.png', 2732, { scale: 0.11, fond: '#ffffff' })
console.log('icônes écrites')
