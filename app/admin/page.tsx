'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SkeletonPage } from '@/components/Skeleton'
import { LayoutDashboard, HardHat, ClipboardList, User, Star, Wallet, Clock } from 'lucide-react'

type Tab = 'overview' | 'artisans' | 'bookings' | 'users' | 'reviews' | 'subscriptions'

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

type SubRow = {
  id: string
  artisan_id: string
  plan: 'basic' | 'premium'
  cycle: 'monthly' | 'yearly'
  amount: number
  status: string
  payment_ref: string | null
  created_at: string
  profiles: { full_name: string; phone: string } | null
}

// ── Helpers ──

// Statuts → tokens de l'identité (lisibles en clair comme en sombre)
const STATUS_CONFIG: Record<string, { label: string; c: string }> = {
  active:      { label: 'Actif',       c: 'var(--success)' },
  pending:     { label: 'En attente',  c: 'var(--warning)' },
  suspended:   { label: 'Suspendu',    c: 'var(--danger)' },
  completed:   { label: 'Terminé',     c: 'var(--success)' },
  confirmed:   { label: 'Confirmé',    c: 'var(--accent)' },
  in_progress: { label: 'En cours',    c: 'var(--accent)' },
  refused:     { label: 'Refusé',      c: 'var(--danger)' },
  cancelled:   { label: 'Annulé',      c: 'var(--tx2)' },
  rejected:    { label: 'Refusé',      c: 'var(--danger)' },
  expired:     { label: 'Expiré',      c: 'var(--tx2)' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', background: `color-mix(in srgb, ${cfg.c} 13%, transparent)`, color: `color-mix(in srgb, ${cfg.c} 72%, var(--tx))`, border: `1px solid color-mix(in srgb, ${cfg.c} 25%, transparent)` }}>
      {cfg.label}
    </span>
  )
}

// Styles de l'admin, scopés sous .adm (l'ancien <style> écrasait margin/padding,
// la police et TOUTES les balises table/th/td de l'app tant que la page était montée).
// Mise en page responsive : barre latérale → onglets défilants sous 900px,
// tableaux défilables horizontalement au lieu d'écraser les colonnes.
const ADMIN_CSS = `
.adm{display:flex;min-height:100vh;padding-top:64px}
.adm-aside{width:220px;border-inline-end:1px solid var(--border);display:flex;flex-direction:column;position:sticky;top:64px;height:calc(100vh - 64px);flex-shrink:0;background:var(--bg)}
.adm-nav{padding:16px 12px;flex:1;display:flex;flex-direction:column;gap:4px}
.adm-nav-btn{width:100%;min-height:42px;padding:10px 12px;display:flex;align-items:center;gap:10px;background:transparent;border:1px solid transparent;border-radius:var(--r-btn);cursor:pointer;color:var(--tx2);font-size:14px;font-weight:500;text-align:start;white-space:nowrap;transition:background .15s,color .15s}
.adm-nav-btn:hover{background:var(--bg3);color:var(--tx)}
.adm-nav-btn[aria-current=page]{background:color-mix(in srgb,var(--accent) 11%,transparent);border-color:color-mix(in srgb,var(--accent) 22%,transparent);color:var(--accent);font-weight:700}
.adm-main{flex:1;min-width:0}
.adm-head{padding:20px 32px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;background:var(--bg);position:sticky;top:64px;z-index:10}
.adm-body{padding:28px 32px 48px}
.adm-panel{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r-card);overflow:hidden;box-shadow:var(--card-shadow)}
.adm-panel-head{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.adm-panel-title{font-size:16px;font-weight:800;color:var(--tx)}
.adm-pill{padding:3px 10px;border-radius:var(--r-pill);background:color-mix(in srgb,var(--accent) 13%,transparent);color:var(--accent);font-size:12px;font-weight:700}
.adm-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.adm table{border-collapse:collapse;width:100%;min-width:640px}
.adm th{font-size:11.5px;font-weight:700;color:var(--tx2);letter-spacing:.06em;padding:12px 16px;text-align:start;border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--bg3) 45%,transparent);white-space:nowrap}
.adm td{font-size:14px;color:var(--tx);padding:13px 16px;border-bottom:1px solid var(--border);vertical-align:middle}
.adm tbody tr:last-child td{border-bottom:none}
.adm tbody tr:hover td{background:color-mix(in srgb,var(--bg3) 50%,transparent)}
.adm td.muted{color:var(--tx2)}
.adm td.num-cell{font-weight:700;white-space:nowrap}
.adm-btn{min-height:34px;padding:6px 12px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap;text-decoration:none;display:inline-flex;align-items:center;border:1px solid}
.adm-btn-ok{background:color-mix(in srgb,var(--success) 11%,transparent);border-color:color-mix(in srgb,var(--success) 32%,transparent);color:color-mix(in srgb,var(--success) 75%,var(--tx))}
.adm-btn-no{background:color-mix(in srgb,var(--danger) 9%,transparent);border-color:color-mix(in srgb,var(--danger) 30%,transparent);color:var(--danger)}
.adm-btn-ghost{background:var(--bg2);border-color:var(--border2);color:var(--tx)}
.adm :is(a,button):focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media (pointer:coarse){.adm-btn{min-height:44px;padding:8px 14px}}
@media (max-width:900px){
  .adm{flex-direction:column}
  .adm-aside{width:auto;height:auto;position:static;border-inline-end:none;border-bottom:1px solid var(--border)}
  .adm-brand,.adm-back{display:none!important}
  .adm-nav{flex-direction:row;overflow-x:auto;padding:10px 12px;scrollbar-width:none}
  .adm-nav::-webkit-scrollbar{display:none}
  .adm-nav-btn{width:auto;flex-shrink:0}
  .adm-head{position:static;padding:16px}
  .adm-body{padding:16px 16px calc(110px + env(safe-area-inset-bottom))}
  .adm-panel-head{padding:14px 16px}
}
@keyframes admFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
`

