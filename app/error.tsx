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
    <main role="alert" className="page-pad-m" style={{
      minHeight: '78vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '96px 24px 48px', gap: 16,
    }}>
      <div aria-hidden style={{
        width: 68, height: 68, borderRadius: 'var(--r-card)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 32,
        background: 'color-mix(in srgb, var(--danger) 10%, var(--bg2))',
        border: '1px solid color-mix(in srgb, var(--danger) 28%, transparent)',
        color: 'var(--danger)', fontWeight: 800,
      }}>!</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--tx)' }}>
        Une erreur est survenue
      </h1>
      <p style={{ fontSize: 15.5, color: 'var(--tx2)', maxWidth: 380, margin: 0, lineHeight: 1.65 }}>
        Quelque chose s&apos;est mal passé de notre côté. Réessayez — si le problème
        persiste, revenez un peu plus tard.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={() => reset()} className="btn-primary">Réessayer</button>
        <Link href="/" className="btn-ghost">Accueil</Link>
      </div>
    </main>
  )
}
