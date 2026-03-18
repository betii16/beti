'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ArtisanTagsInput } from '@/components/OtherCategory'
import { ArtisanZonePicker } from '@/components/ArtisanZonePicker'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Types ──────────────────────────────────────────────────────────

type Booking = {
  id: string
  title: string
  description: string | null
  address: string
  scheduled_at: string
  status: string
  price_agreed: number | null
  created_at: string
  profiles: { full_name: string; phone: string | null; avatar_url: string | null } | null
}

type ArtisanStats = {
  total_missions: number
  rating_avg: number
  rating_count: number
  is_available: boolean
  hourly_rate: number
  category: string
}

// ── Status config ──────────────────────────────────────────────────

const STATUS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pending:     { label: 'En attente',  bg: '#2a2010', color: '#C9A84C', border: '#3a3010' },
  accepted:    { label: 'Accepté',     bg: '#0d1a2a', color: '#60a5fa', border: '#1a2a3a' },
  in_progress: { label: 'En cours',   bg: '#1a0a2a', color: '#a78bfa', border: '#2a1a3a' },
  completed:   { label: 'Terminé',    bg: '#0a2010', color: '#4ade80', border: '#0a3a20' },
  refused:     { label: 'Refusé',     bg: '#1a0a0a', color: '#f87171', border: '#2a1010' },
  cancelled:   { label: 'Annulé',     bg: '#1a1a1a', color: '#666',    border: '#2a2a2a' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] || STATUS.pending
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: s.bg, color: s.color, border: `0.5px solid ${s.border}`, fontFamily: 'Nexa, sans-serif' }}>
      {s.label}
    </span>
  )
}

// ── Booking Card ───────────────────────────────────────────────────

