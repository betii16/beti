// components/BackgroundMesh.tsx
// Fond GLOBAL « plan d'atelier » (toutes les pages) — pensé pour un site
// d'artisans : ardoise sombre + grille technique fine (façon plan/blueprint)
// + une lueur neutre très douce en haut pour la profondeur. Sobre et
// professionnel, aucun effet ludique. Fixe, z-index -1 : toujours derrière le
// contenu. Le backdrop-filter des cartes en verre floute légèrement la grille
// → effet « plan sous verre ». Couleurs pilotées par variables (s'adapte au thème).

export default function BackgroundMesh() {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Lueur de profondeur (neutre, en haut) */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(130% 90% at 50% -15%, var(--grid-glow), transparent 60%)' }} />
      {/* Grille fine */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)', backgroundSize: '52px 52px' }} />
      {/* Grille majeure (repères, toutes les 4 cases) façon plan coté */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--grid-line-major) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line-major) 1px, transparent 1px)', backgroundSize: '208px 208px' }} />
      {/* Estompe les bords (vignette douce) pour ne pas voir la grille « se couper » */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 120% at 50% 50%, transparent 55%, var(--bg) 100%)' }} />
      {/* Grain fin */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, mixBlendMode: 'overlay', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
    </div>
  )
}
