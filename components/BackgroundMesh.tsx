// components/BackgroundMesh.tsx
// Fond GLOBAL sobre (toutes les pages) — pensé pour un site d'artisans :
// une ardoise profonde, une seule lueur neutre TRÈS douce en haut pour la
// profondeur, et une vignette discrète. AUCUN motif ni couleur vive : la
// lisibilité du contenu prime. Fixe, z-index -1 : toujours derrière le contenu.
// Couleurs pilotées par variables (s'adapte au thème).

export default function BackgroundMesh() {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Dégradé de base : très léger éclaircissement vers le haut */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, var(--bg-top), var(--bg) 42%)' }} />
      {/* Lueur de profondeur unique, neutre, diffuse */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(115% 70% at 50% -12%, var(--grid-glow), transparent 55%)' }} />
      {/* Vignette douce sur les bords */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 120% at 50% 35%, transparent 60%, var(--bg-vignette) 100%)' }} />
    </div>
  )
}
