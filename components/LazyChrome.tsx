'use client'

// Éléments décoratifs ou natifs-seulement chargés hors du bundle initial du layout.
// next/dynamic avec ssr:false n'est permis que dans un composant client.
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const AlgeriaBackdrop = dynamic(() => import('@/components/AlgeriaBackdrop'), { ssr: false })
const GlassHover = dynamic(() => import('@/components/GlassHover'), { ssr: false })
const AppIntro = dynamic(() => import('@/components/AppIntro'), { ssr: false })

export default function LazyChrome() {
  const [native, setNative] = useState(false)
  useEffect(() => {
    // L'intro n'existe que dans l'app Capacitor : le web ne télécharge jamais son code.
    try { setNative(!!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) } catch {}
  }, [])
  return (
    <>
      <AlgeriaBackdrop/>
      <GlassHover/>
      {native && <AppIntro/>}
    </>
  )
}
