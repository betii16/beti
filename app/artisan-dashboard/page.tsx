'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'

type Booking = {
  id: string; title: string; description: string | null; address: string
  scheduled_at: string; status: string; price_agreed: number | null
  created_at: string; profiles: { full_name: string; phone: string | null; avatar_url: string | null } | null
}

const STATUS_CONFIG = {
  pending:     { fr: 'En attente',  ar: 'قيد الانتظار', bg: '#2a2010', color: '#C9A84C', border: '#3a3010' },
  accepted:    { fr: 'Accepté',     ar: 'مقبول',         bg: '#0d1a2a', color: '#60a5fa', border: '#1a2a3a' },
  in_progress: { fr: 'En cours',    ar: 'جارٍ',           bg: '#1a0a2a', color: '#a78bfa', border: '#2a1a3a' },
  completed:   { fr: 'Terminé',     ar: 'مكتمل',         bg: '#0a2010', color: '#4ade80', border: '#0a3a20' },
  refused:     { fr: 'Refusé',      ar: 'مرفوض',         bg: '#1a0a0a', color: '#f87171', border: '#2a1010' },
  cancelled:   { fr: 'Annulé',      ar: 'ملغى',           bg: '#1a1a1a', color: '#666',    border: '#2a2a2a' },
}

function StatusBadge({ status }: { status: string }) {
  const { isAr } = useLang()
  const s = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: s.bg, color: s.color, border: `0.5px solid ${s.border}`, fontFamily: 'Nexa, sans-serif' }}>{isAr ? s.ar : s.fr}</span>
}

