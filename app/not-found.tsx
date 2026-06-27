import Link from 'next/link'

// Page 404 brandée — rendue dans le RootLayout, donc les variables de thème
// (var(--bg), var(--tx)…) et les classes .btn sont disponibles.
export const metadata = { title: 'Page introuvable' }

export default function NotFound() {
  return (
    <main style={{
      minHeight: '70vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '40px 24px', gap: 18,
    }}>
      <div style={{
        fontSize: 88, fontWeight: 800, lineHeight: 1, fontFamily: 'Nexa, sans-serif',
        background: 'var(--gradient-text)', WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>404</div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--tx)' }}>
        Cette page n'existe pas
      </h1>
      <p style={{ fontSize: 15, color: 'var(--tx2)', maxWidth: 360, margin: 0, fontWeight: 300 }}>
        Le lien est peut-être cassé ou la page a été déplacée. Revenez à l'accueil
        pour trouver un artisan près de chez vous.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" className="btn-primary">Retour à l'accueil</Link>
        <Link href="/recherche" className="btn-ghost">Rechercher un artisan</Link>
      </div>
    </main>
  )
}
