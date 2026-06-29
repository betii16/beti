'use client'

// components/LegalPage.tsx
// Gabarit commun aux pages légales (mentions, CGU, confidentialité).
// Rendu sobre brandé BETI : cartes « glass », violet de marque, dir-aware (FR/AR).
// Le contenu est passé en props depuis chaque page (server component → SEO).

import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/LangContext'
import { ChevronLeft } from 'lucide-react'

export type LegalSection = { h: string; body: string[] }

export default function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
  note,
}: {
  eyebrow: string
  title: string
  updated: string
  intro?: string
  sections: LegalSection[]
  note?: string
}) {
  const router = useRouter()
  const { isAr } = useLang()

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Nexa, sans-serif', paddingTop: 72, direction: isAr ? 'rtl' : 'ltr' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 72px' }}>

        <button
          onClick={() => router.back()}
          className="desktop-only"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24,
            background: 'transparent', border: 'none', color: 'var(--tx2)', cursor: 'pointer',
            fontSize: 13, fontFamily: 'Nexa, sans-serif', fontWeight: 300, padding: 0,
          }}
        >
          <ChevronLeft size={16} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
          BETI
        </button>

        <div style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.14em', fontWeight: 800, marginBottom: 10 }}>
          {eyebrow}
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.02em', marginBottom: 8 }}>
          {title}
        </h1>
        <div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300, marginBottom: intro ? 20 : 36 }}>
          {updated}
        </div>

        {intro && (
          <p style={{ fontSize: 14, color: 'var(--tx2)', fontWeight: 300, lineHeight: 1.8, marginBottom: 36 }}>
            {intro}
          </p>
        )}

        {note && (
          <div className="card" style={{ padding: '14px 18px', marginBottom: 32, borderColor: 'var(--accent)44' }}>
            <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 300, lineHeight: 1.6 }}>{note}</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sections.map((s, i) => (
            <section key={i} className="card" style={{ padding: '22px 24px' }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', marginBottom: 12 }}>
                <span style={{ color: 'var(--accent)', marginInlineEnd: 8 }}>{String(i + 1).padStart(2, '0')}</span>
                {s.h}
              </h2>
              {s.body.map((p, j) => (
                <p key={j} style={{ fontSize: 13.5, color: 'var(--tx2)', fontWeight: 300, lineHeight: 1.8, marginBottom: j < s.body.length - 1 ? 12 : 0 }}>
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div style={{ marginTop: 36, fontSize: 12, color: 'var(--tx3)', fontWeight: 300, lineHeight: 1.7 }}>
          BETI — Artisans de confiance · Algérie · <a href="/aide" style={{ color: 'var(--accent)', textDecoration: 'none' }}>support@beti.dz</a>
        </div>
      </div>
    </div>
  )
}
