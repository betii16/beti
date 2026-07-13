'use client'

// components/NavigateButton.tsx
// Bouton « Y aller » : lance la navigation Waze vers les coordonnées de la
// mission (le client a posé un pin exact à la réservation). Ne s'affiche que si
// on a de vraies coordonnées. Réutilisé sur le dashboard artisan et le planning.

import { Navigation } from 'lucide-react'
import { openWaze } from '@/lib/nav'
import { useLang } from '@/lib/LangContext'

export default function NavigateButton({
  lat, lng, compact = false,
}: {
  lat?: number | null
  lng?: number | null
  compact?: boolean
}) {
  const { t } = useLang()
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) return null

  return (
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); openWaze(lat, lng) }}
      title={t('common.navigate')}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
        padding: compact ? '5px 10px' : '7px 13px', borderRadius: 10, cursor: 'pointer',
        background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
        border: '1px solid color-mix(in srgb, var(--accent) 45%, transparent)',
        color: 'var(--accent)', fontFamily: 'Nexa, sans-serif',
        fontSize: compact ? 11 : 12, fontWeight: 800, whiteSpace: 'nowrap',
      }}
    >
      <Navigation size={compact ? 12 : 13} />
      {t('common.navigate')}
    </button>
  )
}
