'use client'
import { useState, useRef, useEffect } from 'react'
import { COUNTRY_CODES } from '@/lib/countryCodes'

interface Props {
  value: string
  onChange: (cc: string) => void
  rounded?: 'left' | 'all'
}

export function FlagImg({ iso, size = 22 }: { iso: string; size?: number }) {
  const [err, setErr] = useState(false)
  const h = Math.round(size * 0.67)

  // Repli si flagcdn est injoignable (réseau restreint, WebView) : badge ISO.
  if (err) return (
    <span style={{
      width: size, height: h, borderRadius: 3, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg3)', border: '0.5px solid var(--border)',
      fontSize: Math.round(size * 0.42), fontWeight: 700, color: 'var(--tx3)',
      fontFamily: 'Nexa,sans-serif',
    }}>{iso.toUpperCase()}</span>
  )

  return (
    <img
      // flagcdn ne sert que des largeurs fixes (w20/w40/w80/...). w80 = net en petit.
      src={`https://flagcdn.com/w80/${iso}.png`}
      width={size}
      height={h}
      onError={() => setErr(true)}
      style={{ borderRadius: 3, objectFit: 'cover', display: 'block', flexShrink: 0 }}
      alt={iso.toUpperCase()}
      loading="lazy"
    />
  )
}

export function CountryPicker({ value, onChange, rounded = 'left' }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const sel = COUNTRY_CODES.find(c => c.c === value) || COUNTRY_CODES[0]

  const filtered = search.trim()
    ? COUNTRY_CODES.filter(c =>
        c.n.toLowerCase().includes(search.toLowerCase()) ||
        c.c.includes(search) ||
        c.iso.includes(search.toLowerCase())
      )
    : COUNTRY_CODES

  // Ferme le picker si clic en dehors
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  // Focus la recherche quand le dropdown s'ouvre
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  const br = rounded === 'left' ? '10px 0 0 10px' : 10

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      {/* Bouton sélecteur */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '13px 12px',
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRight: rounded === 'left' ? 'none' : '1px solid var(--border)',
          borderRadius: br,
          cursor: 'pointer', color: 'var(--tx)',
          fontFamily: 'Nexa,sans-serif', minWidth: 96,
          whiteSpace: 'nowrap',
        }}
      >
        <FlagImg iso={sel.iso} size={22} />
        <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 500 }}>{value}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 999,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          width: 300, overflow: 'hidden',
        }}>
          {/* Recherche */}
          <div style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--border)' }}>
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un pays..."
              onMouseDown={e => e.stopPropagation()}
              style={{
                width: '100%', padding: '8px 12px',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--tx)', fontSize: 13,
                outline: 'none', fontFamily: 'Nexa,sans-serif',
              }}
            />
          </div>

          {/* Liste */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: 'var(--tx3)' }}>
                Aucun résultat
              </div>
            ) : filtered.map(c => (
              <div
                key={c.c}
                onMouseDown={e => { e.preventDefault(); onChange(c.c); setOpen(false); setSearch('') }}
                onTouchEnd={e => { e.preventDefault(); onChange(c.c); setOpen(false); setSearch('') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', cursor: 'pointer',
                  borderBottom: '0.5px solid var(--border)',
                  background: c.c === value ? 'var(--bg3)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                onMouseLeave={e => (e.currentTarget.style.background = c.c === value ? 'var(--bg3)' : 'transparent')}
              >
                <FlagImg iso={c.iso} size={24} />
                <span style={{ fontSize: 13, color: 'var(--tx)', flex: 1, fontFamily: 'Nexa,sans-serif' }}>{c.n}</span>
                <span style={{ fontSize: 12, color: 'var(--tx3)', fontFamily: 'monospace', fontWeight: 600 }}>{c.c}</span>
                {c.c === value && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
