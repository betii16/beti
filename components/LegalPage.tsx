'use client'

// components/LegalPage.tsx
// Gabarit commun aux pages légales (mentions, CGU, confidentialité).
// Rendu sobre brandé BETI : cartes « carreau » Chaux & Zellige, bleu d'Alger, dir-aware (FR/AR).
// Le contenu est passé en props depuis chaque page (server component → SEO).

import { useRouter } from 'next/navigation'
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

  return (
    <div style={{ minHeight: '100vh', paddingTop: 72, direction: 'ltr' }} lang="fr">
      <div className="page-pad-m" style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 72px' }}>

        <button
          onClick={() => router.back()}
          className="desktop-only"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24,
            background: 'transparent', border: 'none', color: 'var(--tx2)', cursor: 'pointer',
            fontSize: 14, fontWeight: 500, padding: '8px 0', minHeight: 40,
          }}
        >
          <ChevronLeft size={16} style={{ transform: 'none' }} />
          BETI
        </button>

        <div className="section-label">
          {eyebrow}
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 6vw, 34px)', fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.15 }}>
          {title}
        </h1>
        <div style={{ fontSize: 13, color: 'var(--tx3)', marginBottom: intro ? 20 : 36 }}>
          {updated}
        </div>

        {intro && (
          <p style={{ fontSize: 15.5, color: 'var(--tx2)', lineHeight: 1.75, marginBottom: 36 }}>
            {intro}
          </p>
        )}

        {note && (
          <div className="card" style={{ padding: '14px 18px', marginBottom: 32, borderColor: 'color-mix(in srgb, var(--accent) 30%, var(--border))', background: 'color-mix(in srgb, var(--accent) 5%, var(--bg2))' }}>
            <div style={{ fontSize: 13.5, color: 'var(--tx2)', lineHeight: 1.6 }}>{note}</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sections.map((s, i) => (
            <section key={i} className="card" style={{ padding: '22px 24px' }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--tx)', marginBottom: 12, lineHeight: 1.3 }}>
                <span className="num" style={{ color: 'var(--accent)', marginInlineEnd: 10, fontSize: 13, fontWeight: 600 }}>{String(i + 1).padStart(2, '0')}</span>
                {s.h}
              </h2>
              {s.body.map((p, j) => (
                <p key={j} style={{ fontSize: 14.5, color: 'var(--tx2)', lineHeight: 1.75, maxWidth: '68ch', marginBottom: j < s.body.length - 1 ? 12 : 0 }}>
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div style={{ marginTop: 36, fontSize: 13, color: 'var(--tx3)', lineHeight: 1.7 }}>
          BETI — Artisans de confiance · Algérie · <a href="/aide" style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 3 }}>support@beti.dz</a>
        </div>
      </div>
    </div>
  )
}
