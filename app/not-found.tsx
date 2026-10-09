import Link from 'next/link'

// Page 404 brandée — rendue dans le RootLayout, donc les variables de thème
// (var(--bg), var(--tx)…) et les classes .btn sont disponibles.
// Identité « Chaux & Zellige » : chiffre en mono (le « devis »), carreau
// d'accent, aplat d'encre — plus de texte en dégradé.
export const metadata = { title: 'Page introuvable' }

export default function NotFound() {
  return (
    <main className="page-pad-m" style={{
      minHeight: '78vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '96px 24px 48px', gap: 16,
    }}>
      <div className="section-label" style={{ marginBottom: 0 }}>Erreur 404 · <bdi lang="ar" dir="rtl">الصفحة غير موجودة</bdi></div>
      <div className="num" aria-hidden style={{
        fontSize: 'clamp(72px, 18vw, 112px)', fontWeight: 600, lineHeight: 1, color: 'var(--tx)',
        letterSpacing: '-0.04em',
      }}>4<span style={{ color: 'var(--accent)' }}>0</span>4</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--tx)' }}>
        Cette page n&apos;existe pas
      </h1>
      <p style={{ fontSize: 15.5, color: 'var(--tx2)', maxWidth: 380, margin: 0, lineHeight: 1.65 }}>
        Le lien est peut-être cassé ou la page a été déplacée. Revenez à l&apos;accueil
        pour trouver un artisan près de chez vous.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" className="btn-primary">Retour à l&apos;accueil</Link>
        <Link href="/recherche" className="btn-ghost">Rechercher un artisan</Link>
      </div>
    </main>
  )
}