function BookingCard({ booking, onAccept, onRefuse, onComplete }: {
  booking: Booking
  onAccept: (id: string) => void
  onRefuse: (id: string) => void
  onComplete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ background: '#161620', border: `0.5px solid ${booking.status === 'pending' ? '#C9A84C33' : '#2a2a3a'}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.3s' }}>
      {/* Barre statut en haut */}
      {booking.status === 'pending' && (
        <div style={{ height: 2, background: 'linear-gradient(90deg, #C9A84C, #f59e0b)' }}/>
      )}

      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#888', fontWeight: 800, flexShrink: 0 }}>
              {(booking.profiles?.full_name || 'C')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8', marginBottom: 2 }}>{booking.profiles?.full_name || 'Client'}</div>
              {booking.profiles?.phone && <div style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>{booking.profiles.phone}</div>}
            </div>
          </div>
          <StatusBadge status={booking.status}/>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', marginBottom: 6 }}>{booking.title}</div>
          {booking.description && (
            <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, fontWeight: 300, display: expanded ? 'block' : '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {booking.description}
            </div>
          )}
          {booking.description && booking.description.length > 80 && (
            <button onClick={() => setExpanded(!expanded)} style={{ background: 'transparent', border: 'none', color: '#C9A84C', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300, marginTop: 4 }}>
              {expanded ? 'Voir moins' : 'Voir plus'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
          {[
            { icon: '📍', text: booking.address },
            { icon: '📅', text: fmt(booking.scheduled_at) },
            { icon: '💶', text: booking.price_agreed ? `${booking.price_agreed} DA/h` : 'Tarif à définir' },
          ].map(item => (
            <div key={item.icon} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666', fontWeight: 300 }}>
              <span style={{ fontSize: 13 }}>{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>

        {/* Actions */}
        {booking.status === 'pending' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onRefuse(booking.id)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '0.5px solid #2a1010', borderRadius: 10, color: '#f87171', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300, transition: 'all 0.2s' }}
              onMouseEnter={e => (e.target as HTMLElement).style.background = '#1a0a0a'}
              onMouseLeave={e => (e.target as HTMLElement).style.background = 'transparent'}
            >Refuser</button>
            <button onClick={() => onAccept(booking.id)} style={{ flex: 2, padding: '10px', background: '#C9A84C', border: 'none', borderRadius: 10, color: '#0D0D12', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s' }}
              onMouseEnter={e => (e.target as HTMLElement).style.background = '#d4b55a'}
              onMouseLeave={e => (e.target as HTMLElement).style.background = '#C9A84C'}
            >✓ Accepter la mission</button>
          </div>
        )}
        {booking.status === 'accepted' && (
          <button onClick={() => onComplete(booking.id)} style={{ width: '100%', padding: '10px', background: 'transparent', border: '0.5px solid #4ade8044', borderRadius: 10, color: '#4ade80', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s' }}
            onMouseEnter={e => (e.target as HTMLElement).style.background = '#0a2010'}
            onMouseLeave={e => (e.target as HTMLElement).style.background = 'transparent'}
          >Marquer comme terminé</button>
        )}
      </div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────

export default function ArtisanDashboard() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<ArtisanStats | null>(null)
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
    if (!user) { router.push('/auth/login'); return }
    setUser(user)

    // Charger les stats artisan
    const { data: artisanData } = await supabase
      .from('artisans')
      .select('total_missions, rating_avg, rating_count, is_available, hourly_rate, category')
      .eq('id', user.id)
      .single()

    if (!artisanData) { router.push('/'); return }
    setStats(artisanData)
    setIsAvailable(artisanData.is_available)

    // Charger les réservations
    await loadBookings(user.id)

    // Écoute temps réel
    channelRef.current = supabase
      .channel(`artisan-bookings-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'bookings',
        filter: `artisan_id=eq.${user.id}`,
      }, async (payload) => {
        const { data } = await supabase
          .from('bookings')
          .select('*, profiles!bookings_client_id_fkey(full_name, phone, avatar_url)')
          .eq('id', payload.new.id)
          .single()
        if (data) {
          setBookings(prev => [data, ...prev])
          setNewBookingAlert(data)
          setTimeout(() => setNewBookingAlert(null), 8000)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'bookings',
        filter: `artisan_id=eq.${user.id}`,
      }, () => loadBookings(user.id))
      .subscribe()

    setLoading(false)
  }

  const loadBookings = async (userId: string) => {
    const { data } = await supabase
      .from('bookings')
      .select('*, profiles!bookings_client_id_fkey(full_name, phone, avatar_url)')
      .eq('artisan_id', userId)
      .order('created_at', { ascending: false })
    if (data) setBookings(data)
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('bookings').update({ status, ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}) }).eq('id', id)

    // Notifier le client
    const booking = bookings.find(b => b.id === id)
    if (booking) {
      const { data: bookingFull } = await supabase.from('bookings').select('client_id').eq('id', id).single()
      if (bookingFull) {
        await supabase.from('notifications').insert({
          user_id: bookingFull.client_id,
          type: status === 'accepted' ? 'booking_accepted' : status === 'refused' ? 'booking_refused' : 'booking_completed',
          title: status === 'accepted' ? 'Réservation acceptée !' : status === 'refused' ? 'Réservation refusée' : 'Mission terminée !',
          body: status === 'accepted' ? `Votre demande "${booking.title}" a été acceptée.` : `Votre demande "${booking.title}" a été ${status === 'refused' ? 'refusée' : 'terminée'}.`,
        })
      }
    }

    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
  }

  const toggleAvailability = async () => {
    const newVal = !isAvailable
    await supabase.from('artisans').update({ is_available: newVal }).eq('id', user.id)
    setIsAvailable(newVal)
  }

  const pending   = bookings.filter(b => b.status === 'pending')
  const active    = bookings.filter(b => ['accepted', 'in_progress'].includes(b.status))
  const history   = bookings.filter(b => ['completed', 'refused', 'cancelled'].includes(b.status))
  const monthRevenue = bookings.filter(b => b.status === 'completed' && new Date(b.created_at).getMonth() === new Date().getMonth()).reduce((sum, b) => sum + (b.price_agreed || 0), 0)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: '#555', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>Chargement...</div>
    </div>
  )

  return (
    <>
      <style>{`
        @font-face { font-family: 'Nexa'; src: url('/fonts/Nexa-Heavy.ttf') format('truetype'); font-weight: 800; }
        @font-face { font-family: 'Nexa'; src: url('/fonts/Nexa-ExtraLight.ttf') format('truetype'); font-weight: 300; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0D0D12; font-family: 'Nexa', sans-serif; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 2px; }
        @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 60, background: 'rgba(9,9,15,0.97)', backdropFilter: 'blur(20px)', borderBottom: '0.5px solid #1e1e2a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, background: '#C9A84C', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#0D0D12' }}>B</div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#F0EDE8', letterSpacing: '0.1em' }}>BETI</span>
          <span style={{ fontSize: 10, color: '#555', marginLeft: 4, fontWeight: 300, letterSpacing: '0.08em' }}>ESPACE ARTISAN</span>
        </a>

        {/* Toggle disponibilité */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: isAvailable ? '#4ade80' : '#555', fontWeight: 300 }}>
            {isAvailable ? 'En ligne' : 'Hors ligne'}
          </span>
          <div
            onClick={toggleAvailability}
            style={{ width: 44, height: 24, borderRadius: 12, background: isAvailable ? '#0a3020' : '#1a1a2a', border: `0.5px solid ${isAvailable ? '#4ade80' : '#2a2a3a'}`, cursor: 'pointer', position: 'relative', transition: 'all 0.3s' }}
          >
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: isAvailable ? '#4ade80' : '#555', position: 'absolute', top: 2, left: isAvailable ? 22 : 3, transition: 'all 0.3s', boxShadow: isAvailable ? '0 0 8px #4ade8088' : 'none' }}/>
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} style={{ padding: '6px 14px', background: 'transparent', border: '0.5px solid #2a2a3a', borderRadius: 8, color: '#555', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>
            Déconnexion
          </button>
        </div>
      </nav>

      <div style={{ paddingTop: 60, minHeight: '100vh', background: '#0D0D12' }}>

        {/* Header avec stats */}
        <div style={{ background: '#09090f', borderBottom: '0.5px solid #1e1e2a', padding: '32px' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ marginBottom: 8, fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800 }}>TABLEAU DE BORD</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8', marginBottom: 24 }}>Bonjour 👋</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[
                { value: pending.length, label: 'Demandes en attente', color: '#C9A84C', bg: '#1a1508' },
                { value: active.length, label: 'Missions en cours', color: '#60a5fa', bg: '#0d1a2a' },
                { value: stats?.total_missions || 0, label: 'Total missions', color: '#F0EDE8', bg: '#161620' },
                { value: `${monthRevenue} DA`, label: 'Revenus ce mois', color: '#4ade80', bg: '#0a2010' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, border: '0.5px solid #2a2a3a', borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.color, marginBottom: 6 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px' }}>

          {/* Onglets */}
          <div style={{ display: 'flex', borderBottom: '0.5px solid #2a2a3a', marginBottom: 28 }}>
            {[
              { id: 'pending', label: `Demandes`, count: pending.length },
              { id: 'active',  label: `En cours`,  count: active.length  },
              { id: 'history', label: `Historique`, count: history.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{ padding: '12px 20px', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? '#C9A84C' : 'transparent'}`, color: activeTab === tab.id ? '#C9A84C' : '#555', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span style={{ background: activeTab === tab.id ? '#C9A84C' : '#2a2a3a', color: activeTab === tab.id ? '#0D0D12' : '#888', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 20 }}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Liste réservations */}
          {(() => {
            const list = activeTab === 'pending' ? pending : activeTab === 'active' ? active : history
            if (list.length === 0) return (
              <div style={{ textAlign: 'center', padding: '64px 0', color: '#333', fontSize: 14, fontWeight: 300 }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
                Aucune {activeTab === 'pending' ? 'demande en attente' : activeTab === 'active' ? 'mission en cours' : 'mission dans l\'historique'}
              </div>
            )
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {list.map(b => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    onAccept={id => updateStatus(id, 'accepted')}
                    onRefuse={id => updateStatus(id, 'refused')}
                    onComplete={id => updateStatus(id, 'completed')}
                  />
                ))}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Zone d'intervention + Mots-clés */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 40px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 16, padding: '24px' }}>
          <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 16 }}>MA ZONE D'INTERVENTION</div>
          {user && <ArtisanZonePicker artisanId={user.id} initialRadius={stats?.intervention_radius_km || 20} onSave={data => console.log('Zone sauvegardée', data)}/>}
        </div>
        <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 16, padding: '24px' }}>
          <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 16 }}>MES SPÉCIALITÉS</div>
          {user && <ArtisanTagsInput artisanId={user.id} initialTags={[]}/>}
        </div>
      </div>

      {/* Notification nouvelle réservation */}
      {newBookingAlert && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 400, background: '#161620', border: '0.5px solid #C9A84C44', borderRadius: 16, padding: '20px 24px', maxWidth: 340, animation: 'slideIn 0.4s ease', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <div style={{ height: 2, background: '#C9A84C', borderRadius: 1, marginBottom: 14, marginTop: -20, marginLeft: -24, marginRight: -24 }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C9A84C', boxShadow: '0 0 8px #C9A84C' }}/>
            <span style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.08em' }}>NOUVELLE DEMANDE</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8', marginBottom: 4 }}>{newBookingAlert.title}</div>
          <div style={{ fontSize: 12, color: '#555', fontWeight: 300, marginBottom: 14 }}>
            De {newBookingAlert.profiles?.full_name || 'Client'} · {newBookingAlert.address}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { updateStatus(newBookingAlert.id, 'refused'); setNewBookingAlert(null) }} style={{ flex: 1, padding: '8px', background: 'transparent', border: '0.5px solid #2a1010', borderRadius: 8, color: '#f87171', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>Refuser</button>
            <button onClick={() => { updateStatus(newBookingAlert.id, 'accepted'); setNewBookingAlert(null) }} style={{ flex: 2, padding: '8px', background: '#C9A84C', border: 'none', borderRadius: 8, color: '#0D0D12', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>✓ Accepter</button>
          </div>
        </div>
      )}
    </>
  )
}
