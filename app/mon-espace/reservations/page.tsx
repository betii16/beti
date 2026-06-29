'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Package, MapPin, Calendar, Banknote } from 'lucide-react'
import { useLang } from '@/lib/LangContext'

type Booking = {
  id: string
  title: string
  description: string | null
  address: string
  scheduled_at: string
  status: string
  price_agreed: number | null
  created_at: string
  artisans: { full_name: string; category: string; rating_avg: number } | null
}

const STATUS: Record<string, { bg: string; color: string; border: string }> = {
  pending:     { bg: 'rgba(90, 61, 240,0.08)',  color: '#5A3DF0', border: 'rgba(90, 61, 240,0.2)' },
  confirmed:   { bg: 'rgba(96,165,250,0.08)',  color: '#60a5fa', border: 'rgba(96,165,250,0.2)' },
  in_progress: { bg: 'rgba(167,139,250,0.08)', color: '#a78bfa', border: 'rgba(167,139,250,0.2)' },
  completed:   { bg: 'rgba(16,185,129,0.07)',  color: '#10b981', border: 'rgba(16,185,129,0.2)' },
  refused:     { bg: 'rgba(239,68,68,0.06)',   color: '#ef4444', border: 'rgba(239,68,68,0.2)' },
  cancelled:   { bg: 'var(--bg3)',             color: 'var(--tx2)', border: 'var(--border)' },
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLang()
  const s = STATUS[status] || STATUS.pending
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: s.bg, color: s.color, border: `0.5px solid ${s.border}` }}>
      {t(`status.${STATUS[status] ? status : 'pending'}`)}
    </span>
  )
}

export default function MesReservations() {
  const router = useRouter()
  const { t, isAr } = useLang()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      // Réservations du client (sans embed fragile par nom de FK).
      const { data: bk } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })

      const list = bk || []
      // L'artisan : nom sur `profiles`, catégorie/note sur `artisans` (même id).
      const ids = Array.from(new Set(list.map((b: any) => b.artisan_id).filter(Boolean)))
      const info: Record<string, { full_name: string; category: string; rating_avg: number }> = {}
      if (ids.length) {
        const [{ data: profs }, { data: arts }] = await Promise.all([
          supabase.from('profiles').select('id, full_name').in('id', ids),
          supabase.from('artisans').select('id, category, rating_avg').in('id', ids),
        ])
        const pMap = new Map((profs || []).map((p: any) => [p.id, p.full_name]))
        const aMap = new Map((arts || []).map((a: any) => [a.id, a]))
        for (const id of ids) {
          info[id] = {
            full_name: pMap.get(id) || 'Artisan',
            category: aMap.get(id)?.category || '',
            rating_avg: aMap.get(id)?.rating_avg || 0,
          }
        }
      }
      setBookings(list.map((b: any) => ({ ...b, artisans: info[b.artisan_id] || null })))
      setLoading(false)
    }
    init()
  }, [])

  const fmt = (d: string) => new Date(d).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const filtered = bookings.filter(b => {
    if (activeTab === 'active') return ['pending', 'confirmed', 'in_progress'].includes(b.status)
    if (activeTab === 'completed') return ['completed', 'refused', 'cancelled'].includes(b.status)
    return true
  })

  const cancelBooking = async (id: string) => {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: 'var(--tx3)', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>{t('common.loading')}</div>
    </div>
  )

  return (
    <div style={{ paddingTop: 64, minHeight: '100vh', fontFamily: 'Nexa, sans-serif', direction: isAr ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div style={{ borderBottom: '0.5px solid var(--border)', padding: '32px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 10, color: '#5A3DF0', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 6 }}>{t('mySpace.title')}</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--tx)', marginBottom: 4 }}>{t('nav.myBookings')}</h1>
          <p style={{ fontSize: 13, color: 'var(--tx3)', fontWeight: 300 }}>{bookings.length} {t('mySpace.totalCount')}</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 40px' }}>

        {/* Onglets */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', marginBottom: 28 }}>
          {[
            { id: 'all',       label: t('mySpace.tabAll'),    count: bookings.length },
            { id: 'active',    label: t('mySpace.tabActive'), count: bookings.filter(b => ['pending','confirmed','in_progress'].includes(b.status)).length },
            { id: 'completed', label: t('mySpace.tabDone'),   count: bookings.filter(b => ['completed','refused','cancelled'].includes(b.status)).length },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              style={{ padding: '12px 20px', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? '#5A3DF0' : 'transparent'}`, color: activeTab === tab.id ? '#5A3DF0' : 'var(--tx3)', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}>
              {tab.label}
              {tab.count > 0 && (
                <span style={{ background: activeTab === tab.id ? '#5A3DF0' : 'var(--border)', color: activeTab === tab.id ? '#fff' : 'var(--tx2)', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 20 }}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#333' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', color: 'var(--tx3)' }}><Package size={40}/></div>
            <div style={{ fontSize: 14, fontWeight: 300 }}>{t('mySpace.emptyHere')}</div>
            <a href="/#services" className="btn-primary btn-sm" style={{ marginTop: 20 }}>
              {t('mySpace.findArtisan')}
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(b => (
              <div key={b.id} className="card" style={{ borderColor: b.status === 'pending' ? '#5A3DF055' : undefined, padding: 0 }}>
                {b.status === 'pending' && <div style={{ height: 2, background: 'linear-gradient(90deg, #5A3DF0, #f59e0b)' }}/>}
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', marginBottom: 4 }}>{b.title}</div>
                      {b.artisans && (
                        <div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300 }}>
                          {t(`categories.${b.artisans.category}`)} · ⭐ {b.artisans.rating_avg?.toFixed(1) || 'N/A'}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={b.status}/>
                  </div>

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: b.status === 'pending' ? 14 : 0 }}>
                    {[
                      { Icon: MapPin,   text: b.address },
                      { Icon: Calendar, text: fmt(b.scheduled_at) },
                      { Icon: Banknote, text: b.price_agreed ? `${b.price_agreed} ${t('common.da')}${t('common.perHour')}` : t('mySpace.priceTbd') },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--tx3)', fontWeight: 300 }}>
                        <item.Icon size={13}/>{item.text}
                      </div>
                    ))}
                  </div>

                  {b.status === 'pending' && (
                    <button onClick={() => cancelBooking(b.id)} className="btn-ghost btn-sm" style={{ color: '#ef4444', borderColor: '#ef444455' }}>
                      {t('mySpace.cancelRequest')}
                    </button>
                  )}

                  {b.status === 'completed' && (
                    <a href={`/mon-espace/avis?booking=${b.id}`} style={{ textDecoration: 'none' }}>
                      <button className="btn-soft btn-sm">
                        ⭐ {t('mySpace.leaveReview')}
                      </button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


