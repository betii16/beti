'use client'

// app/suivi/[id]/page.tsx
// Suivi en direct d'un artisan (façon Uber) : carte plein écran, puck qui glisse,
// vraie route et ETA. [id] = id de l'artisan. La position du client vient du GPS.

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { ChevronLeft } from 'lucide-react'

const BetiMap = dynamic(() => import('@/components/BetiMap'), { ssr: false })

const PILL: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, borderRadius: 'var(--r-btn)',
  background: 'var(--bg2)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)',
}

export default function SuiviPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const { isAr } = useLang()
  const [lat, setLat] = useState(36.7538)
  const [lng, setLng] = useState(3.0588)
  const [name, setName] = useState('')

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => { setLat(p.coords.latitude); setLng(p.coords.longitude) },
        () => {}
      )
    }
    supabase.from('profiles').select('full_name').eq('id', id).single()
      .then(({ data }) => { if (data?.full_name) setName(data.full_name) })
  }, [id])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 250 }}>
      <BetiMap trackingArtisanId={id} clientLat={lat} clientLng={lng} showAllArtisans={false} />

      {/* Surfaces « carreau posé » (tokens) au lieu de l'ancien verre noir-violet */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1100, padding: 'calc(env(safe-area-inset-top) + 12px) 16px 12px', display: 'flex', alignItems: 'center', gap: 10, direction: isAr ? 'rtl' : 'ltr', pointerEvents: 'none' }}>
        <button onClick={() => router.back()} aria-label={isAr ? 'رجوع' : 'Retour'}
          style={{ ...PILL, width: 44, height: 44, padding: 0, justifyContent: 'center', cursor: 'pointer', flexShrink: 0, pointerEvents: 'auto' }}>
          <ChevronLeft size={22} color="var(--tx)" style={{ transform: isAr ? 'scaleX(-1)' : undefined }} />
        </button>
        <div role="status" style={{ ...PILL, minHeight: 44, padding: '0 16px', fontSize: 14, fontWeight: 700, color: 'var(--tx)', minWidth: 0, pointerEvents: 'auto' }}>
          <span aria-hidden className="anim-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isAr ? (name ? `تتبع ${name}` : 'تتبع مباشر') : (name ? `Suivi de ${name}` : 'Suivi en direct')}
          </span>
        </div>
      </div>
    </div>
  )
}
