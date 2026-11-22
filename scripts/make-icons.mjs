// Icônes de l'appli installée, tirées du logo du site (src/app/[lang]/icon.svg).
// À relancer chaque fois que le logo change : node scripts/make-icons.mjs
// (sharp vient avec Next ; tests/unit/manifest.test.ts vérifie les fichiers produits.)

import { readFileSync } from 'node:fs'
import sharp from 'sharp'

const logo = readFileSync('src/app/[lang]/icon.svg', 'utf8')
// Plein cadre, sans coins arrondis ni transparence : Android et iOS découpent eux-mêmes l'icône.
// La maison tient déjà dans la moitié centrale, que tous les masques gardent.
const full = logo.replace(' rx="9"', '')
if (full === logo) throw new Error('icon.svg a changé de forme : le carré arrondi (rx="9") est introuvable.')

const png = (svg, size) => sharp(Buffer.from(svg), { density: 1200 }).resize(size, size).png()

await png(logo, 192).toFile('public/icon-192.png')
await png(logo, 512).toFile('public/icon-512.png')
await png(full, 512).flatten({ background: '#12d46b' }).toFile('public/icon-maskable-512.png')
// Icône de l'écran d'accueil d'iOS : Next la relie tout seul depuis le dossier de la page (convention apple-icon).
await png(full, 180).flatten({ background: '#12d46b' }).toFile('src/app/[lang]/apple-icon.png')
console.log('icônes écrites')
