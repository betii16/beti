'use client'
import { supabase } from '@/lib/supabase'
import { useState, useEffect, useRef } from 'react'
import { OtherCategorySearch } from '@/components/OtherCategory'
import { useLang } from '@/lib/LangContext'

type Artisan = {
  artisan_id: string; full_name: string; avatar_url: string | null
  category: string; rating_avg: number; rating_count: number
  hourly_rate: number; distance_km: number; is_available: boolean; total_missions: number
  bio?: string; phone?: string
}

type Review = {
  id: string; rating: number; comment: string | null; created_at: string
  photos?: string[]; profiles?: { full_name: string } | null
}

const CATEGORIES = [
  { id: '',            icon: '✳',  labelFr: 'Tous',          labelAr: 'الكل',          color: '#C9A84C' },
  { id: 'plomberie',   icon: '⚙',  labelFr: 'Plomberie',    labelAr: 'السباكة',       color: '#3b82f6' },
  { id: 'electricite', icon: '⚡',  labelFr: 'Électricité',  labelAr: 'الكهرباء',      color: '#f59e0b' },
  { id: 'menage',      icon: '✦',  labelFr: 'Ménage',        labelAr: 'التنظيف',       color: '#10b981' },
  { id: 'demenagement',icon: '◈',  labelFr: 'Déménagement',  labelAr: 'النقل',         color: '#8b5cf6' },
  { id: 'jardinage',   icon: '❧',  labelFr: 'Jardinage',     labelAr: 'البستنة',      color: '#22c55e' },
  { id: 'peinture',    icon: '◉',  labelFr: 'Peinture',      labelAr: 'الدهان',        color: '#ef4444' },
  { id: 'serrurerie',  icon: '⌘',  labelFr: 'Serrurerie',    labelAr: 'أعمال الأقفال',color: '#f97316' },
  { id: 'informatique',icon: '⬡',  labelFr: 'Informatique',  labelAr: 'الإعلام الآلي',color: '#6366f1' },
  { id: 'coiffure',    icon: '✂',  labelFr: 'Coiffure',      labelAr: 'الحلاقة',      color: '#ec4899' },
  { id: 'autre',       icon: '◇',  labelFr: 'Autre',         labelAr: 'أخرى',          color: '#a78bfa' },
]

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(rating) ? '#C9A84C' : '#2a2a3a'}>
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      ))}
    </div>
  )
}