const EMPTY: React.CSSProperties = { padding: '32px 16px', textAlign: 'center', color: 'var(--tx2)', fontSize: 14 }

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
  const [subs, setSubs] = useState<SubRow[]>([])
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
    await Promise.all([loadStats(), loadArtisans(), loadBookings(), loadUsers(), loadReviews(), loadSubscriptions()])
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

  const loadSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, artisan_id, plan, cycle, amount, status, payment_ref, created_at, profiles!subscriptions_artisan_id_fkey(full_name, phone)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (!error && data) setSubs(data as any)
    } catch { /* table subscriptions pas encore créée */ }
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

  const approveSub = async (s: SubRow) => {
    const now = new Date()
    const exp = new Date(now)
    if (s.cycle === 'yearly') exp.setFullYear(exp.getFullYear() + 1)
    else exp.setMonth(exp.getMonth() + 1)
    await supabase.from('subscriptions').update({ status: 'active', started_at: now.toISOString(), expires_at: exp.toISOString(), reviewed_at: now.toISOString() }).eq('id', s.id)
    await supabase.from('artisans').update({ plan: s.plan, plan_until: exp.toISOString() }).eq('id', s.artisan_id)
    await loadSubscriptions()
  }

  const rejectSub = async (s: SubRow) => {
    const reason = prompt('Motif du refus (optionnel) :') || null
    await supabase.from('subscriptions').update({ status: 'rejected', reviewed_at: new Date().toISOString(), note: reason }).eq('id', s.id)
    await loadSubscriptions()
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
    return <SkeletonPage stats rows={6} />
  }

  return (
    <>
      <style>{ADMIN_CSS}</style>

      <div className="adm" dir="ltr">

        {/* ── Sidebar ── */}
        <aside className="adm-aside">
          <div className="adm-brand" style={{ padding: '22px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div aria-hidden style={{ width: 34, height: 34, background: 'var(--accent)', boxShadow: '0 2px 0 var(--accent-ink)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff' }}>B</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', letterSpacing: '0.06em' }}>BETI</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.12em', fontWeight: 600 }}>ADMIN</div>
            </div>
          </div>

          <nav aria-label="Administration" className="adm-nav">
            {([
              { id: 'overview', Icon: LayoutDashboard, label: 'Vue d\'ensemble' },
              { id: 'artisans', Icon: HardHat, label: 'Artisans', badge: stats.pendingArtisans },
              { id: 'bookings', Icon: ClipboardList, label: 'Réservations', badge: stats.pendingBookings },
              { id: 'subscriptions', Icon: Wallet, label: 'Abonnements', badge: subs.filter(s => s.status === 'pending').length },
              { id: 'users',    Icon: User, label: 'Utilisateurs' },
              { id: 'reviews',  Icon: Star, label: 'Avis' },
            ] as const).map(item => (
              <button key={item.id} onClick={() => setTab(item.id as Tab)} aria-current={tab === item.id ? 'page' : undefined} className="adm-nav-btn">
                <item.Icon size={16} aria-hidden/>
                <span style={{ flex: 1 }}>{item.label}</span>
                {'badge' in item && (item as any).badge > 0 && (
                  <span className="num" style={{ padding: '1px 7px', borderRadius: 'var(--r-pill)', background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700 }}>
                    {(item as any).badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="adm-back" style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
            <a href="/" style={{ fontSize: 13, color: 'var(--tx2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, minHeight: 40 }}>
              ← Retour au site
            </a>
          </div>
        </aside>

        {/* ── Contenu principal ── */}
        <main className="adm-main">
          {/* Header */}
          <div className="adm-head">
            <div>
              <div className="section-label" style={{ marginBottom: 4 }}>Tableau de bord</div>
              <h1 style={{ fontSize: 'clamp(22px, 5vw, 26px)', lineHeight: 1.2, fontWeight: 800, color: 'var(--tx)' }}>
                {{ overview: 'Vue d\'ensemble', artisans: 'Gestion des artisans', bookings: 'Réservations', users: 'Utilisateurs', reviews: 'Avis & Modération', subscriptions: 'Abonnements' }[tab]}
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => { setLoading(true); loadAll().then(() => setLoading(false)) }} className="adm-btn adm-btn-ghost">
                ↻ Actualiser
              </button>
              <div style={{ fontSize: 13, color: 'var(--tx2)', padding: '6px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8 }}>
                {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          <div className="adm-body">

            {/* ═══ ABONNEMENTS ═══ */}
            {tab === 'subscriptions' && (
              <div style={{ animation: 'admFadeUp 0.4s ease' }}>
                <div className="adm-panel">
                  <div className="adm-panel-head">
                    <span className="adm-panel-title">Demandes d’abonnement</span>
                    <span className="adm-pill">
                      {subs.filter(s => s.status === 'pending').length} en attente
                    </span>
                  </div>
                  {subs.length === 0 ? (
                    <div style={EMPTY}>Aucune demande d’abonnement pour le moment.</div>
                  ) : (
                    <div className="adm-table-wrap"><table>
                      <thead><tr><th>ARTISAN</th><th>FORMULE</th><th>MONTANT</th><th>RÉF.</th><th>DATE</th><th>STATUT</th><th>ACTIONS</th></tr></thead>
                      <tbody>
                        {subs.map(s => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 700 }}>{s.profiles?.full_name || '—'}<div style={{ fontSize: 12.5, color: 'var(--tx2)', fontWeight: 400 }}>{s.profiles?.phone || ''}</div></td>
                            <td>{s.plan === 'premium' ? 'Premium' : 'Basic'} · {s.cycle === 'yearly' ? 'Annuel' : 'Mensuel'}</td>
                            <td className="num num-cell">{(s.amount || 0).toLocaleString('fr-DZ')} DA</td>
                            <td className="muted mono">{s.payment_ref || '—'}</td>
                            <td className="muted">{formatDate(s.created_at)}</td>
                            <td><StatusBadge status={s.status} /></td>
                            <td>
                              {s.status === 'pending' ? (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => approveSub(s)} className="adm-btn adm-btn-ok">Valider</button>
                                  <button onClick={() => rejectSub(s)} className="adm-btn adm-btn-no">Refuser</button>
                                </div>
                              ) : <span style={{ color: 'var(--tx2)' }}>—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ VUE D'ENSEMBLE ═══ */}
            {tab === 'overview' && (
              <div style={{ animation: 'admFadeUp 0.4s ease' }}>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
                  {[
                    { label: 'Revenus total', value: `${stats.revenue.toLocaleString('fr-DZ')} DA`, Icon: Wallet, color: 'var(--success)' },
                    { label: 'Réservations', value: stats.totalBookings.toString(), Icon: ClipboardList, color: 'var(--accent)', sub: `${stats.completedBookings} terminées` },
                    { label: 'Utilisateurs', value: stats.totalUsers.toString(), Icon: User, color: 'var(--accent)' },
                    { label: 'Artisans', value: stats.totalArtisans.toString(), Icon: HardHat, color: 'var(--zellige)', sub: `${stats.activeArtisans} actifs` },
                    { label: 'Avis', value: stats.totalReviews.toString(), Icon: Star, color: 'var(--laiton)' },
                    { label: 'En attente', value: stats.pendingBookings.toString(), Icon: Clock, color: 'var(--warning)' },
                  ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.label}</span>
                        <span aria-hidden style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: s.color, background: `color-mix(in srgb, ${s.color} 13%, transparent)` }}><s.Icon size={16}/></span>
                      </div>
                      <div className="num" style={{ fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 800, color: 'var(--tx)', lineHeight: 1, whiteSpace: 'nowrap' }}>{s.value}</div>
                      {s.sub && <div style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 8 }}>{s.sub}</div>}
                    </div>
                  ))}
                </div>

                {/* Réservations en attente */}
                <div className="adm-panel" style={{ marginBottom: 24 }}>
                  <div className="adm-panel-head">
                    <span className="adm-panel-title">Réservations en attente</span>
                    <span className="adm-pill">
                      {bookings.filter(b => b.status === 'pending').length}
                    </span>
                  </div>
                  {bookings.filter(b => b.status === 'pending').length === 0 ? (
                    <div style={EMPTY}>Aucune réservation en attente ✓</div>
                  ) : (
                    <div className="adm-table-wrap"><table>
                      <thead><tr><th>CLIENT</th><th>ARTISAN</th><th>SERVICE</th><th>MONTANT</th><th>DATE</th><th>ACTIONS</th></tr></thead>
                      <tbody>
                        {bookings.filter(b => b.status === 'pending').slice(0, 5).map(b => (
                          <tr key={b.id}>
                            <td style={{ fontWeight: 700 }}>{b.client?.full_name || '—'}</td>
                            <td>{b.artisan?.full_name || '—'}</td>
                            <td>{b.title}</td>
                            <td className="num num-cell">{(b.price_agreed || 0).toLocaleString('fr-DZ')} DA</td>
                            <td className="muted">{formatDate(b.scheduled_at)}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => updateBookingStatus(b.id, 'confirmed')}
                                  className="adm-btn adm-btn-ok">
                                  Accepter
                                </button>
                                <button onClick={() => updateBookingStatus(b.id, 'cancelled')}
                                  className="adm-btn adm-btn-no">
                                  Annuler
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                  )}
                </div>

                {/* Dernières inscriptions artisans */}
                <div className="adm-panel">
                  <div className="adm-panel-head">
                    <span className="adm-panel-title">Derniers artisans inscrits</span>
                  </div>
                  <div className="adm-table-wrap"><table>
                    <thead><tr><th>ARTISAN</th><th>CATÉGORIE</th><th>VILLE</th><th>NOTE</th><th>STATUT</th></tr></thead>
                    <tbody>
                      {artisans.slice(0, 5).map(a => (
                        <tr key={a.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'color-mix(in srgb, var(--accent) 13%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--accent)', fontWeight: 800 }}>
                                {(a.profiles?.full_name || 'A').split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <span style={{ fontWeight: 800 }}>{a.profiles?.full_name || '—'}</span>
                            </div>
                          </td>
                          <td>{a.category}</td>
                          <td>{a.location_city || '—'}</td>
                          <td className={a.rating_avg > 0 ? 'num' : 'muted'}>{a.rating_avg > 0 ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Star size={12} fill="var(--laiton)" strokeWidth={0} aria-hidden/>{a.rating_avg.toFixed(1)}</span> : '—'}</td>
                          <td><StatusBadge status={a.is_available ? 'active' : 'pending'}/></td>
                        </tr>
                      ))}
                      {artisans.length === 0 && <tr><td colSpan={5} style={EMPTY}>Aucun artisan inscrit</td></tr>}
                    </tbody>
                  </table></div>
                </div>
              </div>
            )}

            {/* ═══ ARTISANS ═══ */}
            {tab === 'artisans' && (
              <div style={{ animation: 'admFadeUp 0.4s ease' }}>
                <div className="adm-panel">
                  <div className="adm-panel-head">
                    <span className="adm-panel-title">Tous les artisans ({filteredArtisans.length})</span>
                    <div role="group" aria-label="Filtrer les artisans" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {([['all', 'Tous'], ['active', 'Actifs'], ['pending', 'En attente'], ['suspended', 'Inactifs']] as const).map(([id, label]) => (
                        <button key={id} onClick={() => setArtisanFilter(id)} aria-pressed={artisanFilter === id}
                          className={artisanFilter === id ? 'chip chip-active' : 'chip'} style={{ padding: '7px 12px', minHeight: 36 }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="adm-table-wrap"><table>
                    <thead><tr><th>ARTISAN</th><th>CATÉGORIE</th><th>VILLE</th><th>TARIF</th><th>NOTE</th><th>MISSIONS</th><th>STATUT</th><th>ACTIONS</th></tr></thead>
                    <tbody>
                      {filteredArtisans.map(a => (
                        <tr key={a.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'color-mix(in srgb, var(--accent) 13%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--accent)', fontWeight: 800 }}>
                                {(a.profiles?.full_name || 'A').split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700 }}>{a.profiles?.full_name || '—'}</div>
                                <div style={{ fontSize: 12.5, color: 'var(--tx2)' }}>{a.profiles?.phone || ''}</div>
                              </div>
                            </div>
                          </td>
                          <td>{a.category}</td>
                          <td>{a.location_city || '—'}</td>
                          <td className="num num-cell">{(a.hourly_rate || 0).toLocaleString('fr-DZ')} DA</td>
                          <td className={a.rating_avg > 0 ? 'num' : 'muted'} style={{ whiteSpace: 'nowrap' }}>{a.rating_avg > 0 ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Star size={12} fill="var(--laiton)" strokeWidth={0} aria-hidden/>{a.rating_avg.toFixed(1)} <span style={{ color: 'var(--tx2)' }}>({a.rating_count})</span></span> : '—'}</td>
                          <td className="num">{a.total_missions || 0}</td>
                          <td><StatusBadge status={a.is_available ? 'active' : 'suspended'}/></td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {!a.is_available ? (
                                <button onClick={() => toggleArtisanAvailability(a.id, true)}
                                  className="adm-btn adm-btn-ok">
                                  Activer
                                </button>
                              ) : (
                                <button onClick={() => toggleArtisanAvailability(a.id, false)}
                                  className="adm-btn adm-btn-no">
                                  Désactiver
                                </button>
                              )}
                              <a href={`/artisan/${a.id}`} className="adm-btn adm-btn-ghost">
                                Voir
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredArtisans.length === 0 && <tr><td colSpan={8} style={EMPTY}>Aucun artisan trouvé</td></tr>}
                    </tbody>
                  </table></div>
                </div>
              </div>
            )}

            {/* ═══ RÉSERVATIONS ═══ */}
            {tab === 'bookings' && (
              <div style={{ animation: 'admFadeUp 0.4s ease' }}>
                <div className="adm-panel">
                  <div className="adm-panel-head">
                    <span className="adm-panel-title">Réservations ({filteredBookings.length})</span>
                    <div role="group" aria-label="Filtrer les réservations" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {([['all', 'Toutes'], ['pending', 'En attente'], ['completed', 'Terminées'], ['cancelled', 'Annulées']] as const).map(([id, label]) => (
                        <button key={id} onClick={() => setBookingFilter(id)} aria-pressed={bookingFilter === id}
                          className={bookingFilter === id ? 'chip chip-active' : 'chip'} style={{ padding: '7px 12px', minHeight: 36 }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="adm-table-wrap"><table>
                    <thead><tr><th>CLIENT</th><th>ARTISAN</th><th>SERVICE</th><th>MONTANT</th><th>DATE PRÉVUE</th><th>STATUT</th><th>ACTIONS</th></tr></thead>
                    <tbody>
                      {filteredBookings.map(b => (
                        <tr key={b.id}>
                          <td style={{ fontWeight: 700 }}>{b.client?.full_name || '—'}</td>
                          <td>{b.artisan?.full_name || '—'}</td>
                          <td>{b.title}</td>
                          <td className="num num-cell">{(b.price_agreed || 0).toLocaleString('fr-DZ')} DA</td>
                          <td className="muted">{formatDate(b.scheduled_at)}</td>
                          <td><StatusBadge status={b.status}/></td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {b.status === 'pending' && (
                                <>
                                  <button onClick={() => updateBookingStatus(b.id, 'confirmed')} className="adm-btn adm-btn-ok">Accepter</button>
                                  <button onClick={() => updateBookingStatus(b.id, 'cancelled')} className="adm-btn adm-btn-no">Annuler</button>
                                </>
                              )}
                              {b.status === 'confirmed' && (
                                <button onClick={() => updateBookingStatus(b.id, 'completed')} className="adm-btn adm-btn-ok">Terminer</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredBookings.length === 0 && <tr><td colSpan={7} style={EMPTY}>Aucune réservation</td></tr>}
                    </tbody>
                  </table></div>
                </div>
              </div>
            )}

            {/* ═══ UTILISATEURS ═══ */}
            {tab === 'users' && (
              <div style={{ animation: 'admFadeUp 0.4s ease' }}>
                <div className="adm-panel">
                  <div className="adm-panel-head">
                    <span className="adm-panel-title">Utilisateurs ({users.length})</span>
                  </div>
                  <div className="adm-table-wrap"><table>
                    <thead><tr><th>NOM</th><th>TÉLÉPHONE</th><th>RÔLE</th><th>INSCRIT LE</th></tr></thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}/>
                              ) : (
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--tx2)', fontWeight: 800 }}>
                                  {(u.full_name || 'U')[0].toUpperCase()}
                                </div>
                              )}
                              <span style={{ fontWeight: 700 }}>{u.full_name || '—'}</span>
                            </div>
                          </td>
                          <td>{u.phone || '—'}</td>
                          <td>
                            <span style={{
                              padding: '3px 10px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 700,
                              background: u.role === 'artisan' ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : u.role === 'admin' ? 'color-mix(in srgb, var(--brique) 13%, transparent)' : 'var(--bg3)',
                              color: u.role === 'artisan' ? 'var(--accent)' : u.role === 'admin' ? 'color-mix(in srgb, var(--brique) 75%, var(--tx))' : 'var(--tx2)',
                            }}>
                              {u.role === 'artisan' ? 'Artisan' : u.role === 'admin' ? 'Admin' : 'Client'}
                            </span>
                          </td>
                          <td className="muted">{formatDate(u.created_at)}</td>
                        </tr>
                      ))}
                      {users.length === 0 && <tr><td colSpan={4} style={EMPTY}>Aucun utilisateur</td></tr>}
                    </tbody>
                  </table></div>
                </div>
              </div>
            )}

            {/* ═══ AVIS & MODÉRATION ═══ */}
            {tab === 'reviews' && (
              <div style={{ animation: 'admFadeUp 0.4s ease' }}>
                <div className="adm-panel">
                  <div className="adm-panel-head">
                    <span className="adm-panel-title">Tous les avis ({reviews.length})</span>
                  </div>
                  {reviews.length === 0 ? (
                    <div style={EMPTY}>Aucun avis pour l'instant</div>
                  ) : (
                    <div style={{ padding: '16px' }}>
                      {reviews.map(r => (
                        <div key={r.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-field)', padding: '14px 16px', marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px 12px', flexWrap: 'wrap', marginBottom: 8 }}>
                                <div role="img" aria-label={`${r.rating}/5`} style={{ display: 'flex', gap: 2 }}>
                                  {[1,2,3,4,5].map(i => <Star key={i} size={14} fill={i <= r.rating ? 'var(--laiton)' : 'var(--border2)'} strokeWidth={0}/>)}
                                </div>
                                <span style={{ fontSize: 13.5, color: 'var(--tx)', fontWeight: 600 }}>
                                  {r.client?.full_name || 'Client'} → {r.artisan_profile?.full_name || 'Artisan'}
                                </span>
                                <span style={{ fontSize: 12.5, color: 'var(--tx2)' }}>{timeAgo(r.created_at)}</span>
                              </div>
                              {r.comment && <p style={{ fontSize: 14, color: 'var(--tx)', lineHeight: 1.6, overflowWrap: 'anywhere' }}>{r.comment}</p>}
                            </div>
                            <button onClick={() => deleteReview(r.id)}
                              className="adm-btn adm-btn-no" style={{ flexShrink: 0 }}>
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
