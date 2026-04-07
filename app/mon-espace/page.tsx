'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Tab = 'overview' | 'artisans' | 'bookings' | 'users' | 'reviews'

type Stats = {
  totalArtisans: number
  activeArtisans: number
  pendingArtisans: number
  totalBookings: number
  completedBookings: number
  pendingBookings: number
  totalUsers: number
  totalReviews: number
  revenue: number
}

type ArtisanRow = {
  id: string
  category: string
  is_available: boolean
  rating_avg: number
  rating_count: number
  total_missions: number
  hourly_rate: number
  location_city: string
  created_at: string
  status?: string
  profiles: { full_name: string; phone: string; avatar_url: string | null } | null
}

type BookingRow = {
  id: string
  title: string
  description: string | null
  address: string
  scheduled_at: string
  status: string
  price_agreed: number | null
  created_at: string
  client: { full_name: string } | null
  artisan: { full_name: string } | null
}

type UserRow = {
  id: string
  full_name: string
  phone: string
  role: string
  created_at: string
  avatar_url: string | null
}

type ReviewRow = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  client: { full_name: string } | null
  artisan_profile: { full_name: string } | null
}

// ── Helpers ──

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  active:      { label: 'Actif',       bg: '#0a2010', color: '#4ade80', border: '#0a3a20' },
  pending:     { label: 'En attente',  bg: '#2a2010', color: '#C9A84C', border: '#3a3010' },
  suspended:   { label: 'Suspendu',    bg: '#1a0a0a', color: '#f87171', border: '#2a1010' },
  completed:   { label: 'Terminé',     bg: '#0a2010', color: '#4ade80', border: '#0a3a20' },
  accepted:    { label: 'Accepté',     bg: '#0d1a2a', color: '#60a5fa', border: '#1a2a3a' },
  in_progress: { label: 'En cours',    bg: '#1a0a2a', color: '#a78bfa', border: '#2a1a3a' },
  refused:     { label: 'Refusé',      bg: '#1a0a0a', color: '#f87171', border: '#2a1010' },
  cancelled:   { label: 'Annulé',      bg: '#1a1a1a', color: '#666',    border: '#2a2a2a' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}`, fontFamily: 'Nexa, sans-serif' }}>
      {cfg.label}
    </span>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Hier'
  if (diff < 7) return `Il y a ${diff}j`
  if (diff < 30) return `Il y a ${Math.floor(diff / 7)} sem.`
  return `Il y a ${Math.floor(diff / 30)} mois`
}

// ── Page principale ──

export default function AdminDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [stats, setStats] = useState<Stats>({ totalArtisans: 0, activeArtisans: 0, pendingArtisans: 0, totalBookings: 0, completedBookings: 0, pendingBookings: 0, totalUsers: 0, totalReviews: 0, revenue: 0 })
  const [artisans, setArtisans] = useState<ArtisanRow[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [artisanFilter, setArtisanFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all')
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all')

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // Vérifier si l'user est admin (role = 'admin' dans profiles)
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
      // Pour le dev, accepter aussi si c'est le premier user inscrit
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      if (count === null || count > 1) {
        router.push('/')
        return
      }
    }
    setIsAdmin(true)
    await loadAll()
    setLoading(false)
  }

  const loadAll = async () => {
    await Promise.all([loadStats(), loadArtisans(), loadBookings(), loadUsers(), loadReviews()])
  }

  const loadStats = async () => {
    const [
      { count: totalArtisans },
      { count: activeArtisans },
      { count: pendingArtisans },
      { count: totalBookings },
      { count: completedBookings },
      { count: pendingBookings },
      { count: totalUsers },
      { count: totalReviews },
    ] = await Promise.all([
      supabase.from('artisans').select('*', { count: 'exact', head: true }),
      supabase.from('artisans').select('*', { count: 'exact', head: true }).eq('is_available', true),
      supabase.from('artisans').select('*', { count: 'exact', head: true }).eq('is_available', false),
      supabase.from('bookings').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }),
    ])

    // Revenus = somme des bookings completed
    const { data: revData } = await supabase.from('bookings').select('price_agreed').eq('status', 'completed')
    const revenue = (revData || []).reduce((s: number, b: any) => s + (b.price_agreed || 0), 0)

    setStats({
      totalArtisans: totalArtisans || 0,
      activeArtisans: activeArtisans || 0,
      pendingArtisans: pendingArtisans || 0,
      totalBookings: totalBookings || 0,
      completedBookings: completedBookings || 0,
      pendingBookings: pendingBookings || 0,
      totalUsers: totalUsers || 0,
      totalReviews: totalReviews || 0,
      revenue,
    })
  }

  const loadArtisans = async () => {
    const { data } = await supabase
      .from('artisans')
      .select('id, category, is_available, rating_avg, rating_count, total_missions, hourly_rate, location_city, created_at, profiles!inner(full_name, phone, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (data) setArtisans(data as any)
  }

  const loadBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('id, title, description, address, scheduled_at, status, price_agreed, created_at, client:profiles!bookings_client_id_fkey(full_name), artisan:profiles!bookings_artisan_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (data) setBookings(data as any)
  }

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone, role, created_at, avatar_url')
      .order('created_at', { ascending: false })
      .limit(100)
    if (data) setUsers(data as any)
  }

  const loadReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, client:profiles!reviews_client_id_fkey(full_name), artisan_profile:profiles!reviews_artisan_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (data) setReviews(data as any)
  }

  // ── Actions admin ──

  const toggleArtisanAvailability = async (id: string, available: boolean) => {
    await supabase.from('artisans').update({ is_available: available }).eq('id', id)
    await loadArtisans()
    await loadStats()
  }

  const updateBookingStatus = async (id: string, status: string) => {
    await supabase.from('bookings').update({ status }).eq('id', id)
    await loadBookings()
    await loadStats()
  }

  const deleteReview = async (id: string) => {
    if (!confirm('Supprimer cet avis ?')) return
    await supabase.from('reviews').delete().eq('id', id)
    await loadReviews()
    await loadStats()
  }

  // ── Filtres ──

  const filteredArtisans = artisans.filter(a => {
    if (artisanFilter === 'active') return a.is_available
    if (artisanFilter === 'pending') return !a.is_available && (a.total_missions || 0) === 0
    if (artisanFilter === 'suspended') return !a.is_available && (a.total_missions || 0) > 0
    return true
  })

  const filteredBookings = bookings.filter(b => {
    if (bookingFilter === 'pending') return b.status === 'pending'
    if (bookingFilter === 'completed') return b.status === 'completed'
    if (bookingFilter === 'cancelled') return b.status === 'cancelled' || b.status === 'refused'
    return true
  })

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, background: '#C9A84C', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#0D0D12', margin: '0 auto 16px' }}>B</div>
          <div style={{ fontSize: 14, color: '#555' }}>Chargement du dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style suppressHydrationWarning>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0D0D12; font-family: 'Nexa', sans-serif; -webkit-font-smoothing: antialiased; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 2px; }
        table { border-collapse: collapse; width: 100%; }
        th { font-size: 11px; font-weight: 800; color: #555; letter-spacing: 0.06em; padding: 12px 16px; text-align: left; border-bottom: 0.5px solid #2a2a3a; font-family: Nexa, sans-serif; }
        td { font-size: 13px; color: #F0EDE8; padding: 14px 16px; border-bottom: 0.5px solid #1e1e2a; font-family: Nexa, sans-serif; font-weight: 300; }
        tr:hover td { background: #1a1a24; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: '#0D0D12' }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: 220, background: '#09090f', borderRight: '0.5px solid #1e1e2a', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}>
          <div style={{ padding: '24px 20px', borderBottom: '0.5px solid #1e1e2a', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: '#C9A84C', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#0D0D12' }}>B</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', letterSpacing: '0.06em' }}>BETI</div>
              <div style={{ fontSize: 9, color: '#C9A84C', letterSpacing: '0.08em', fontWeight: 800 }}>ADMIN</div>
            </div>
          </div>

          <nav style={{ padding: '16px 12px', flex: 1 }}>
            {([
              { id: 'overview', icon: '◈', label: 'Vue d\'ensemble' },
              { id: 'artisans', icon: '👷', label: 'Artisans', badge: stats.pendingArtisans },
              { id: 'bookings', icon: '📋', label: 'Réservations', badge: stats.pendingBookings },
              { id: 'users',    icon: '👤', label: 'Utilisateurs' },
              { id: 'reviews',  icon: '⭐', label: 'Avis' },
            ] as const).map(item => (
              <button key={item.id} onClick={() => setTab(item.id as Tab)}
                style={{
                  width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
                  background: tab === item.id ? '#1a1508' : 'transparent',
                  border: tab === item.id ? '0.5px solid #2a2010' : '0.5px solid transparent',
                  borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                  color: tab === item.id ? '#C9A84C' : '#555',
                  fontSize: 13, fontFamily: 'Nexa, sans-serif', fontWeight: tab === item.id ? 800 : 300,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                {'badge' in item && (item as any).badge > 0 && (
                  <span style={{ padding: '1px 7px', borderRadius: 10, background: '#C9A84C', color: '#0D0D12', fontSize: 10, fontWeight: 800 }}>
                    {(item as any).badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div style={{ padding: '16px 20px', borderTop: '0.5px solid #1e1e2a' }}>
            <a href="/" style={{ fontSize: 12, color: '#444', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>
              ← Retour au site
            </a>
          </div>
        </aside>

        {/* ── Contenu principal ── */}
        <main style={{ flex: 1, overflow: 'auto' }}>
          {/* Header */}
          <div style={{ padding: '24px 32px', borderBottom: '0.5px solid #1e1e2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#09090f', position: 'sticky', top: 0, zIndex: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.08em', marginBottom: 4, fontWeight: 800 }}>TABLEAU DE BORD</div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F0EDE8', fontFamily: 'Nexa, sans-serif' }}>
                {{ overview: 'Vue d\'ensemble', artisans: 'Gestion des artisans', bookings: 'Réservations', users: 'Utilisateurs', reviews: 'Avis & Modération' }[tab]}
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => { setLoading(true); loadAll().then(() => setLoading(false)) }}
                style={{ padding: '6px 14px', background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 8, color: '#888', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>
                ↻ Actualiser
              </button>
              <div style={{ fontSize: 12, color: '#555', padding: '6px 12px', background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 8, fontWeight: 300 }}>
                {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          <div style={{ padding: '32px' }}>

            {/* ═══ VUE D'ENSEMBLE ═══ */}
            {tab === 'overview' && (
              <div style={{ animation: 'fadeUp 0.4s ease' }}>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                  {[
                    { label: 'Revenus total', value: `${stats.revenue.toLocaleString('fr-DZ')} DA`, icon: '💰', color: '#C9A84C' },
                    { label: 'Réservations', value: stats.totalBookings.toString(), icon: '📋', color: '#60a5fa', sub: `${stats.completedBookings} terminées` },
                    { label: 'Utilisateurs', value: stats.totalUsers.toString(), icon: '👤', color: '#a78bfa' },
                    { label: 'Artisans', value: stats.totalArtisans.toString(), icon: '👷', color: '#4ade80', sub: `${stats.activeArtisans} actifs` },
                    { label: 'Avis', value: stats.totalReviews.toString(), icon: '⭐', color: '#f59e0b' },
                    { label: 'En attente', value: stats.pendingBookings.toString(), icon: '⏳', color: '#f87171' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '20px 22px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>{s.label}</span>
                        <span style={{ fontSize: 18 }}>{s.icon}</span>
                      </div>
                      <div style={{ fontSize: 32, fontWeight: 800, color: s.color, fontFamily: 'Nexa, sans-serif', lineHeight: 1 }}>{s.value}</div>
                      {s.sub && <div style={{ fontSize: 11, color: '#555', marginTop: 6, fontWeight: 300 }}>{s.sub}</div>}
                    </div>
                  ))}
                </div>

                {/* Réservations en attente */}
                <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
                  <div style={{ padding: '18px 24px', borderBottom: '0.5px solid #2a2a3a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8' }}>Réservations en attente</span>
                    <span style={{ padding: '3px 10px', borderRadius: 20, background: '#2a2010', color: '#C9A84C', border: '0.5px solid #3a3010', fontSize: 11, fontWeight: 800 }}>
                      {bookings.filter(b => b.status === 'pending').length}
                    </span>
                  </div>
                  {bookings.filter(b => b.status === 'pending').length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#444', fontSize: 13, fontWeight: 300 }}>Aucune réservation en attente ✓</div>
                  ) : (
                    <table>
                      <thead><tr><th>CLIENT</th><th>ARTISAN</th><th>SERVICE</th><th>MONTANT</th><th>DATE</th><th>ACTIONS</th></tr></thead>
                      <tbody>
                        {bookings.filter(b => b.status === 'pending').slice(0, 5).map(b => (
                          <tr key={b.id}>
                            <td style={{ fontWeight: 800 }}>{b.client?.full_name || '—'}</td>
                            <td>{b.artisan?.full_name || '—'}</td>
                            <td>{b.title}</td>
                            <td style={{ color: '#C9A84C', fontWeight: 800 }}>{(b.price_agreed || 0).toLocaleString('fr-DZ')} DA</td>
                            <td style={{ color: '#555' }}>{formatDate(b.scheduled_at)}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => updateBookingStatus(b.id, 'accepted')}
                                  style={{ padding: '4px 12px', borderRadius: 6, background: '#0a2010', border: '0.5px solid #0a3a20', color: '#4ade80', fontSize: 11, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 800 }}>
                                  Accepter
                                </button>
                                <button onClick={() => updateBookingStatus(b.id, 'cancelled')}
                                  style={{ padding: '4px 12px', borderRadius: 6, background: '#1a0a0a', border: '0.5px solid #2a1010', color: '#f87171', fontSize: 11, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 800 }}>
                                  Annuler
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Dernières inscriptions artisans */}
                <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '0.5px solid #2a2a3a' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8' }}>Derniers artisans inscrits</span>
                  </div>
                  <table>
                    <thead><tr><th>ARTISAN</th><th>CATÉGORIE</th><th>VILLE</th><th>NOTE</th><th>STATUT</th></tr></thead>
                    <tbody>
                      {artisans.slice(0, 5).map(a => (
                        <tr key={a.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2a2010', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#C9A84C', fontWeight: 800 }}>
                                {(a.profiles?.full_name || 'A').split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <span style={{ fontWeight: 800 }}>{a.profiles?.full_name || '—'}</span>
                            </div>
                          </td>
                          <td>{a.category}</td>
                          <td>{a.location_city || '—'}</td>
                          <td style={{ color: a.rating_avg > 0 ? '#C9A84C' : '#444' }}>{a.rating_avg > 0 ? `⭐ ${a.rating_avg.toFixed(1)}` : '—'}</td>
                          <td><StatusBadge status={a.is_available ? 'active' : 'pending'}/></td>
                        </tr>
                      ))}
                      {artisans.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#444', padding: 32 }}>Aucun artisan inscrit</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══ ARTISANS ═══ */}
            {tab === 'artisans' && (
              <div style={{ animation: 'fadeUp 0.4s ease' }}>
                <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '0.5px solid #2a2a3a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8' }}>Tous les artisans ({filteredArtisans.length})</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {([['all', 'Tous'], ['active', 'Actifs'], ['pending', 'En attente'], ['suspended', 'Inactifs']] as const).map(([id, label]) => (
                        <button key={id} onClick={() => setArtisanFilter(id)}
                          style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, background: artisanFilter === id ? '#2a2010' : 'transparent', border: `0.5px solid ${artisanFilter === id ? '#3a3010' : '#2a2a3a'}`, color: artisanFilter === id ? '#C9A84C' : '#555', cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: artisanFilter === id ? 800 : 300 }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <table>
                    <thead><tr><th>ARTISAN</th><th>CATÉGORIE</th><th>VILLE</th><th>TARIF</th><th>NOTE</th><th>MISSIONS</th><th>STATUT</th><th>ACTIONS</th></tr></thead>
                    <tbody>
                      {filteredArtisans.map(a => (
                        <tr key={a.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2a2010', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#C9A84C', fontWeight: 800 }}>
                                {(a.profiles?.full_name || 'A').split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800 }}>{a.profiles?.full_name || '—'}</div>
                                <div style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>{a.profiles?.phone || ''}</div>
                              </div>
                            </div>
                          </td>
                          <td>{a.category}</td>
                          <td>{a.location_city || '—'}</td>
                          <td style={{ color: '#C9A84C', fontWeight: 800 }}>{(a.hourly_rate || 0).toLocaleString('fr-DZ')} DA</td>
                          <td style={{ color: a.rating_avg > 0 ? '#C9A84C' : '#444' }}>{a.rating_avg > 0 ? `⭐ ${a.rating_avg.toFixed(1)} (${a.rating_count})` : '—'}</td>
                          <td>{a.total_missions || 0}</td>
                          <td><StatusBadge status={a.is_available ? 'active' : 'suspended'}/></td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {!a.is_available ? (
                                <button onClick={() => toggleArtisanAvailability(a.id, true)}
                                  style={{ padding: '4px 10px', borderRadius: 6, background: '#0a2010', border: '0.5px solid #0a3a20', color: '#4ade80', fontSize: 11, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 800 }}>
                                  Activer
                                </button>
                              ) : (
                                <button onClick={() => toggleArtisanAvailability(a.id, false)}
                                  style={{ padding: '4px 10px', borderRadius: 6, background: '#1a0a0a', border: '0.5px solid #2a1010', color: '#f87171', fontSize: 11, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 800 }}>
                                  Désactiver
                                </button>
                              )}
                              <a href={`/artisan/${a.id}`} style={{ padding: '4px 10px', borderRadius: 6, background: '#161620', border: '0.5px solid #2a2a3a', color: '#888', fontSize: 11, textDecoration: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>
                                Voir
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredArtisans.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#444', padding: 32, fontWeight: 300 }}>Aucun artisan trouvé</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══ RÉSERVATIONS ═══ */}
            {tab === 'bookings' && (
              <div style={{ animation: 'fadeUp 0.4s ease' }}>
                <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '0.5px solid #2a2a3a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8' }}>Réservations ({filteredBookings.length})</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {([['all', 'Toutes'], ['pending', 'En attente'], ['completed', 'Terminées'], ['cancelled', 'Annulées']] as const).map(([id, label]) => (
                        <button key={id} onClick={() => setBookingFilter(id)}
                          style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, background: bookingFilter === id ? '#2a2010' : 'transparent', border: `0.5px solid ${bookingFilter === id ? '#3a3010' : '#2a2a3a'}`, color: bookingFilter === id ? '#C9A84C' : '#555', cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: bookingFilter === id ? 800 : 300 }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <table>
                    <thead><tr><th>CLIENT</th><th>ARTISAN</th><th>SERVICE</th><th>MONTANT</th><th>DATE PRÉVUE</th><th>STATUT</th><th>ACTIONS</th></tr></thead>
                    <tbody>
                      {filteredBookings.map(b => (
                        <tr key={b.id}>
                          <td style={{ fontWeight: 800 }}>{b.client?.full_name || '—'}</td>
                          <td>{b.artisan?.full_name || '—'}</td>
                          <td>{b.title}</td>
                          <td style={{ color: '#C9A84C', fontWeight: 800 }}>{(b.price_agreed || 0).toLocaleString('fr-DZ')} DA</td>
                          <td style={{ color: '#555' }}>{formatDate(b.scheduled_at)}</td>
                          <td><StatusBadge status={b.status}/></td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {b.status === 'pending' && (
                                <>
                                  <button onClick={() => updateBookingStatus(b.id, 'accepted')} style={{ padding: '4px 10px', borderRadius: 6, background: '#0a2010', border: '0.5px solid #0a3a20', color: '#4ade80', fontSize: 11, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 800 }}>Accepter</button>
                                  <button onClick={() => updateBookingStatus(b.id, 'cancelled')} style={{ padding: '4px 10px', borderRadius: 6, background: '#1a0a0a', border: '0.5px solid #2a1010', color: '#f87171', fontSize: 11, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 800 }}>Annuler</button>
                                </>
                              )}
                              {b.status === 'accepted' && (
                                <button onClick={() => updateBookingStatus(b.id, 'completed')} style={{ padding: '4px 10px', borderRadius: 6, background: '#0a2010', border: '0.5px solid #0a3a20', color: '#4ade80', fontSize: 11, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 800 }}>Terminer</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredBookings.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#444', padding: 32, fontWeight: 300 }}>Aucune réservation</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══ UTILISATEURS ═══ */}
            {tab === 'users' && (
              <div style={{ animation: 'fadeUp 0.4s ease' }}>
                <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '0.5px solid #2a2a3a' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8' }}>Utilisateurs ({users.length})</span>
                  </div>
                  <table>
                    <thead><tr><th>NOM</th><th>TÉLÉPHONE</th><th>RÔLE</th><th>INSCRIT LE</th></tr></thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}/>
                              ) : (
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#888', fontWeight: 800 }}>
                                  {(u.full_name || 'U')[0].toUpperCase()}
                                </div>
                              )}
                              <span style={{ fontWeight: 800 }}>{u.full_name || '—'}</span>
                            </div>
                          </td>
                          <td>{u.phone || '—'}</td>
                          <td>
                            <span style={{
                              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                              background: u.role === 'artisan' ? '#1a1508' : u.role === 'admin' ? '#1a0a2a' : '#161620',
                              color: u.role === 'artisan' ? '#C9A84C' : u.role === 'admin' ? '#a78bfa' : '#888',
                              border: `0.5px solid ${u.role === 'artisan' ? '#2a2010' : u.role === 'admin' ? '#2a1a3a' : '#2a2a3a'}`,
                            }}>
                              {u.role === 'artisan' ? 'Artisan' : u.role === 'admin' ? 'Admin' : 'Client'}
                            </span>
                          </td>
                          <td style={{ color: '#555' }}>{formatDate(u.created_at)}</td>
                        </tr>
                      ))}
                      {users.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#444', padding: 32, fontWeight: 300 }}>Aucun utilisateur</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══ AVIS & MODÉRATION ═══ */}
            {tab === 'reviews' && (
              <div style={{ animation: 'fadeUp 0.4s ease' }}>
                <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '0.5px solid #2a2a3a' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8' }}>Tous les avis ({reviews.length})</span>
                  </div>
                  {reviews.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#444', fontSize: 13, fontWeight: 300 }}>Aucun avis pour l'instant</div>
                  ) : (
                    <div style={{ padding: '16px' }}>
                      {reviews.map(r => (
                        <div key={r.id} style={{ background: '#0D0D12', border: '0.5px solid #1e1e2a', borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                <div style={{ display: 'flex', gap: 2 }}>
                                  {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: 12, color: i <= r.rating ? '#C9A84C' : '#2a2a3a' }}>★</span>)}
                                </div>
                                <span style={{ fontSize: 12, color: '#888', fontWeight: 300 }}>
                                  {r.client?.full_name || 'Client'} → {r.artisan_profile?.full_name || 'Artisan'}
                                </span>
                                <span style={{ fontSize: 11, color: '#444', fontWeight: 300 }}>{timeAgo(r.created_at)}</span>
                              </div>
                              {r.comment && <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, fontWeight: 300 }}>{r.comment}</p>}
                            </div>
                            <button onClick={() => deleteReview(r.id)}
                              style={{ padding: '4px 10px', borderRadius: 6, background: '#1a0a0a', border: '0.5px solid #2a1010', color: '#f87171', fontSize: 11, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 800, flexShrink: 0, marginLeft: 12 }}>
                              Supprimer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  )
}
