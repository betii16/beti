'use client'

import Link from 'next/link'
import { useLang } from '@/lib/LangContext'

// Contenu de la 404 : composant client pour suivre la langue choisie (FR/AR).
// Les textes viennent de lib/translations.ts (clés cxu.nf*).
export default function NotFoundContent() {
  const { t, isAr } = useLang()
  return (
    <main className="page-pad-m" dir={isAr ? 'rtl' : 'ltr'} style={{
      minHeight: '78vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '96px 24px 48px', gap: 16,
    }}>
      <div className="section-label" style={{ marginBottom: 0 }}><bdi>{t('cxu.nfLabel')}</bdi></div>
      <div className="num" dir="ltr" aria-hidden style={{
        fontSize: 'clamp(72px, 18vw, 112px)', fontWeight: 600, lineHeight: 1, color: 'var(--tx)',
        letterSpacing: '-0.04em',
      }}>4<span style={{ color: 'var(--accent)' }}>0</span>4</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--tx)' }}>
        {t('cxu.nfTitle')}
      </h1>
      <p style={{ fontSize: 15.5, color: 'var(--tx2)', maxWidth: 380, margin: 0, lineHeight: 1.65 }}>
        {t('cxu.nfText')}
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" className="btn-primary">{t('cxu.nfHome')}</Link>
        <Link href="/recherche" className="btn-ghost">{t('cxu.nfSearch')}</Link>
      </div>
    </main>
  )
}
