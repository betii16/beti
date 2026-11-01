'use client'

// components/OtpInput.tsx
// Saisie de code OTP en cases segmentées (style app bancaire / WhatsApp).
// Un seul <input> invisible capte la frappe ET le collage ; les cases sont
// purement visuelles → le clavier numérique, l'autofill SMS (one-time-code)
// et le paste fonctionnent nativement. dir="ltr" forcé : un code se lit
// toujours de gauche à droite, même en arabe.

import { useRef, useState } from 'react'
import { useLang } from '@/lib/LangContext'

/** Course contre un délai : jamais d'attente infinie (réseau coupé / serveur muet). */
export const withTimeout = <T,>(p: PromiseLike<T>, ms = 15000): Promise<T> =>
  Promise.race([Promise.resolve(p), new Promise<T>((_, r) => setTimeout(() => r(new Error('timeout')), ms))])

/**
 * Traduit une erreur d'auth (objet Supabase ou exception) en clé `auth.*`.
 * Ne renvoie jamais le message brut du serveur à l'utilisateur.
 */
export function authErrorKey(e: unknown): string {
  const m = String((e as any)?.message ?? e ?? '')
  const status = (e as any)?.status
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'errNetwork'
  if (/^timeout$/i.test(m)) return 'errTimeout'
  if (/failed to fetch|network|load failed|fetch/i.test(m)) return 'errNetwork'
  if (status === 429 || /rate limit|too many|security purposes|after \d+ seconds/i.test(m)) return 'errRate'
  // GoTrue renvoie « Token has expired or is invalid » pour un code faux comme pour un code périmé :
  // sans code d'erreur précis, on reste neutre (« incorrect ou expiré »).
  if ((e as any)?.code === 'otp_expired') return 'errExpired'
  if (/expired or is invalid/i.test(m)) return 'errCode'
  if (/expired/i.test(m)) return 'errExpired'
  if (/invalid|incorrect|token/i.test(m)) return 'errCode'
  return 'errGeneric'
}

export default function OtpInput({
  value, onChange, onComplete, length = 6, autoFocus = true,
}: {
  value: string
  onChange: (v: string) => void
  onComplete?: (v: string) => void
  length?: number
  autoFocus?: boolean
}) {
  const { t } = useLang()
  const ref = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  const handleChange = (raw: string) => {
    const v = raw.replace(/\D/g, '').slice(0, length)
    onChange(v)
    if (v.length === length) onComplete?.(v)
  }

  const active = Math.min(value.length, length - 1)

  return (
    <div dir="ltr" onClick={() => ref.current?.focus()} style={{ position: 'relative', cursor: 'text' }}>
      <input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label={t('auth.codeTitle')}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: 0, border: 'none', outline: 'none', background: 'transparent',
          fontSize: 16, /* ≥16px : pas de zoom auto iOS au focus */
          caretColor: 'transparent', color: 'transparent',
        }}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', pointerEvents: 'none' }}>
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length
          const isActive = focused && i === active && value.length < length
          return (
            <div key={i} style={{
              flex: 1, maxWidth: 52, height: 58, borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 800, color: 'var(--tx)',
              background: 'var(--glass-surface)',
              border: `1.5px solid ${isActive ? 'var(--accent)' : filled ? 'var(--border2)' : 'var(--border)'}`,
              boxShadow: isActive ? '0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent)' : 'none',
              transform: filled ? 'scale(1)' : 'scale(0.98)',
              transition: 'border-color .15s ease, box-shadow .2s ease, transform .15s ease',
            }}>
              {value[i] || (isActive ? <span className="anim-pulse" style={{ width: 2, height: 26, borderRadius: 1, background: 'var(--accent)' }}/> : '')}
            </div>
          )
        })}
      </div>
    </div>
  )
}
