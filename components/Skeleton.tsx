// components/Skeleton.tsx
// Squelettes de chargement réutilisables (shimmer via .skeleton de globals.css).
// Remplacent les écrans « Chargement… » plats : perçu instantané = signe d'app pro.
// Tout est piloté par les tokens de thème, donc cohérent clair/sombre partout.

type BoxProps = { w?: number | string; h?: number | string; r?: number; style?: React.CSSProperties }

/** Bloc shimmer atomique — la brique de base. */
export function Skeleton({ w = '100%', h = 16, r = 10, style }: BoxProps) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />
}

/** Une ligne de liste « artisan / réservation » (avatar + 2 lignes + montant). */
export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18 }}>
      <Skeleton w={56} h={56} r={17} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton w="55%" h={13} />
        <Skeleton w="38%" h={11} />
        <Skeleton w="68%" h={10} />
      </div>
      <Skeleton w={40} h={28} r={8} />
    </div>
  )
}

/**
 * Écran de chargement pleine page : un titre, une rangée de stats optionnelle,
 * puis N lignes. Couvre dashboards (admin, planning, revenus, avis) et détails.
 */
export function SkeletonPage({ rows = 5, stats = false, paddingTop = 64 }: { rows?: number; stats?: boolean; paddingTop?: number }) {
  return (
    <div style={{ minHeight: '100vh', paddingTop, maxWidth: 720, margin: '0 auto', padding: `${paddingTop}px 20px 40px` }}>
      <Skeleton w={170} h={26} r={9} style={{ marginBottom: 22 }} />
      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
          {[0, 1, 2].map(i => <Skeleton key={i} h={78} r={16} />)}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  )
}
