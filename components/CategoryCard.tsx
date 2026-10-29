'use client'
// Carte de métier : grand dessin teinté qui déborde du coin, nom, exemples de services.
// Remplace la rangée de petites icônes dans des cases (peu lisible, peu engageante).
import React from 'react'
import { CategoryIcon, categoryColor, categoryInk } from '@/components/icons'

export default function CategoryCard({
  id, label, desc, active, onClick, width, badge,
}: {
  id: string
  label: string
  desc?: string
  active: boolean
  onClick: () => void
  width?: number | string
  badge?: string
}) {
  const c = categoryColor(id)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="press"
      style={{
        position: 'relative', overflow: 'hidden', textAlign: 'start', cursor: 'pointer',
        borderRadius: 22, padding: '16px 16px 14px', minHeight: 156,
        width: width ?? '100%', flexShrink: 0, scrollSnapAlign: 'start',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
        background: `color-mix(in srgb, ${c} ${active ? 20 : 11}%, var(--bg2))`,
        border: `1.5px solid ${active ? c : `color-mix(in srgb, ${c} 24%, var(--border))`}`,
        boxShadow: active ? `0 0 0 3px color-mix(in srgb, ${c} 22%, transparent)` : 'none',
        transition: 'background .2s, border-color .2s, box-shadow .2s',
        fontFamily: 'inherit',
      }}
    >
      <span style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.01em', color: active ? categoryInk(id) : 'var(--tx)' }}>{label}</span>
      {desc ? <span style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--tx2)', maxWidth: '88%' }}>{desc}</span> : null}
      <span aria-hidden style={{ position: 'absolute', insetInlineEnd: 12, bottom: 10, lineHeight: 0, opacity: active ? 1 : 0.92 }}>
        <CategoryIcon id={id} size={78} color={c} strokeWidth={1.5} />
      </span>
      {badge ? <span className="badge tone-danger" style={{ position: 'absolute', top: 12, insetInlineEnd: 12 }}>{badge}</span> : null}
    </button>
  )
}
