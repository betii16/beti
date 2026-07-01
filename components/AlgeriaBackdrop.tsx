'use client'

// components/AlgeriaBackdrop.tsx
// Monte le filigrane carte d'Algérie UNIQUEMENT sur les écrans « vitrine » :
// accueil (/) et auth (/auth/*). Fixe, z-index -1 (juste au-dessus de
// BackgroundMesh, sous le contenu), comme le fond global. L'intro (overlay
// opaque) intègre son propre filigrane directement dans AppIntro.

import { usePathname } from 'next/navigation'
import AlgeriaWatermark from '@/components/AlgeriaWatermark'

export default function AlgeriaBackdrop() {
  const pathname = usePathname() || '/'
  const show = pathname === '/' || pathname.startsWith('/auth')
  if (!show) return null
  return <AlgeriaWatermark opacity={0.08} blur={0.6} size="min(88vh, 120vw)" />
}
