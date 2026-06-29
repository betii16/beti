'use client'

// app/suivi/[id]/page.tsx
// Suivi en direct d'un artisan (façon Uber) : carte plein écran, puck qui glisse,
// vraie route et ETA. [id] = id de l'artisan. La position du client vient du GPS.

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronLeft } from 'lucide-react'

const BetiMap = dynamic(() => import('@/components/BetiMap'), { ssr: false })

export default function SuiviPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
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

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1100, padding: 'calc(env(safe-area-inset-top) + 12px) 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} aria-label="Retour"
          style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(9,9,15,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '0.5px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ChevronLeft size={20} color="#fff" />
        </button>
        <div style={{ padding: '9px 16px', borderRadius: 12, background: 'rgba(9,9,15,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '0.5px solid rgba(255,255,255,0.12)', fontSize: 14, fontWeight: 800, color: '#fff', fontFamily: 'Nexa, sans-serif' }}>
          {name ? `Suivi de ${name}` : 'Suivi en direct'}
        </div>
      </div>
    </div>
  )
}
