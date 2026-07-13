'use client'

// components/cinematic/CinematicGate.tsx
// Garde d'affichage de l'expérience cinématique : première visite, desktop,
// pas de prefers-reduced-motion, WebGL disponible. Le bundle three.js/GSAP
// (~lourd) n'est téléchargé QUE si toutes les conditions passent (dynamic
// import ssr:false) — zéro impact sur les visites suivantes et le mobile.
// Forçage pour tester : ajouter ?cine=1 à l'URL.

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'

const CinematicLanding = dynamic(() => import('./CinematicLanding'), { ssr: false })

const DONE_KEY = 'beti-cine-done'

export default function CinematicGate() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      const force = new URLSearchParams(window.location.search).get('cine') === '1'
      if (!force) {
        if (localStorage.getItem(DONE_KEY)) return
        if (!window.matchMedia('(min-width: 768px)').matches) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      }
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (!gl) return
      setShow(true)
    } catch { /* stockage bloqué → on n'affiche rien */ }
  }, [])

  if (!show) return null
  // Portal vers <body> : la racine de page a une animation d'entrée (pageIn)
  // qui crée un stacking context — sans portal, la navbar passerait au-dessus.
  return createPortal(<CinematicLanding onClose={() => setShow(false)} />, document.body)
}
