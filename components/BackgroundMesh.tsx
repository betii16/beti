// components/BackgroundMesh.tsx
// Fond GLOBAL sobre (toutes les pages) — pensé pour un site d'artisans :
// une ardoise profonde, une lueur neutre douce pour la profondeur, une vignette,
// et — nouveauté « studio » — deux nappes d'aurore qui dérivent TRÈS lentement
// (vie subtile sans bruit visuel) + un grain de film qui casse le banding des
// dégradés (signature des UI premium type Linear/Vercel). Couleurs pilotées par
// variables (s'adapte au thème). Fixe, z-index -1 : toujours derrière le contenu.

// Grain : bruit fractal SVG encodé en data-URI (zéro requête réseau, ~1px tile).
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

export default function BackgroundMesh() {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Dégradé de base : très léger éclaircissement vers le haut */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, var(--bg-top), var(--bg) 42%)' }} />

      {/* Aurore — deux nappes accent qui dérivent lentement (opacité très basse) */}
      <div style={{
        position: 'absolute', top: '-25%', left: '-15%', width: '80%', height: '80%',
        background: 'radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 62%)',
        filter: 'blur(60px)', opacity: 0.5, willChange: 'transform, opacity',
        animation: 'auroraA 26s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', top: '5%', right: '-20%', width: '75%', height: '75%',
        background: 'radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--accent2) 22%, transparent), transparent 60%)',
        filter: 'blur(70px)', opacity: 0.42, willChange: 'transform, opacity',
        animation: 'auroraB 32s ease-in-out infinite',
      }} />

      {/* Lueur de profondeur unique, neutre, diffuse */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(115% 70% at 50% -12%, var(--grid-glow), transparent 55%)' }} />

      {/* Vignette douce sur les bords (referme la composition) */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 120% at 50% 35%, transparent 58%, var(--bg-vignette) 100%)' }} />

      {/* Grain de film — casse le banding, donne le « toucher » mat des UI premium */}
      <div style={{
        position: 'absolute', inset: 0, backgroundImage: GRAIN, backgroundSize: '140px 140px',
        opacity: 0.4, mixBlendMode: 'overlay', pointerEvents: 'none',
      }} />
    </div>
  )
}
