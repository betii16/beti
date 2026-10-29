// components/CategoryGlyphs.tsx
// Icônes de métiers BETI : grille 32x32, trait arrondi (même langage que le logo),
// formes pleines à 16 % d'opacité pour le second ton. Couleur = prop `color`
// (ou currentColor). Mêmes props que les icônes Lucide pour un remplacement direct.
import React from 'react'

export type GlyphProps = React.SVGProps<SVGSVGElement> & {
  size?: number | string
  color?: string
  strokeWidth?: number | string
}
export type Glyph = React.FC<GlyphProps>

const make = (draw: (tone: string) => React.ReactNode): Glyph => {
  const G: Glyph = ({ size = 24, color, strokeWidth = 2.25, ...rest }) => {
    const tone = color || 'currentColor'
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        width={size}
        height={size}
        fill="none"
        stroke={tone}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...rest}
      >
        {draw(tone)}
      </svg>
    )
  }
  return G
}
const soft = (tone: string) => ({ fill: tone, fillOpacity: 0.16 })

// Plomberie : robinet et goutte
export const GlyphPlomberie = make((t) => (
  <>
    <path d="M12 10V6M9 6h6" />
    <path d="M6 10h12a5 5 0 0 1 5 5v2" />
    <path d="M20.5 17h5" />
    <path d="M23 21c2 2.6 3.2 4.1 3.2 5.4a3.2 3.2 0 0 1-6.4 0c0-1.3 1.2-2.8 3.2-5.4z" {...soft(t)} />
  </>
))

// Électricité : éclair et étincelles
export const GlyphElectricite = make((t) => (
  <>
    <path d="M18.5 4 9 18h7l-2.5 10L24 13.5h-7z" {...soft(t)} />
    <path d="M5 9l2.5 1.5M4 15h3" />
  </>
))

// Ménage : spray et étincelle
export const GlyphMenage = make((t) => (
  <>
    <path d="M9 15h10v11a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 9 26z" {...soft(t)} />
    <path d="M11 15v-3.5h6V15M11 11.5V8h8l3 2.5v1" />
    <path d="M25.5 4l1.1 2.9 2.9 1.1-2.9 1.1-1.1 2.9-1.1-2.9-2.9-1.1 2.9-1.1z" {...soft(t)} />
  </>
))

// Déménagement : carton isométrique
export const GlyphDemenagement = make((t) => (
  <>
    <path d="M16 5.5 27 11.5v11L16 28.5 5 22.5v-11z" />
    <path d="M5 11.5l11 6 11-6" {...soft(t)} />
    <path d="M16 17.5v11" />
    <path d="M10.5 8.5l11 6" />
  </>
))

// Jardinage : plante en pot
export const GlyphJardinage = make((t) => (
  <>
    <path d="M10 21h12l-1.6 7H11.6z" {...soft(t)} />
    <path d="M16 21V12" />
    <path d="M16 17c-5 0-7.5-3-7.5-6.5 4.5 0 7.5 2.5 7.5 6.5z" {...soft(t)} />
    <path d="M16 13.5c0-4.5 3-7.5 7.5-7.5 0 4.5-3 7.5-7.5 7.5z" {...soft(t)} />
  </>
))

// Peinture : rouleau
export const GlyphPeinture = make((t) => (
  <>
    <rect x="4.5" y="5" width="20" height="8" rx="2.5" {...soft(t)} />
    <path d="M24.5 9H27v7H16v4" />
    <rect x="13.5" y="20" width="5" height="8" rx="1.5" {...soft(t)} />
  </>
))

// Serrurerie : cadenas
export const GlyphSerrurerie = make((t) => (
  <>
    <rect x="6.5" y="14" width="19" height="14" rx="3" {...soft(t)} />
    <path d="M11 14v-3.5a5 5 0 0 1 10 0V14" />
    <circle cx="16" cy="20" r="2" />
    <path d="M16 22v2.5" />
  </>
))

// Informatique : portable
export const GlyphInformatique = make((t) => (
  <>
    <path d="M7.5 7h17a1.5 1.5 0 0 1 1.5 1.5V19H6V8.5A1.5 1.5 0 0 1 7.5 7z" {...soft(t)} />
    <path d="M3 22.5h26l-1.8 3.5H4.8z" />
    <path d="M13 11l-3 3 3 3M19 11l3 3-3 3" />
  </>
))

// Coiffure : ciseaux
export const GlyphCoiffure = make((t) => (
  <>
    <circle cx="8" cy="8.5" r="3.5" {...soft(t)} />
    <circle cx="8" cy="23.5" r="3.5" {...soft(t)} />
    <path d="M10.8 10.7 27 24M10.8 21.3 27 8" />
  </>
))

// Autre : grille de services
export const GlyphAutre = make((t) => (
  <>
    <rect x="5" y="5" width="9" height="9" rx="2.5" {...soft(t)} />
    <rect x="18" y="5" width="9" height="9" rx="2.5" />
    <rect x="5" y="18" width="9" height="9" rx="2.5" />
    <rect x="18" y="18" width="9" height="9" rx="2.5" {...soft(t)} />
  </>
))
