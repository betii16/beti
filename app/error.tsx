'use client'

// Error boundary global — capture les erreurs runtime des pages et affiche un
// écran brandé avec bouton « Réessayer » (au lieu de l'écran d'erreur Next brut).
// Doit être un composant client et exposer `reset()`.

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Trace côté client pour le debug (visible dans la console / outils natifs).
    console.error('[BETI] erreur runtime:', error)
  }, [error])

  return (
    <main style={{
      minHeight: '70vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '40px 24px', gap: 18,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 34,
        background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', fontWeight: 800,
      }}>!</div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--tx)' }}>
        Une erreur est survenue
      </h1>
      <p style={{ fontSize: 15, color: 'var(--tx2)', maxWidth: 360, margin: 0, fontWeight: 300 }}>
        Quelque chose s'est mal passé de notre côté. Réessayez — si le problème
        persiste, revenez un peu plus tard.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={() => reset()} className="btn-primary">Réessayer</button>
        <Link href="/" className="btn-ghost">Accueil</Link>
      </div>
    </main>
  )
}
