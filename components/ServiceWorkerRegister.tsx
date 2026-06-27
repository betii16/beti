'use client'

// components/ServiceWorkerRegister.tsx
// Enregistre le service worker (PWA installable + secours hors-ligne).
// Volontairement silencieux : en cas d'échec on ne casse rien, le site
// fonctionne exactement comme avant.

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return // pas de SW en dev (HMR)

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    // On attend le load complet pour ne pas concurrencer le premier rendu.
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])

  return null
}
