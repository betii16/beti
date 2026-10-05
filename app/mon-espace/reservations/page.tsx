'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Package, MapPin, Calendar, Banknote, Star } from 'lucide-react'
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

// Statuts → tokens de l'identité (lisibles en clair comme en sombre).
const STATUS: Record<string, string> = {
  pending:     'var(--warning)',
  confirmed:   'var(--accent)',
  in_progress: 'var(--accent)',
  completed:   'var(--success)',
  refused:     'var(--danger)',
  cancelled:   'var(--tx2)',
}
const SCOPE_CSS = `.res-scope :is(a,button):focus-visible{outline:2px solid var(--accent);outline-offset:2px}`

function StatusBadge({ status }: { status: string }) {
  const { t } = useLang()
  const c = STATUS[status] || STATUS.pending
  return (
    <span style={{ padding: '4px 10px', borderRadius: 'var(--r-chip)', fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, background: `color-mix(in srgb, ${c} 13%, transparent)`, color: `color-mix(in srgb, ${c} 72%, var(--tx))`, border: `1px solid color-mix(in srgb, ${c} 25%, transparent)` }}>
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
    if (!window.confirm(isAr ? 'هل تريد إلغاء هذا الطلب؟' : 'Annuler cette demande ? L’artisan en sera informé.')) return
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b))
  }

  if (loading) return (
    <div role="status" aria-label={t('common.loading')} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 64 }}>
      <div className="loader-ring" />
    </div>
  )

  return (
    <div className="res-scope" style={{ paddingTop: 64, minHeight: '100vh', direction: isAr ? 'rtl' : 'ltr' }}>
      <style>{SCOPE_CSS}</style>

      {/* Header */}
      <div className="page-x" style={{ borderBottom: '1px solid var(--border)', padding: '32px 40px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="section-label">{t('mySpace.title')}</div>
          <h1 style={{ fontSize: 'clamp(24px, 6vw, 30px)', lineHeight: 1.15, fontWeight: 800, color: 'var(--tx)', marginBottom: 6 }}>{t('nav.myBookings')}</h1>
          <p style={{ fontSize: 14, color: 'var(--tx2)' }}><span className="num">{bookings.length}</span> {t('mySpace.totalCount')}</p>
        </div>
      </div>

      <div className="page-pad-m" style={{ maxWidth: 900, margin: '0 auto', padding: '24px 40px 48px' }}>

        {/* Onglets */}
        <div role="tablist" className="no-scrollbar" style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24, overflowX: 'auto' }}>
          {[
            { id: 'all',       label: t('mySpace.tabAll'),    count: bookings.length },
            { id: 'active',    label: t('mySpace.tabActive'), count: bookings.filter(b => ['pending','confirmed','in_progress'].includes(b.status)).length },
            { id: 'completed', label: t('mySpace.tabDone'),   count: bookings.filter(b => ['completed','refused','cancelled'].includes(b.status)).length },
          ].map(tab => (
            <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id as any)}
              style={{ padding: '12px 16px', minHeight: 46, background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`, marginBottom: -1, color: activeTab === tab.id ? 'var(--accent)' : 'var(--tx2)', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
              {tab.label}
              {tab.count > 0 && (
                <span className="num" style={{ background: activeTab === tab.id ? 'var(--accent)' : 'var(--bg3)', color: activeTab === tab.id ? '#fff' : 'var(--tx2)', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--r-pill)' }}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div aria-hidden style={{ width: 56, height: 56, borderRadius: 14, margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}><Package size={26}/></div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx)', marginBottom: 18 }}>{t('mySpace.emptyHere')}</div>
            <Link href="/#services" className="btn-primary" style={{ minHeight: 44 }}>
              {t('mySpace.findArtisan')}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(b => (
              <div key={b.id} className="card" style={{ borderColor: b.status === 'pending' ? 'color-mix(in srgb, var(--warning) 45%, var(--border))' : undefined, padding: 0 }}>
                <div style={{ padding: '18px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)', marginBottom: 4, overflowWrap: 'anywhere' }}>{b.title}</div>
                      {b.artisans && (
                        <div style={{ fontSize: 13, color: 'var(--tx2)', display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          {b.artisans.full_name} · {t(`categories.${b.artisans.category}`)} · <Star size={12} fill="var(--laiton)" strokeWidth={0} aria-hidden/> {b.artisans.rating_avg?.toFixed(1) || '—'}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={b.status}/>
                  </div>

                  <div style={{ display: 'flex', gap: '8px 16px', flexWrap: 'wrap', marginBottom: (b.status === 'pending' || b.status === 'completed') ? 14 : 0 }}>
                    {[
                      { Icon: MapPin,   text: b.address },
                      { Icon: Calendar, text: fmt(b.scheduled_at) },
                      { Icon: Banknote, text: b.price_agreed ? `${b.price_agreed} ${t('common.da')}${t('common.perHour')}` : t('mySpace.priceTbd') },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--tx2)', minWidth: 0 }}>
                        <item.Icon size={14} aria-hidden style={{ flexShrink: 0 }}/>{item.text}
                      </div>
                    ))}
                  </div>

                  {b.status === 'pending' && (
                    <button onClick={() => cancelBooking(b.id)} className="btn-ghost btn-sm" style={{ color: 'var(--danger)', borderColor: 'color-mix(in srgb, var(--danger) 40%, transparent)', minHeight: 44 }}>
                      {t('mySpace.cancelRequest')}
                    </button>
                  )}

                  {b.status === 'completed' && (
                    <Link href={`/mon-espace/avis?booking=${b.id}`} className="btn-soft btn-sm" style={{ minHeight: 44 }}>
                      <Star size={13} fill="currentColor" strokeWidth={0} aria-hidden/> {t('mySpace.leaveReview')}
                    </Link>
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


