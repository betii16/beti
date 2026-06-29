// components/Logo.tsx
// Marque BETI (charte officielle) : symbole « toit / maison » + lettre B.
// Logo réel extrait de la charte, détouré sur fond transparent
//   public/beti-logo.png        → marque violette (fonds clairs ET sombres)
//   public/beti-logo-white.png  → marque blanche (pour badges sur fond violet)
//
//   <LogoMark/>  → marque seule (violette par défaut, ou variant="white")
//   <Logo/>      → badge « icône d'application » : carré dégradé + marque blanche

const RATIO = 213 / 189 // hauteur / largeur du PNG source

export function LogoMark({
  size = 28,
  variant = 'color',
}: {
  /** largeur en px (la hauteur suit le ratio du logo) */
  size?: number
  variant?: 'color' | 'white'
}) {
  const src = variant === 'white' ? '/beti-logo-white.png' : '/beti-logo.png'
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="BETI"
      width={size}
      height={Math.round(size * RATIO)}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  )
}

export default function Logo({ size = 28, radius = 8 }: { size?: number; radius?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: 'var(--gradient)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <LogoMark size={Math.round(size * 0.6)} variant="white" />
    </div>
  )
}
