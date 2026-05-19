'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

const STATUS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pending:     { label: 'En attente',  bg: '#6366f118', color: '#6366f1', border: '#3a3010' },
  accepted:    { label: 'Accepté',     bg: '#0d1a2a', color: '#60a5fa', border: '#1a2a3a' },
  in_progress: { label: 'En cours',    bg: '#1a0a2a', color: '#a78bfa', border: '#2a1a3a' },
  completed:   { label: 'Terminé',     bg: '#10b98112', color: '#10b981', border: '#10b98122' },
  refused:     { label: 'Refusé',      bg: '#ef444410', color: '#ef4444', border: '#ef444420' },
  cancelled:   { label: 'Annulé',      bg: '#1a1a1a', color: '#8585a0',    border: '#2a2a2a' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] || STATUS.pending
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: s.bg, color: s.color, border: `0.5px solid ${s.border}` }}>
      {s.label}
    </span>
  )
}

export default function MesReservations() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data } = await supabase
        .from('bookings')
        .select('*, artisans!bookings_artisan_id_fkey(full_name, category, rating_avg)')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })

      if (data) setBookings(data)
      setLoading(false)
    }
    init()
  }, [])

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const filtered = bookings.filter(b => {
    if (activeTab === 'active') return ['pending', 'accepted', 'in_progress'].includes(b.status)
    if (activeTab === 'completed') return ['completed', 'refused', 'cancelled'].includes(b.status)
    return true
  })

  const cancelBooking = async (id: string) => {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0b0b12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: '#4a4a65', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>Chargement...</div>
    </div>
  )

  return (
    <div style={{ paddingTop: 64, minHeight: '100vh', background: '#0b0b12', fontFamily: 'Nexa, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#0b0b12', borderBottom: '0.5px solid #1c1c30', padding: '32px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 10, color: '#6366f1', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 6 }}>MON ESPACE</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e0dfe5', marginBottom: 4 }}>Mes réservations</h1>
          <p style={{ fontSize: 13, color: '#4a4a65', fontWeight: 300 }}>{bookings.length} réservation{bookings.length !== 1 ? 's' : ''} au total</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 40px' }}>

        {/* Onglets */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid #1c1c30', marginBottom: 28 }}>
          {[
            { id: 'all',       label: 'Toutes',    count: bookings.length },
            { id: 'active',    label: 'En cours',  count: bookings.filter(b => ['pending','accepted','in_progress'].includes(b.status)).length },
            { id: 'completed', label: 'Terminées', count: bookings.filter(b => ['completed','refused','cancelled'].includes(b.status)).length },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              style={{ padding: '12px 20px', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? '#6366f1' : 'transparent'}`, color: activeTab === tab.id ? '#6366f1' : '#4a4a65', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}>
              {tab.label}
              {tab.count > 0 && (
                <span style={{ background: activeTab === tab.id ? '#6366f1' : '#1c1c30', color: activeTab === tab.id ? '#0b0b12' : '#8585a0', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 20 }}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#333' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📦</div>
            <div style={{ fontSize: 14, fontWeight: 300 }}>Aucune réservation ici</div>
            <a href="/#services" style={{ display: 'inline-block', marginTop: 20, padding: '10px 24px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 10, color: '#0b0b12', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
              Trouver un artisan
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(b => (
              <div key={b.id} style={{ background: '#13131e', border: `0.5px solid ${b.status === 'pending' ? '#6366f133' : '#1c1c30'}`, borderRadius: 14, overflow: 'hidden' }}>
                {b.status === 'pending' && <div style={{ height: 2, background: 'linear-gradient(90deg, #6366f1, #f59e0b)' }}/>}
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#e0dfe5', marginBottom: 4 }}>{b.title}</div>
                      {b.artisans && (
                        <div style={{ fontSize: 12, color: '#4a4a65', fontWeight: 300 }}>
                          {b.artisans.category} · ⭐ {b.artisans.rating_avg?.toFixed(1) || 'N/A'}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={b.status}/>
                  </div>

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: b.status === 'pending' ? 14 : 0 }}>
                    {[
                      { icon: '📍', text: b.address },
                      { icon: '📅', text: fmt(b.scheduled_at) },
                      { icon: '💶', text: b.price_agreed ? `${b.price_agreed} DA/h` : 'Tarif à définir' },
                    ].map(item => (
                      <div key={item.icon} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4a4a65', fontWeight: 300 }}>
                        <span>{item.icon}</span>{item.text}
                      </div>
                    ))}
                  </div>

                  {b.status === 'pending' && (
                    <button onClick={() => cancelBooking(b.id)}
                      style={{ padding: '8px 18px', background: 'transparent', border: '0.5px solid #ef444420', borderRadius: 8, color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>
                      Annuler la demande
                    </button>
                  )}

                  {b.status === 'completed' && (
                    <a href={`/mon-espace/avis?booking=${b.id}`} style={{ textDecoration: 'none' }}>
                      <button style={{ padding: '8px 18px', background: 'transparent', border: '0.5px solid #6366f144', borderRadius: 8, color: '#6366f1', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>
                        ⭐ Laisser un avis
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


