// components/Logo.tsx
// Marque BETI (charte officielle) : symbole « maison » + lettre B + étoile zellige laiton.
// Logo réel extrait de la charte, détouré sur fond transparent
//   public/beti-logo.svg        → marque bleu d'Alger (vectorielle ; .png 800x832 pour les usages hors site) (éclaircie en thème sombre via .beti-logo-mark)
//   public/beti-logo-white.svg  → marque blanche (pour badges sur fond accent)
//
//   <LogoMark/>  → marque seule (bleu d'Alger par défaut, ou variant="white")
//   <Logo/>      → badge « icône d'application » : carré dégradé + marque blanche

const RATIO = 208 / 200 // hauteur / largeur du SVG (viewBox 200x208)

export function LogoMark({
  size = 28,
  variant = 'color',
}: {
  /** largeur en px (la hauteur suit le ratio du logo) */
  size?: number
  variant?: 'color' | 'white'
}) {
  const src = variant === 'white' ? '/beti-logo-white.svg' : '/beti-logo.svg'
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={variant === 'color' ? 'beti-logo-mark' : undefined}
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
