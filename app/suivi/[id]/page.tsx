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
  const { t, isAr } = useLang()
  const [lat, setLat] = useState(36.7538)
  const [lng, setLng] = useState(3.0588)
  const [name, setName] = useState('')
  const [booking, setBooking] = useState<{ id: string; status: string } | null>(null)
  const [bookingLoaded, setBookingLoaded] = useState(false)

  // Dernière demande du client avec cet artisan : donne l'état et l'action utile.
  useEffect(() => {
    let alive = true
    const load = async () => {
      if (typeof document !== 'undefined' && document.hidden) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (alive) setBookingLoaded(true); return }
      const { data } = await supabase.from('bookings').select('id,status')
        .eq('client_id', user.id).eq('artisan_id', id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (!alive) return
      if (data) setBooking(data as any)
      setBookingLoaded(true)
    }
    load()
    const poll = setInterval(load, 10000)
    return () => { alive = false; clearInterval(poll) }
  }, [id])

  const stateKey = booking
    ? booking.status === 'pending' ? 'Pending'
    : booking.status === 'confirmed' ? 'Confirmed'
    : booking.status === 'in_progress' ? 'Progress'
    : booking.status === 'completed' ? 'Completed' : 'Cancelled'
    : ''

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
            {name ? `${t('cxb.suiviOf')} ${name}` : t('cxb.suiviLive')}
          </span>
        </div>
      </div>

      {/* État de la demande + action évidente */}
      {bookingLoaded && (
        <div role="status" className="card" style={{ position: 'absolute', zIndex: 1100, insetInline: 12, bottom: 'calc(env(safe-area-inset-bottom) + 12px)', maxWidth: 480, marginInline: 'auto', padding: '14px 16px', direction: isAr ? 'rtl' : 'ltr' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)' }}>{booking ? t(`cxb.st${stateKey}`) : t('cxb.stNone')}</div>
          {booking && <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.5, marginTop: 3 }}>{t(`cxb.st${stateKey}Sub`)}</div>}
          {booking && ['pending', 'confirmed', 'in_progress'].includes(booking.status) && (
            <button onClick={() => router.push(`/chat/${booking.id}`)} className="btn-primary" style={{ minHeight: 44, width: '100%', marginTop: 10 }}>{t('cxb.openChat')}</button>
          )}
          {(!booking || stateKey === 'Cancelled') && (
            <button onClick={() => router.push(`/artisan/${id}`)} className="btn-primary" style={{ minHeight: 44, width: '100%', marginTop: 10 }}>{t('cxb.back')}</button>
          )}
        </div>
      )}
    </div>
  )
}