export default function BetiHomePage() {
  const { t, isAr } = useLang()
  const [artisans, setArtisans] = useState<Artisan[]>([])
  const [loadingArtisans, setLoadingArtisans] = useState(true)
  const [activeCategory, setActiveCategory] = useState('')
  const [userLocation, setUserLocation] = useState({ lat: 36.7538, lng: 3.0588 })
  const [userAddress, setUserAddress] = useState('')
  const [locating, setLocating] = useState(true)
  const [counts, setCounts] = useState({ a: 0, b: 0, c: 0, d: 0 })
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'price_asc' | 'price_desc' | 'missions'>('distance')
  const [displayCount, setDisplayCount] = useState(6)
  const [searchTags, setSearchTags] = useState<string[]>([])
  const statsRef = useRef<HTMLDivElement>(null)
  const statsAnimated = useRef(false)

  // Detail panel
  const [selectedArtisan, setSelectedArtisan] = useState<Artisan | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [contactSent, setContactSent] = useState(false)

  // ── Auto-detect location + address ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setCurrentUser(data.user) })

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        setLocating(false)
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${loc.lat}&lon=${loc.lng}&format=json&accept-language=${isAr ? 'ar' : 'fr'}`)
          const data = await res.json()
          const addr = data.address
          setUserAddress(addr?.road ? `${addr.road}, ${addr.city || addr.town || addr.village || ''}` : addr?.city || addr?.town || 'Alger')
        } catch { setUserAddress('Alger') }
      }, () => { setLocating(false); setUserAddress('Alger') })
    } else { setLocating(false); setUserAddress('Alger') }
  }, [])

  // ── Load artisans ──
  useEffect(() => { loadArtisans(); setDisplayCount(6) }, [userLocation, activeCategory, searchTags])

  const loadArtisans = async () => {
    setLoadingArtisans(true)
    try {
      const { data, error } = await supabase.rpc('get_nearby_artisans', {
        lat: userLocation.lat, lng: userLocation.lng, radius_km: 50,
        category_filter: activeCategory || null,
      })
      if (!error && data && data.length > 0) { setArtisans(data); setLoadingArtisans(false); return }
    } catch {}

    // Fallback: query directe (tous les artisans, même indisponibles)
    let query = supabase.from('artisans')
      .select('id, category, hourly_rate, is_available, rating_avg, rating_count, total_missions, bio, tags, profiles(full_name, avatar_url, phone)')
      .limit(30)
    if (activeCategory && activeCategory !== 'autre') query = query.eq('category', activeCategory)
    if (activeCategory === 'autre' && searchTags.length > 0) query = query.overlaps('tags', searchTags)

    const { data } = await query

    // Vrais artisans de la DB
    const realArtisans: Artisan[] = (data || []).map((a: any) => ({
      artisan_id: a.id, full_name: a.profiles?.full_name || 'Artisan',
      avatar_url: a.profiles?.avatar_url || null, category: a.category,
      rating_avg: a.rating_avg || 0, rating_count: a.rating_count || 0,
      hourly_rate: a.hourly_rate || 0, distance_km: Math.round(Math.random() * 80 + 5) / 10,
      is_available: a.is_available, total_missions: a.total_missions || 0,
      bio: a.bio || '', phone: a.profiles?.phone || null,
    }))

    // Si "autre" avec mots-clés → uniquement les vrais résultats, pas de démo
    if (activeCategory === 'autre') {
      setArtisans(realArtisans)
      setLoadingArtisans(false)
      return
    }

    // Données démo (toujours présentes pour remplir la page)
    const DEMO: Artisan[] = [
      { artisan_id: 'd1',  full_name: 'Karim Benali',     avatar_url: null, category: 'plomberie',    rating_avg: 4.9, rating_count: 84,  hourly_rate: 3500, distance_km: 1.2, is_available: true,  total_missions: 312 },
      { artisan_id: 'd2',  full_name: 'Sofiane Amrani',   avatar_url: null, category: 'electricite',  rating_avg: 4.8, rating_count: 127, hourly_rate: 4000, distance_km: 2.8, is_available: true,  total_missions: 198 },
      { artisan_id: 'd3',  full_name: 'Yacine Meziane',   avatar_url: null, category: 'peinture',     rating_avg: 4.7, rating_count: 63,  hourly_rate: 3000, distance_km: 3.1, is_available: true,  total_missions: 145 },
      { artisan_id: 'd4',  full_name: 'Amina Kaci',       avatar_url: null, category: 'menage',       rating_avg: 5.0, rating_count: 211, hourly_rate: 2000, distance_km: 0.9, is_available: true,  total_missions: 521 },
      { artisan_id: 'd5',  full_name: 'Riad Hamdi',       avatar_url: null, category: 'serrurerie',   rating_avg: 4.6, rating_count: 48,  hourly_rate: 4500, distance_km: 4.2, is_available: true,  total_missions: 89  },
      { artisan_id: 'd6',  full_name: 'Nadia Bouzid',     avatar_url: null, category: 'coiffure',     rating_avg: 4.9, rating_count: 73,  hourly_rate: 1500, distance_km: 5.0, is_available: true,  total_missions: 167 },
      { artisan_id: 'd7',  full_name: 'Mehdi Boudjema',   avatar_url: null, category: 'plomberie',    rating_avg: 4.3, rating_count: 32,  hourly_rate: 2800, distance_km: 6.3, is_available: true,  total_missions: 78  },
      { artisan_id: 'd8',  full_name: 'Fatima Zohra',     avatar_url: null, category: 'menage',       rating_avg: 4.8, rating_count: 156, hourly_rate: 1800, distance_km: 1.8, is_available: true,  total_missions: 423 },
      { artisan_id: 'd9',  full_name: 'Omar Belkacemi',   avatar_url: null, category: 'electricite',  rating_avg: 4.5, rating_count: 91,  hourly_rate: 3800, distance_km: 3.5, is_available: true,  total_missions: 201 },
      { artisan_id: 'd10', full_name: 'Lina Hadj',        avatar_url: null, category: 'coiffure',     rating_avg: 4.9, rating_count: 189, hourly_rate: 2500, distance_km: 2.1, is_available: true,  total_missions: 347 },
      { artisan_id: 'd11', full_name: 'Nassim Cherif',    avatar_url: null, category: 'jardinage',    rating_avg: 4.4, rating_count: 45,  hourly_rate: 2500, distance_km: 7.8, is_available: true,  total_missions: 112 },
      { artisan_id: 'd12', full_name: 'Rachid Taleb',     avatar_url: null, category: 'demenagement', rating_avg: 4.6, rating_count: 67,  hourly_rate: 5000, distance_km: 4.5, is_available: true,  total_missions: 156 },
      { artisan_id: 'd13', full_name: 'Samira Ait Ali',   avatar_url: null, category: 'menage',       rating_avg: 4.7, rating_count: 98,  hourly_rate: 2200, distance_km: 3.9, is_available: true,  total_missions: 289 },
      { artisan_id: 'd14', full_name: 'Walid Benmoussa',  avatar_url: null, category: 'informatique', rating_avg: 4.8, rating_count: 52,  hourly_rate: 4500, distance_km: 5.6, is_available: true,  total_missions: 87  },
      { artisan_id: 'd15', full_name: 'Djamila Ferhat',   avatar_url: null, category: 'peinture',     rating_avg: 4.2, rating_count: 29,  hourly_rate: 2800, distance_km: 8.2, is_available: true,  total_missions: 64  },
      { artisan_id: 'd16', full_name: 'Mourad Khelifi',   avatar_url: null, category: 'serrurerie',   rating_avg: 4.9, rating_count: 114, hourly_rate: 5500, distance_km: 2.3, is_available: true,  total_missions: 278 },
    ]

    // Filtrer démo par catégorie si active
    const filteredDemo = activeCategory
      ? DEMO.filter(d => d.category === activeCategory)
      : DEMO

    // Vrais en premier, puis démo pour remplir
    const realIds = new Set(realArtisans.map(a => a.full_name))
    const combined = [...realArtisans, ...filteredDemo.filter(d => !realIds.has(d.full_name))]
    setArtisans(combined)
    setLoadingArtisans(false)
  }

  // ── Load reviews for selected artisan ──
  const openArtisan = async (artisan: Artisan) => {
    setSelectedArtisan(artisan)
    setLoadingReviews(true)
    setContactSent(false)
    const { data } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, photos, profiles!reviews_client_id_fkey(full_name)')
      .eq('artisan_id', artisan.artisan_id)
      .order('created_at', { ascending: false })
      .limit(20)
    setReviews((data || []) as any)
    setLoadingReviews(false)
  }

  // ── Contact via app ──
  const contactArtisan = async (type: 'message' | 'call') => {
    if (!currentUser || !selectedArtisan) {
      window.location.href = '/auth/login'
      return
    }
    // Créer une réservation "inquiry"
    const { data: booking } = await supabase.from('bookings').insert({
      client_id: currentUser.id,
      artisan_id: selectedArtisan.artisan_id,
      title: `Demande ${selectedArtisan.category}`,
      description: type === 'call' ? 'Demande d\'appel via BETI' : 'Message via BETI',
      address: userAddress,
      status: 'pending',
      price_agreed: selectedArtisan.hourly_rate,
    }).select('id').single()

    // Notification à l'artisan
    await supabase.from('notifications').insert({
      user_id: selectedArtisan.artisan_id,
      type: type === 'call' ? 'call_request' : 'new_message',
      title: type === 'call' ? 'Demande d\'appel' : 'Nouveau message',
      message: `${currentUser.email} souhaite vous contacter.`,
    })

    if (type === 'message' && booking) {
      window.location.href = `/chat/${booking.id}`
    } else {
      setContactSent(true)
    }
  }

  // ── Stats animation ──
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !statsAnimated.current) {
        statsAnimated.current = true
        const targets = { a: 12000, b: 98, c: 30, d: 50 }
        const start = Date.now()
        const tick = () => {
          const p = Math.min((Date.now() - start) / 1800, 1)
          const ease = 1 - Math.pow(1 - p, 3)
          setCounts({ a: Math.floor(ease * targets.a), b: Math.floor(ease * targets.b), c: Math.floor(ease * targets.c), d: Math.floor(ease * targets.d) })
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.3 })
    if (statsRef.current) obs.observe(statsRef.current)
    return () => obs.disconnect()
  }, [])

  const timeAgo = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
    if (diff === 0) return "Aujourd'hui"
    if (diff === 1) return 'Hier'
    if (diff < 7) return `Il y a ${diff}j`
    if (diff < 30) return `Il y a ${Math.floor(diff / 7)} sem.`
    return `Il y a ${Math.floor(diff / 30)} mois`
  }

  const getCatColor = (id: string) => CATEGORIES.find(c => c.id === id)?.color || '#C9A84C'
  const getCatLabel = (id: string) => { const c = CATEGORIES.find(c => c.id === id); return c ? (isAr ? c.labelAr : c.labelFr) : id }

  return (
    <>
      <style suppressHydrationWarning>{`
        @keyframes beti-ripple { to { transform: scale(4); opacity: 0; } }
        @keyframes drift1 { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.1)} 66%{transform:translate(-20px,20px) scale(0.95)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes drift2 { 0%{transform:translate(0,0) scale(1)} 40%{transform:translate(-50px,25px) scale(1.08)} 70%{transform:translate(30px,-15px) scale(0.92)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes statReveal{from{opacity:0;transform:translateY(20px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0D0D12;color:#F0EDE8;font-family:Nexa,sans-serif;-webkit-font-smoothing:antialiased}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#C9A84C44;border-radius:2px}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0D0D12', paddingTop: 64, direction: isAr ? 'rtl' : 'ltr' }}>

        {/* ═══ HERO ═══ */}
        <section style={{ padding: '80px 24px 40px', textAlign: 'center', position: 'relative' }}>
          {/* Background layers */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {/* Subtle grid */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,168,76,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.02) 1px,transparent 1px)', backgroundSize: '64px 64px' }}/>
            {/* Glow orbs */}
            <div style={{ position: 'absolute', width: 500, height: 300, background: 'radial-gradient(ellipse, #C9A84C08 0%, transparent 70%)', top: -80, left: '50%', transform: 'translateX(-50%)', animation: 'drift1 10s ease-in-out infinite' }}/>
            <div style={{ position: 'absolute', width: 300, height: 300, background: 'radial-gradient(circle, #3b82f605 0%, transparent 70%)', bottom: -100, left: -60, animation: 'drift2 12s ease-in-out infinite' }}/>
            {/* Vignette */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 40%, transparent 0%, #0D0D12 100%)' }}/>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 20, background: '#1a1508', border: '0.5px solid #2a2010', fontSize: 10, color: '#C9A84C', letterSpacing: '.1em', fontWeight: 800, marginBottom: 20, position: 'relative', zIndex: 2 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C9A84C', animation: 'pulse 2s infinite' }}/>
            {t('home.badge')}
          </div>

          <h1 style={{ fontSize: 'clamp(2.5rem,6vw,4.5rem)', fontWeight: 800, lineHeight: 1.05, color: '#F0EDE8', marginBottom: 16, position: 'relative', zIndex: 2 }}>
            {t('home.title1')}<br/>
            <span style={{ background: 'linear-gradient(135deg,#C9A84C 0%,#FFE8A3 50%,#C9A84C 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('home.title2')}</span>
          </h1>

          <p style={{ fontSize: 15, color: '#555', maxWidth: 460, lineHeight: 1.7, margin: '0 auto 24px', fontWeight: 300, position: 'relative', zIndex: 2 }}>
            {t('home.subtitle')}
          </p>

          {/* Adresse — cliquable et éditable */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderRadius: 12, background: '#161620', border: '0.5px solid #2a2a3a', marginBottom: 16, position: 'relative', zIndex: 2, maxWidth: 480, width: '100%' }}>
            {locating ? (
              <span style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>Détection de votre position...</span>
            ) : (
              <>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', flexShrink: 0 }}/>
                <input
                  type="text"
                  value={userAddress}
                  onChange={e => setUserAddress(e.target.value)}
                  placeholder={isAr ? 'أدخل عنوانك...' : 'Entrez votre adresse...'}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: '#F0EDE8', fontSize: 13, fontFamily: 'Nexa, sans-serif', fontWeight: 300,
                    padding: '2px 0', minWidth: 0,
                  }}
                />
              </>
            )}
          </div>
        </section>

        {/* ═══ CATÉGORIES ═══ */}
        <section id="services" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 16px' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {CATEGORIES.map(cat => {
              const active = activeCategory === cat.id
              return (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                    borderRadius: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif',
                    border: `0.5px solid ${active ? cat.color : '#2a2a3a'}`,
                    background: active ? cat.color + '15' : '#161620',
                    color: active ? cat.color : '#666', fontSize: 13,
                    fontWeight: active ? 800 : 300, transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 15 }}>{cat.icon}</span>
                  {isAr ? cat.labelAr : cat.labelFr}
                </button>
              )
            })}
          </div>
          {activeCategory === 'autre' && (
            <div style={{ maxWidth: 640, margin: '12px auto 0', animation: 'fadeIn 0.3s ease' }}>
              <OtherCategorySearch onSearch={kw => {
                const tags = kw.trim().split(/\s+/).filter(Boolean)
                setSearchTags(tags)
              }}/>
            </div>
          )}
        </section>
        <section id="artisans" style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px 60px' }}>
          {/* Header + tri */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 14, color: '#555', fontWeight: 300 }}>
              {loadingArtisans ? 'Recherche...' : `${artisans.length} artisan${artisans.length > 1 ? 's' : ''} ${activeCategory ? getCatLabel(activeCategory).toLowerCase() : ''} près de vous`}
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
              {([
                { id: 'distance',   label: 'Distance' },
                { id: 'rating',     label: 'Note' },
                { id: 'price_asc',  label: 'Prix ↑' },
                { id: 'price_desc', label: 'Prix ↓' },
                { id: 'missions',   label: 'Expérience' },
              ] as const).map(s => (
                <button key={s.id} onClick={() => setSortBy(s.id)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                    fontFamily: 'Nexa, sans-serif', letterSpacing: '0.02em',
                    background: sortBy === s.id ? '#1a1508' : 'transparent',
                    border: `0.5px solid ${sortBy === s.id ? '#C9A84C' : '#1e1e2a'}`,
                    color: sortBy === s.id ? '#C9A84C' : '#555',
                    fontWeight: sortBy === s.id ? 800 : 300, transition: 'all 0.2s',
                  }}
                >{s.label}</button>
              ))}
              <div style={{ width: '0.5px', height: 16, background: '#1e1e2a', margin: '0 4px' }}/>
              <a href="/map" style={{ fontSize: 11, color: '#555', textDecoration: 'none', fontWeight: 300, transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#C9A84C')}
                onMouseLeave={e => (e.currentTarget.style.color = '#555')}
              >{t('home.seeOnMap')}</a>
            </div>
          </div>

          {(() => {
            // Sort artisans
            const sorted = [...artisans].sort((a, b) => {
              if (sortBy === 'distance') return (a.distance_km || 99) - (b.distance_km || 99)
              if (sortBy === 'rating') return (b.rating_avg || 0) - (a.rating_avg || 0)
              if (sortBy === 'price_asc') return (a.hourly_rate || 0) - (b.hourly_rate || 0)
              if (sortBy === 'price_desc') return (b.hourly_rate || 0) - (a.hourly_rate || 0)
              if (sortBy === 'missions') return (b.total_missions || 0) - (a.total_missions || 0)
              return 0
            })
            const visible = sorted.slice(0, displayCount)
            const hasMore = sorted.length > displayCount

            return loadingArtisans ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: 180, background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 16, animation: 'pulse 1.5s infinite' }}/>)}
              </div>
            ) : artisans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#333' }}>
                <div style={{ fontSize: 14, color: '#2a2a3a', fontWeight: 800, marginBottom: 16, letterSpacing: '0.1em' }}>· · ·</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#555', marginBottom: 8 }}>{t('home.noArtisan')}</div>
                <div style={{ fontSize: 13, color: '#444', fontWeight: 300, marginBottom: 24 }}>{t('home.noArtisanSub')}</div>
                <button onClick={() => setActiveCategory('')} style={{ padding: '10px 24px', background: '#C9A84C', border: 'none', borderRadius: 10, color: '#0D0D12', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                  {t('home.reset')}
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                  {visible.map(a => {
                    const catColor = getCatColor(a.category)
                    const initials = a.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'A'
                    return (
                      <div key={a.artisan_id} onClick={() => openArtisan(a)}
                        style={{
                          background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 16,
                          padding: '20px', cursor: 'pointer', transition: 'all 0.25s',
                          position: 'relative', overflow: 'hidden',
                          opacity: a.is_available ? 1 : 0.6,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = catColor + '55'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a3a'; e.currentTarget.style.transform = 'none' }}
                      >
                        {/* Badge indisponible */}
                        {!a.is_available && (
                          <div style={{ position: 'absolute', top: 12, right: 12, padding: '3px 10px', borderRadius: 8, background: '#1a1010', border: '0.5px solid #2a1010', fontSize: 10, color: '#f87171', fontWeight: 800 }}>Indisponible</div>
                        )}
                        <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                          {a.avatar_url ? (
                            <img src={a.avatar_url} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${catColor}`, flexShrink: 0 }}/>
                          ) : (
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: catColor + '18', border: `2px solid ${catColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: catColor, flexShrink: 0 }}>{initials}</div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: '#F0EDE8', marginBottom: 3 }}>{a.full_name}</div>
                            <div style={{ fontSize: 11, color: catColor, fontWeight: 800, letterSpacing: '0.06em', marginBottom: 6 }}>{getCatLabel(a.category)?.toUpperCase()}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Stars rating={a.rating_avg} size={13}/>
                              <span style={{ fontSize: 13, fontWeight: 800, color: '#C9A84C' }}>{a.rating_avg ? a.rating_avg.toFixed(1) : '—'}</span>
                              <span style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>({a.rating_count} avis)</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '0.5px solid #1e1e2a' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 300 }}>{a.distance_km?.toFixed(1)} km</span>
                            <span style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>{a.total_missions} missions</span>
                          </div>
                          <span style={{ fontSize: 15, fontWeight: 800, color: '#C9A84C' }}>{(a.hourly_rate || 0).toLocaleString('fr-DZ')} DA</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Bouton Afficher + */}
                {hasMore && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, gap: 12 }}>
                    <button onClick={() => setDisplayCount(prev => prev + 6)}
                      style={{
                        padding: '12px 32px', borderRadius: 12,
                        background: '#161620', border: '0.5px solid #C9A84C44',
                        color: '#C9A84C', fontSize: 13, fontWeight: 800,
                        cursor: 'pointer', fontFamily: 'Nexa, sans-serif',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#1a1508'; e.currentTarget.style.borderColor = '#C9A84C' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#161620'; e.currentTarget.style.borderColor = '#C9A84C44' }}
                    >
                      Afficher + ({sorted.length - displayCount} restants)
                    </button>
                    <a href="/map" style={{ textDecoration: 'none' }}>
                      <button style={{
                        padding: '12px 24px', borderRadius: 12,
                        background: 'transparent', border: '0.5px solid #2a2a3a',
                        color: '#888', fontSize: 13, fontWeight: 300,
                        cursor: 'pointer', fontFamily: 'Nexa, sans-serif',
                      }}>
                        Voir sur la carte
                      </button>
                    </a>
                  </div>
                )}
              </>
            )
          })()}
        </section>

        {/* ═══ STATS ═══ */}
        <div ref={statsRef} style={{ background: '#09090f', borderTop: '0.5px solid #1e1e2a', borderBottom: '0.5px solid #1e1e2a', padding: '64px 40px' }}>
          <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[
              { value: counts.a.toLocaleString('fr-FR'), suffix: '+', label: t('home.statsA') },
              { value: counts.b, suffix: '%', label: t('home.statsB') },
              { value: counts.c, prefix: '<', suffix: 'min', label: t('home.statsC') },
              { value: counts.d, suffix: '+', label: t('home.statsD') },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '20px 16px', borderRight: i < 3 ? '0.5px solid #1e1e2a' : 'none', animation: statsAnimated.current ? `statReveal 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.12}s both` : 'none' }}>
                <div style={{ fontSize: 'clamp(2rem,3.5vw,3rem)', fontWeight: 800, color: '#C9A84C', lineHeight: 1, marginBottom: 10, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
                  {s.prefix && <span style={{ fontSize: '0.6em', fontWeight: 300, opacity: 0.7 }}>{s.prefix}</span>}
                  <span>{s.value}</span>
                  <span style={{ fontSize: '0.45em', fontWeight: 300, opacity: 0.7 }}>{s.suffix}</span>
                </div>
                <div style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ COMMENT ÇA MARCHE ═══ */}
        <section id="comment" style={{ background: '#09090f', borderBottom: '0.5px solid #1e1e2a', padding: '80px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '.12em', fontWeight: 800, marginBottom: 8 }}>{t('home.howTag')}</div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: '#F0EDE8', marginBottom: 48, lineHeight: 1.2 }}>{t('home.howTitle')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 48 }}>
              {[
                { n: '01', title: t('home.step1t'), desc: t('home.step1d') },
                { n: '02', title: t('home.step2t'), desc: t('home.step2d') },
                { n: '03', title: t('home.step3t'), desc: t('home.step3d') },
              ].map(s => (
                <div key={s.n}>
                  <div style={{ fontSize: 52, fontWeight: 800, color: '#1e1e2a', lineHeight: 1, marginBottom: 16 }}>{s.n}</div>
                  <div style={{ width: 24, height: 2, background: '#C9A84C', marginBottom: 16 }}/>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#F0EDE8', marginBottom: 10 }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7, fontWeight: 300 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 40px' }}>
          <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 24, padding: '64px 52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', fontSize: 180, fontWeight: 800, color: '#1a1a22', pointerEvents: 'none', userSelect: 'none' }}>BETI</div>
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '.12em', fontWeight: 800, marginBottom: 12 }}>{t('home.ctaTag')}</div>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: '#F0EDE8', marginBottom: 14, lineHeight: 1.2 }}>{t('home.ctaTitle')}</h2>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, maxWidth: 420, fontWeight: 300 }}>{t('home.ctaSub')}</p>
            </div>
            <a href="/auth/signup" style={{ textDecoration: 'none', position: 'relative' }}>
              <button style={{ padding: '16px 32px', borderRadius: 12, background: '#C9A84C', border: 'none', color: '#0D0D12', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>{t('home.ctaBtn')}</button>
            </a>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer style={{ background: '#09090f', borderTop: '0.5px solid #1e1e2a', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: '#C9A84C', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#0D0D12' }}>B</div>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', letterSpacing: '0.1em' }}>BETI</span>
          </div>
          <span style={{ fontSize: 12, color: '#333', fontWeight: 300 }}>© 2025 BETI · {isAr ? 'خدمات منزلية في الجزائر' : 'Services à domicile'}</span>
        </footer>
      </div>

      {/* ═══ PANEL DÉTAIL ARTISAN ═══ */}
      {selectedArtisan && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex' }}>
          {/* Overlay */}
          <div onClick={() => setSelectedArtisan(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }}/>

          {/* Panel */}
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '100%', maxWidth: 480, background: '#0D0D12', borderLeft: '0.5px solid #2a2a3a', overflowY: 'auto', animation: 'slideUp 0.3s ease' }}>
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: '0.5px solid #1e1e2a', display: 'flex', alignItems: 'center', gap: 16 }}>
              {selectedArtisan.avatar_url ? (
                <img src={selectedArtisan.avatar_url} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${getCatColor(selectedArtisan.category)}` }}/>
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: getCatColor(selectedArtisan.category) + '18', border: `2px solid ${getCatColor(selectedArtisan.category)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: getCatColor(selectedArtisan.category) }}>
                  {selectedArtisan.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#F0EDE8' }}>{selectedArtisan.full_name}</div>
                <div style={{ fontSize: 11, color: getCatColor(selectedArtisan.category), fontWeight: 800, marginBottom: 4 }}>{getCatLabel(selectedArtisan.category)?.toUpperCase()}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Stars rating={selectedArtisan.rating_avg} size={14}/>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#C9A84C' }}>{selectedArtisan.rating_avg?.toFixed(1)}</span>
                  <span style={{ fontSize: 11, color: '#555' }}>({selectedArtisan.rating_count} avis)</span>
                </div>
              </div>
              <button onClick={() => setSelectedArtisan(null)} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Infos */}
            <div style={{ padding: '16px 24px', display: 'flex', gap: 16, borderBottom: '0.5px solid #1e1e2a' }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: '#161620', borderRadius: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#C9A84C' }}>{(selectedArtisan.hourly_rate || 0).toLocaleString('fr-DZ')} DA</div>
                <div style={{ fontSize: 10, color: '#555', fontWeight: 300 }}>Tarif</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: '#161620', borderRadius: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#4ade80' }}>{selectedArtisan.distance_km?.toFixed(1)} km</div>
                <div style={{ fontSize: 10, color: '#555', fontWeight: 300 }}>Distance</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: '#161620', borderRadius: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#F0EDE8' }}>{selectedArtisan.total_missions}</div>
                <div style={{ fontSize: 10, color: '#555', fontWeight: 300 }}>Missions</div>
              </div>
            </div>

            {/* Boutons Contacter */}
            <div style={{ padding: '16px 24px', display: 'flex', gap: 10, borderBottom: '0.5px solid #1e1e2a' }}>
              {contactSent ? (
                <div style={{ flex: 1, padding: '14px', borderRadius: 12, background: '#0a2010', border: '0.5px solid #4ade8044', textAlign: 'center' }}>
                  <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 800 }}>✅ Demande envoyée ! L'artisan sera notifié.</span>
                </div>
              ) : (
                <>
                  <button onClick={() => contactArtisan('message')}
                    style={{ flex: 1, padding: '14px', borderRadius: 12, background: '#C9A84C', border: 'none', color: '#0D0D12', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D0D12" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Envoyer un message
                  </button>
                  <button onClick={() => contactArtisan('call')}
                    style={{ padding: '14px 20px', borderRadius: 12, background: 'transparent', border: '0.5px solid #4ade8066', color: '#4ade80', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    Appeler
                  </button>
                </>
              )}
            </div>

            {/* Avis */}
            <div style={{ padding: '16px 24px' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8', marginBottom: 16 }}>
                Avis clients ({reviews.length})
              </div>

              {loadingReviews ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#555', fontSize: 13 }}>Chargement des avis...</div>
              ) : reviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#444', fontSize: 13, fontWeight: 300 }}>
                  Aucun avis pour l'instant
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {reviews.map(r => (
                    <div key={r.id} style={{ background: '#161620', border: '0.5px solid #1e1e2a', borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#888', fontWeight: 800 }}>
                            {(r.profiles?.full_name || 'C')[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#F0EDE8' }}>{r.profiles?.full_name || 'Client'}</div>
                            <div style={{ fontSize: 10, color: '#444', fontWeight: 300 }}>{timeAgo(r.created_at)}</div>
                          </div>
                        </div>
                        <Stars rating={r.rating} size={11}/>
                      </div>
                      {r.comment && <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6, fontWeight: 300 }}>{r.comment}</p>}
                      {r.photos && r.photos.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          {r.photos.map((url, i) => (
                            <img key={i} src={url} alt="" style={{ width: 56, height: 56, borderRadius: 6, objectFit: 'cover', border: '0.5px solid #2a2a3a' }}/>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Voir profil complet */}
            <div style={{ padding: '16px 24px 32px' }}>
              <a href={`/artisan/${selectedArtisan.artisan_id}`} style={{ textDecoration: 'none' }}>
                <button style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'transparent', border: '0.5px solid #2a2a3a', color: '#888', fontSize: 13, fontWeight: 300, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                  Voir le profil complet →
                </button>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
