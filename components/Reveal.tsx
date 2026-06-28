'use client'

// components/Reveal.tsx
// Révélation au scroll (IntersectionObserver) : l'enfant monte en fondu quand il
// entre dans le viewport, façon Linear/Stripe. Une seule fois (pas de re-trigger).
// Respecte prefers-reduced-motion : si l'utilisateur le demande, on affiche direct.
//
// Usage :
//   <Reveal>…</Reveal>                 // fondu + montée par défaut
//   <Reveal delay={120}>…</Reveal>     // décalage en cascade
//   <Reveal y={28} as="section">…      // amplitude + balise personnalisées

import { useEffect, useRef, useState } from 'react'

type RevealProps = {
  children: React.ReactNode
  /** Décalage avant l'animation (ms) — pour cascader plusieurs Reveal. */
  delay?: number
  /** Amplitude de la montée (px). */
  y?: number
  /** Balise rendue (div par défaut). */
  as?: keyof JSX.IntrinsicElements
  className?: string
  style?: React.CSSProperties
}

export default function Reveal({ children, delay = 0, y = 20, as = 'div', className, style }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Accessibilité : pas d'animation si l'utilisateur la refuse.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect() // une seule fois
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const Tag = as as any
  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : `translateY(${y}px)`,
        transition: `opacity .6s cubic-bezier(.22,1,.36,1) ${delay}ms, transform .6s cubic-bezier(.22,1,.36,1) ${delay}ms`,
        willChange: 'opacity, transform',
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}
