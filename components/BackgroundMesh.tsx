// components/BackgroundMesh.tsx
// Toile de fond GLOBALE (toutes les pages) — pensée pour le Liquid Glass :
// un dégradé maillé profond + des halos colorés qui dérivent lentement + un
// grain fin. C'est ce que le backdrop-filter des panneaux floute → la
// diffraction du verre. Fixe, z-index -1 : toujours derrière le contenu.
// Sobre volontairement (couleurs basses) pour ne pas être « flashy ».

export default function BackgroundMesh() {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Mesh de base (statique) */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(at 18% 16%,#6366f11c,transparent 46%),radial-gradient(at 82% 12%,#8b5cf618,transparent 46%),radial-gradient(at 72% 82%,#3b82f614,transparent 50%),radial-gradient(at 22% 88%,#ec489910,transparent 46%)' }} />
      {/* Halos qui dérivent */}
      <div style={{ position: 'absolute', top: '-16%', insetInlineStart: '-16%', width: '72vw', height: '72vw', maxWidth: 640, maxHeight: 640, borderRadius: '50%', background: 'radial-gradient(circle,#6366f133 0%,transparent 68%)', animation: 'auroraA 24s ease-in-out infinite', willChange: 'transform' }} />
      <div style={{ position: 'absolute', top: '8%', insetInlineEnd: '-20%', width: '64vw', height: '64vw', maxWidth: 580, maxHeight: 580, borderRadius: '50%', background: 'radial-gradient(circle,#8b5cf62b 0%,transparent 68%)', animation: 'auroraB 29s ease-in-out infinite', willChange: 'transform' }} />
      <div style={{ position: 'absolute', bottom: '-16%', insetInlineStart: '10%', width: '60vw', height: '60vw', maxWidth: 540, maxHeight: 540, borderRadius: '50%', background: 'radial-gradient(circle,#3b82f626 0%,transparent 68%)', animation: 'auroraC 34s ease-in-out infinite', willChange: 'transform' }} />
      <div style={{ position: 'absolute', bottom: '-6%', insetInlineEnd: '24%', width: '46vw', height: '46vw', maxWidth: 420, maxHeight: 420, borderRadius: '50%', background: 'radial-gradient(circle,#ec48991c 0%,transparent 66%)', animation: 'auroraA 28s ease-in-out infinite reverse', willChange: 'transform' }} />
      <div style={{ position: 'absolute', top: '38%', insetInlineEnd: '-8%', width: '40vw', height: '40vw', maxWidth: 360, maxHeight: 360, borderRadius: '50%', background: 'radial-gradient(circle,#22d3ee1c 0%,transparent 66%)', animation: 'auroraB 38s ease-in-out infinite reverse', willChange: 'transform' }} />
      {/* Grain fin */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.045, mixBlendMode: 'overlay', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
    </div>
  )
}
