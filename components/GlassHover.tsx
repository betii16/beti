'use client'
// components/GlassHover.tsx
// Surbrillance « verre liquide » GLOBALE : suit le curseur sur toute carte
// cliquable (.acard / .card.is-clickable) et alimente les variables CSS
// --mx/--my consommées par le ::before défini dans globals.css.
// Monté une seule fois dans le layout → marche sur toutes les pages.
import { useEffect } from 'react'

export default function GlassHover() {
  useEffect(() => {
    const h = (e: PointerEvent) => {
      const el = (e.target as HTMLElement)?.closest?.('.acard,.card.is-clickable') as HTMLElement | null
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
      el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
    }
    window.addEventListener('pointermove', h, { passive: true })
    return () => window.removeEventListener('pointermove', h)
  }, [])
  return null
}