function BookingCard({ booking, onAccept, onRefuse, onComplete }: { booking: Booking; onAccept: (id: string) => void; onRefuse: (id: string) => void; onComplete: (id: string) => void }) {
  const { t, isAr } = useLang()
  const [expanded, setExpanded] = useState(false)
  const fmt = (d: string) => new Date(d).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ background: '#161620', border: `0.5px solid ${booking.status === 'pending' ? '#C9A84C33' : '#2a2a3a'}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.3s' }}>
      {booking.status === 'pending' && <div style={{ height: 2, background: 'linear-gradient(90deg, #C9A84C, #f59e0b)' }}/>}
      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#888', fontWeight: 800 }}>
              {(booking.profiles?.full_name || 'C')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8', marginBottom: 2 }}>{booking.profiles?.full_name || (isAr ? 'عميل' : 'Client')}</div>
              {booking.profiles?.phone && <div style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>{booking.profiles.phone}</div>}
            </div>
          </div>
          <StatusBadge status={booking.status}/>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', marginBottom: 6 }}>{booking.title}</div>
          {booking.description && (
            <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, fontWeight: 300, display: expanded ? 'block' : '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{booking.description}</div>
          )}
          {booking.description && booking.description.length > 80 && (
            <button onClick={() => setExpanded(!expanded)} style={{ background: 'transparent', border: 'none', color: '#C9A84C', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300, marginTop: 4 }}>
              {expanded ? (isAr ? 'عرض أقل' : 'Voir moins') : (isAr ? 'عرض المزيد' : 'Voir plus')}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
          {[
            { icon: '📍', text: booking.address },
            { icon: '📅', text: fmt(booking.scheduled_at) },
            { icon: '💰', text: booking.price_agreed ? `${booking.price_agreed} DA/h` : (isAr ? 'السعر يحدد' : 'Tarif à définir') },
          ].map(item => (
            <div key={item.icon} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666', fontWeight: 300 }}>
              <span>{item.icon}</span>{item.text}
            </div>
          ))}
        </div>
        {booking.status === 'pending' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onRefuse(booking.id)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '0.5px solid #2a1010', borderRadius: 10, color: '#f87171', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}
              onMouseEnter={e => (e.target as HTMLElement).style.background = '#1a0a0a'}
              onMouseLeave={e => (e.target as HTMLElement).style.background = 'transparent'}
            >{t('dashboard.refuse')}</button>
            <button onClick={() => onAccept(booking.id)} style={{ flex: 2, padding: '10px', background: '#C9A84C', border: 'none', borderRadius: 10, color: '#0D0D12', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}
              onMouseEnter={e => (e.target as HTMLElement).style.background = '#d4b55a'}
              onMouseLeave={e => (e.target as HTMLElement).style.background = '#C9A84C'}
            >{t('dashboard.accept')}</button>
          </div>
        )}
        {booking.status === 'accepted' && (
          <button onClick={() => onComplete(booking.id)} style={{ width: '100%', padding: '10px', background: 'transparent', border: '0.5px solid #4ade8044', borderRadius: 10, color: '#4ade80', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}
            onMouseEnter={e => (e.target as HTMLElement).style.background = '#0a2010'}
            onMouseLeave={e => (e.target as HTMLElement).style.background = 'transparent'}
          >{t('dashboard.complete')}</button>
        )}
      </div>
    </div>
  )
}

export default function ArtisanDashboard() {
  const router = useRouter()
  const { t, isAr } = useLang()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending')
  const [isAvailable, setIsAvailable] = useState(true)
  const [newBookingAlert, setNewBookingAlert] = useState<Booking | null>(null)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    initDashboard()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [])

  const initDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUser(user)
    const { data: artisanData } = await supabase.from('artisans').select('total_missions, rating_avg, rating_count, is_available, hourly_rate, category').eq('id', user.id).single()
    if (!artisanData) { router.push('/'); return }
    setStats(artisanData); setIsAvailable(artisanData.is_available)
    await loadBookings(user.id)
    channelRef.current = supabase.channel(`dash-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings', filter: `artisan_id=eq.${user.id}` },
        async (payload) => {
          const { data } = await supabase.from('bookings').select('*, profiles!bookings_client_id_fkey(full_name, phone, avatar_url)').eq('id', payload.new.id).single()
          if (data) { setBookings(prev => [data, ...prev]); setNewBookingAlert(data); setTimeout(() => setNewBookingAlert(null), 8000) }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `artisan_id=eq.${user.id}` }, () => loadBookings(user.id))
      .subscribe()
    setLoading(false)
  }

  const loadBookings = async (userId: string) => {
    const { data } = await supabase.from('bookings').select('*, profiles!bookings_client_id_fkey(full_name, phone, avatar_url)').eq('artisan_id', userId).order('created_at', { ascending: false })
    if (data) setBookings(data)
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('bookings').update({ status, ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}) }).eq('id', id)
    const booking = bookings.find(b => b.id === id)
    if (booking) {
      const { data: bf } = await supabase.from('bookings').select('client_id').eq('id', id).single()
      if (bf) await supabase.from('notifications').insert({
        user_id: bf.client_id,
        type: `booking_${status}`,
        title: status === 'accepted' ? (isAr ? 'تم قبول الحجز!' : 'Réservation acceptée !') : status === 'refused' ? (isAr ? 'تم رفض الحجز' : 'Réservation refusée') : (isAr ? 'المهمة مكتملة!' : 'Mission terminée !'),
        body: `"${booking.title}"`,
      })
    }
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
  }

  const toggleAvailability = async () => {
    if (!user) return
    const newVal = !isAvailable
    setIsAvailable(newVal)
    await supabase.from('artisans').update({ is_available: newVal }).eq('id', user.id)
  }

  const pending      = bookings.filter(b => b.status === 'pending')
  const active       = bookings.filter(b => ['accepted', 'in_progress'].includes(b.status))
  const history      = bookings.filter(b => ['completed', 'refused', 'cancelled'].includes(b.status))
  const monthRevenue = bookings.filter(b => b.status === 'completed' && new Date(b.created_at).getMonth() === new Date().getMonth()).reduce((s, b) => s + (b.price_agreed || 0), 0)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: '#555', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>{t('common.loading')}</div>
    </div>
  )

  return (
    <>
      <style suppressHydrationWarning>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0D0D12; font-family: 'Nexa', sans-serif; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 2px; }
        @keyframes slideIn { from { transform: translateX(${isAr ? '-120%' : '120%'}); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>

      <div style={{ paddingTop: 52, minHeight: '100vh', background: '#0D0D12', direction: isAr ? 'rtl' : 'ltr' }}>

        <div style={{ background: '#09090f', borderBottom: '0.5px solid #1e1e2a', padding: '28px 32px' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 6 }}>{t('dashboard.title')}</div>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#F0EDE8' }}>{t('dashboard.hello')}</h1>
              </div>
              <div onClick={toggleAvailability} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#161620', border: `0.5px solid ${isAvailable ? '#4ade8044' : '#2a2a3a'}`, borderRadius: 12, padding: '10px 16px', cursor: 'pointer', transition: 'all 0.3s', userSelect: 'none' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: isAvailable ? '#4ade80' : '#555', boxShadow: isAvailable ? '0 0 8px #4ade8088' : 'none', transition: 'all 0.3s' }}/>
                <span style={{ fontSize: 12, color: isAvailable ? '#4ade80' : '#555', fontWeight: 300, minWidth: 60 }}>{isAvailable ? t('dashboard.online') : t('dashboard.offline')}</span>
                <div style={{ width: 36, height: 20, borderRadius: 10, background: isAvailable ? '#0a3020' : '#1a1a2a', border: `0.5px solid ${isAvailable ? '#4ade80' : '#2a2a3a'}`, position: 'relative', transition: 'all 0.3s' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: isAvailable ? '#4ade80' : '#555', position: 'absolute', top: 2, left: isAvailable ? 18 : 2, transition: 'all 0.3s', boxShadow: isAvailable ? '0 0 6px #4ade8088' : 'none' }}/>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[
                { value: pending.length,                label: t('dashboard.pending'),  color: '#C9A84C', bg: '#1a1508' },
                { value: active.length,                 label: t('dashboard.active'),   color: '#60a5fa', bg: '#0d1a2a' },
                { value: stats?.total_missions || 0,    label: t('dashboard.total'),    color: '#F0EDE8', bg: '#161620' },
                { value: `${monthRevenue.toLocaleString()} DA`, label: t('dashboard.revenue'), color: '#4ade80', bg: '#0a2010' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, border: '0.5px solid #2a2a3a', borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginBottom: 6 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 32px' }}>
          <div style={{ display: 'flex', borderBottom: '0.5px solid #2a2a3a', marginBottom: 28 }}>
            {[
              { id: 'pending', label: t('dashboard.requests'),   count: pending.length },
              { id: 'active',  label: t('dashboard.inProgress'), count: active.length  },
              { id: 'history', label: t('dashboard.history'),    count: history.length },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                style={{ padding: '12px 20px', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? '#C9A84C' : 'transparent'}`, color: activeTab === tab.id ? '#C9A84C' : '#555', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}>
                {tab.label}
                {tab.count > 0 && <span style={{ background: activeTab === tab.id ? '#C9A84C' : '#2a2a3a', color: activeTab === tab.id ? '#0D0D12' : '#888', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 20 }}>{tab.count}</span>}
              </button>
            ))}
          </div>

          {(() => {
            const list = activeTab === 'pending' ? pending : activeTab === 'active' ? active : history
            if (list.length === 0) return (
              <div style={{ textAlign: 'center', padding: '64px 0', color: '#333', fontSize: 14, fontWeight: 300 }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
                {activeTab === 'pending' ? t('dashboard.noRequests') : activeTab === 'active' ? t('dashboard.noActive') : t('dashboard.noHistory')}
              </div>
            )
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {list.map(b => <BookingCard key={b.id} booking={b} onAccept={id => updateStatus(id, 'accepted')} onRefuse={id => updateStatus(id, 'refused')} onComplete={id => updateStatus(id, 'completed')}/>)}
              </div>
            )
          })()}
        </div>
      </div>

      {newBookingAlert && (
        <div style={{ position: 'fixed', bottom: 24, right: isAr ? 'auto' : 24, left: isAr ? 24 : 'auto', zIndex: 400, background: '#161620', border: '0.5px solid #C9A84C44', borderRadius: 16, padding: '20px 24px', maxWidth: 340, animation: 'slideIn 0.4s ease', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <div style={{ height: 2, background: '#C9A84C', marginBottom: 14, marginTop: -20, marginLeft: -24, marginRight: -24 }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C9A84C', boxShadow: '0 0 8px #C9A84C' }}/>
            <span style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.08em' }}>{t('dashboard.newRequest')}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8', marginBottom: 4 }}>{newBookingAlert.title}</div>
          <div style={{ fontSize: 12, color: '#555', fontWeight: 300, marginBottom: 14 }}>
            {t('dashboard.from')} {newBookingAlert.profiles?.full_name || (isAr ? 'عميل' : 'Client')} · {newBookingAlert.address}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { updateStatus(newBookingAlert.id, 'refused'); setNewBookingAlert(null) }} style={{ flex: 1, padding: '8px', background: 'transparent', border: '0.5px solid #2a1010', borderRadius: 8, color: '#f87171', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>{t('dashboard.refuse')}</button>
            <button onClick={() => { updateStatus(newBookingAlert.id, 'accepted'); setNewBookingAlert(null) }} style={{ flex: 2, padding: '8px', background: '#C9A84C', border: 'none', borderRadius: 8, color: '#0D0D12', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>✓ {isAr ? 'قبول' : 'Accepter'}</button>
          </div>
        </div>
      )}
    </>
  )
}
