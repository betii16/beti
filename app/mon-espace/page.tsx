'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'

type Booking = {
  id: string; title: string; description: string | null; address: string
  scheduled_at: string; status: string; price_agreed: number | null
  created_at: string; artisans: any | null
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
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: s.bg, color: s.color, border: `0.5px solid ${s.border}`, fontFamily: 'Nexa, sans-serif' }}>
      {isAr ? s.ar : s.fr}
    </span>
  )
}

export default function MonEspacePage() {
  const router = useRouter()
  const { t, isAr } = useLang()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (prof) setProfile(prof)
      const { data: bookingsData } = await supabase.from('bookings').select('*, artisans(category, hourly_rate, profiles(full_name))').eq('client_id', user.id).order('created_at', { ascending: false })
      if (bookingsData) setBookings(bookingsData)
      setLoading(false)
    }
    init()
  }, [])

  const cancelBooking = async (id: string) => {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b))
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

  const pending  = bookings.filter(b => b.status === 'pending')
  const active   = bookings.filter(b => ['accepted', 'in_progress'].includes(b.status))
  const history  = bookings.filter(b => ['completed', 'refused', 'cancelled'].includes(b.status))

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: '#555', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>{t('common.loading')}</div>
    </div>
  )

  return (
    <>
      <style suppressHydrationWarning>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #0D0D12; font-family: 'Nexa', sans-serif; } ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #C9A84C44; border-radius: 2px; }`}</style>
      <div style={{ paddingTop: 52, minHeight: '100vh', background: '#0D0D12', direction: isAr ? 'rtl' : 'ltr' }}>

        {/* Header */}
        <div style={{ background: '#09090f', borderBottom: '0.5px solid #1e1e2a', padding: '28px 32px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 6 }}>{t('mySpace.title')}</div>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#F0EDE8' }}>
                  {t('mySpace.hello')} {profile?.full_name?.split(' ')[0] || ''} 👋
                </h1>
              </div>
              <a href="/parametres" style={{ textDecoration: 'none' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#C9A84C22', border: '1.5px solid #C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#C9A84C', cursor: 'pointer' }}>
                  {(profile?.full_name || user?.email || 'U')[0].toUpperCase()}
                </div>
              </a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              {[
                { value: bookings.length, label: t('mySpace.total'),     color: '#F0EDE8', bg: '#161620' },
                { value: pending.length,  label: t('mySpace.pending'),   color: '#C9A84C', bg: '#1a1508' },
                { value: active.length,   label: t('mySpace.active'),    color: '#60a5fa', bg: '#0d1a2a' },
                { value: history.filter(b => b.status === 'completed').length, label: t('mySpace.completed'), color: '#4ade80', bg: '#0a2010' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, border: '0.5px solid #2a2a3a', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 32px' }}>

          <a href="/" style={{ textDecoration: 'none', display: 'block', marginBottom: 24 }}>
            <div style={{ background: '#1a1508', border: '0.5px solid #C9A84C33', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#C9A84C')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#C9A84C33')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>🔧</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8' }}>{t('mySpace.bookArtisan')}</div>
                  <div style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>{t('mySpace.bookSub')}</div>
                </div>
              </div>
              <span style={{ color: '#C9A84C', fontSize: 18 }}>{isAr ? '←' : '→'}</span>
            </div>
          </a>

          <div style={{ display: 'flex', borderBottom: '0.5px solid #2a2a3a', marginBottom: 24 }}>
            {[
              { id: 'pending', label: t('mySpace.requests'), count: pending.length },
              { id: 'active',  label: t('mySpace.active'),   count: active.length  },
              { id: 'history', label: t('mySpace.history'),  count: history.length },
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
              <div style={{ textAlign: 'center', padding: '64px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#555', marginBottom: 8 }}>{t('mySpace.noBooking')}</div>
                <a href="/" style={{ textDecoration: 'none' }}>
                  <button style={{ padding: '12px 24px', background: '#C9A84C', border: 'none', borderRadius: 10, color: '#0D0D12', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', marginTop: 16 }}>
                    {t('mySpace.bookArtisan')}
                  </button>
                </a>
              </div>
            )
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {list.map(b => (
                  <div key={b.id} style={{ background: '#161620', border: `0.5px solid ${b.status === 'pending' ? '#C9A84C33' : '#2a2a3a'}`, borderRadius: 14, overflow: 'hidden' }}>
                    {b.status === 'pending' && <div style={{ height: 2, background: 'linear-gradient(90deg, #C9A84C, #f59e0b)' }}/>}
                    <div style={{ padding: '18px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', marginBottom: 4 }}>{b.title}</div>
                          {b.artisans && <div style={{ fontSize: 12, color: '#C9A84C', fontWeight: 300 }}>{b.artisans?.profiles?.full_name || 'Artisan'} · {b.artisans?.category}</div>}
                        </div>
                        <StatusBadge status={b.status}/>
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
                        {[
                          { icon: '📍', text: b.address },
                          { icon: '📅', text: fmt(b.scheduled_at) },
                          { icon: '💰', text: b.price_agreed ? `${b.price_agreed} DA/h` : (isAr ? 'السعر يحدد لاحقاً' : 'Tarif à définir') },
                        ].map(item => (
                          <div key={item.icon} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666', fontWeight: 300 }}>
                            <span>{item.icon}</span>{item.text}
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <a href={`/artisan/${(b as any).artisan_id}`} style={{ textDecoration: 'none', flex: 1 }}>
                          <button style={{ width: '100%', padding: '9px', background: 'transparent', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#888', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>
                            {t('mySpace.viewArtisan')}
                          </button>
                        </a>
                        {b.status === 'pending' && (
                          <button onClick={() => cancelBooking(b.id)}
                            style={{ flex: 1, padding: '9px', background: 'transparent', border: '0.5px solid #2a1010', borderRadius: 10, color: '#f87171', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>
                            {t('mySpace.cancel')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      </div>
    </>
  )
}
