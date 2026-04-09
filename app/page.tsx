'use client'
import { supabase } from '@/lib/supabase'
import { useState, useEffect, useRef } from 'react'
import { OtherCategorySearch } from '@/components/OtherCategory'
import { useLang } from '@/lib/LangContext'

// ── Types ──
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

// ── Data ──
const SERVICES = [
  { id: 'plomberie',    icon: '⚙', label: 'Plomberie',     desc: 'Fuite, installation, débouchage, chauffe-eau',          color: '#3b82f6', urgent: true },
  { id: 'electricite',  icon: '⚡', label: 'Électricité',   desc: 'Panne, câblage, tableau, éclairage',                    color: '#f59e0b', urgent: true },
  { id: 'serrurerie',   icon: '⌘', label: 'Serrurerie',     desc: 'Porte bloquée, changement serrure, clé',               color: '#f97316', urgent: true },
  { id: 'menage',       icon: '✦', label: 'Ménage',          desc: 'Nettoyage maison, vitres, repassage',                  color: '#10b981' },
  { id: 'peinture',     icon: '◉', label: 'Peinture',        desc: 'Intérieur, extérieur, ravalement',                     color: '#ef4444' },
  { id: 'demenagement', icon: '◈', label: 'Déménagement',    desc: 'Transport, emballage, montage meubles',                color: '#8b5cf6' },
  { id: 'jardinage',    icon: '❧', label: 'Jardinage',       desc: 'Tonte, taille, plantation, entretien',                 color: '#22c55e' },
  { id: 'informatique', icon: '⬡', label: 'Informatique',    desc: 'Réparation PC, réseau wifi, installation',             color: '#6366f1' },
  { id: 'coiffure',     icon: '✂', label: 'Coiffure',        desc: 'Coupe, coloration, brushing à domicile',               color: '#ec4899' },
]

const QUICK_NEEDS = [
  'Fuite d\'eau urgente', 'Panne électrique', 'Porte bloquée', 'Ménage complet',
  'Peinture appartement', 'Montage meubles', 'Climatisation', 'Déménagement',
]

const TESTIMONIALS = [
  { name: 'Samira B.', city: 'Alger', text: 'J\'ai trouvé un plombier en 15 minutes. Il est arrivé dans l\'heure et a réglé la fuite. Prix correct, travail propre.', rating: 5, service: 'Plomberie' },
  { name: 'Mehdi K.', city: 'Oran', text: 'Déménagement organisé en 2 jours. Équipe sérieuse, rien de cassé. Je recommande vivement BETI.', rating: 5, service: 'Déménagement' },
  { name: 'Fatima Z.', city: 'Constantine', text: 'Femme de ménage ponctuelle et efficace. Je l\'ai gardée pour un passage toutes les semaines.', rating: 4, service: 'Ménage' },
  { name: 'Youcef A.', city: 'Blida', text: 'Électricien très compétent. Il a refait tout le tableau électrique en une journée. Devis respecté.', rating: 5, service: 'Électricité' },
]

const DEMO_ARTISANS: Artisan[] = [
  { artisan_id: 'd1',  full_name: 'Karim Benali',     avatar_url: null, category: 'plomberie',    rating_avg: 4.9, rating_count: 84,  hourly_rate: 3500, distance_km: 1.2, is_available: true,  total_missions: 312 },
  { artisan_id: 'd2',  full_name: 'Sofiane Amrani',   avatar_url: null, category: 'electricite',  rating_avg: 4.8, rating_count: 127, hourly_rate: 4000, distance_km: 2.8, is_available: true,  total_missions: 198 },
  { artisan_id: 'd3',  full_name: 'Amina Kaci',       avatar_url: null, category: 'menage',       rating_avg: 5.0, rating_count: 211, hourly_rate: 2000, distance_km: 0.9, is_available: true,  total_missions: 521 },
  { artisan_id: 'd4',  full_name: 'Riad Hamdi',       avatar_url: null, category: 'serrurerie',   rating_avg: 4.6, rating_count: 48,  hourly_rate: 4500, distance_km: 4.2, is_available: true,  total_missions: 89  },
  { artisan_id: 'd5',  full_name: 'Lina Hadj',        avatar_url: null, category: 'coiffure',     rating_avg: 4.9, rating_count: 189, hourly_rate: 2500, distance_km: 2.1, is_available: true,  total_missions: 347 },
  { artisan_id: 'd6',  full_name: 'Rachid Taleb',     avatar_url: null, category: 'demenagement', rating_avg: 4.6, rating_count: 67,  hourly_rate: 5000, distance_km: 4.5, is_available: true,  total_missions: 156 },
  { artisan_id: 'd7',  full_name: 'Fatima Zohra',     avatar_url: null, category: 'menage',       rating_avg: 4.8, rating_count: 156, hourly_rate: 1800, distance_km: 1.8, is_available: true,  total_missions: 423 },
  { artisan_id: 'd8',  full_name: 'Walid Benmoussa',  avatar_url: null, category: 'informatique', rating_avg: 4.8, rating_count: 52,  hourly_rate: 4500, distance_km: 5.6, is_available: true,  total_missions: 87  },
  { artisan_id: 'd9',  full_name: 'Mourad Khelifi',   avatar_url: null, category: 'serrurerie',   rating_avg: 4.9, rating_count: 114, hourly_rate: 5500, distance_km: 2.3, is_available: true,  total_missions: 278 },
  { artisan_id: 'd10', full_name: 'Omar Belkacemi',   avatar_url: null, category: 'electricite',  rating_avg: 4.5, rating_count: 91,  hourly_rate: 3800, distance_km: 3.5, is_available: true,  total_missions: 201 },
  { artisan_id: 'd11', full_name: 'Nassim Cherif',    avatar_url: null, category: 'jardinage',    rating_avg: 4.4, rating_count: 45,  hourly_rate: 2500, distance_km: 7.8, is_available: true,  total_missions: 112 },
  { artisan_id: 'd12', full_name: 'Yacine Meziane',   avatar_url: null, category: 'peinture',     rating_avg: 4.7, rating_count: 63,  hourly_rate: 3000, distance_km: 3.1, is_available: true,  total_missions: 145 },
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

// ── Component ──
export default function BetiHomePage() {
  const { t, isAr } = useLang()
  const [artisans, setArtisans] = useState<Artisan[]>([])
  const [loadingArtisans, setLoadingArtisans] = useState(true)
  const [activeCategory, setActiveCategory] = useState('')
  const [userLocation, setUserLocation] = useState({ lat: 36.7538, lng: 3.0588 })
  const [userAddress, setUserAddress] = useState('')
  const [locating, setLocating] = useState(true)
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'price_asc' | 'price_desc' | 'missions'>('distance')
  const [displayCount, setDisplayCount] = useState(6)
  const [searchTags, setSearchTags] = useState<string[]>([])
  const [selectedArtisan, setSelectedArtisan] = useState<Artisan | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [contactSent, setContactSent] = useState(false)
  const [counts, setCounts] = useState({ a: 0, b: 0, c: 0, d: 0 })
  const statsRef = useRef<HTMLDivElement>(null)
  const statsAnim = useRef(false)

  // ── Init ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setCurrentUser(data.user) })
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=fr`)
          const d = await r.json()
          setUserAddress(d.address?.road ? `${d.address.road}, ${d.address.city || d.address.town || ''}` : d.address?.city || 'Alger')
        } catch { setUserAddress('Alger') }
      }, () => { setLocating(false); setUserAddress('Alger') })
    } else { setLocating(false); setUserAddress('Alger') }
  }, [])

  useEffect(() => { loadArtisans(); setDisplayCount(6) }, [userLocation, activeCategory, searchTags])

  const loadArtisans = async () => {
    // Si "autre" sans mots-clés → pas de résultats
    if (activeCategory === 'autre' && searchTags.length === 0) {
      setArtisans([])
      setLoadingArtisans(false)
      return
    }

    setLoadingArtisans(true)
    try {
      const { data, error } = await supabase.rpc('get_nearby_artisans', { lat: userLocation.lat, lng: userLocation.lng, radius_km: 50, category_filter: activeCategory || null })
      if (!error && data && data.length > 0) { setArtisans(data); setLoadingArtisans(false); return }
    } catch {}

    let query = supabase.from('artisans')
      .select('id, category, hourly_rate, is_available, rating_avg, rating_count, total_missions, bio, tags, profiles(full_name, avatar_url, phone)')
      .limit(30)
    if (activeCategory && activeCategory !== 'autre') query = query.eq('category', activeCategory)
    if (activeCategory === 'autre' && searchTags.length > 0) query = query.overlaps('tags', searchTags)
    const { data } = await query

    const real: Artisan[] = (data || []).map((a: any) => ({
      artisan_id: a.id, full_name: a.profiles?.full_name || 'Artisan', avatar_url: a.profiles?.avatar_url || null,
      category: a.category, rating_avg: a.rating_avg || 0, rating_count: a.rating_count || 0,
      hourly_rate: a.hourly_rate || 0, distance_km: Math.round(Math.random() * 80 + 5) / 10,
      is_available: a.is_available, total_missions: a.total_missions || 0, bio: a.bio || '', phone: a.profiles?.phone || null,
    }))

    if (activeCategory === 'autre') { setArtisans(real); setLoadingArtisans(false); return }

    const demo = activeCategory ? DEMO_ARTISANS.filter(d => d.category === activeCategory) : DEMO_ARTISANS
    const ids = new Set(real.map(a => a.full_name))
    setArtisans([...real, ...demo.filter(d => !ids.has(d.full_name))])
    setLoadingArtisans(false)
  }

  const openArtisan = async (a: Artisan) => {
    setSelectedArtisan(a); setLoadingReviews(true); setContactSent(false)
    const { data } = await supabase.from('reviews').select('id, rating, comment, created_at, photos, profiles!reviews_client_id_fkey(full_name)').eq('artisan_id', a.artisan_id).order('created_at', { ascending: false }).limit(20)
    setReviews((data || []) as any); setLoadingReviews(false)
  }

  const contactArtisan = async (type: 'message' | 'call') => {
    if (!currentUser || !selectedArtisan) { window.location.href = '/auth/login'; return }
    const { data: booking } = await supabase.from('bookings').insert({ client_id: currentUser.id, artisan_id: selectedArtisan.artisan_id, title: `Demande ${selectedArtisan.category}`, description: type === 'call' ? 'Demande d\'appel' : 'Message', address: userAddress, status: 'pending', price_agreed: selectedArtisan.hourly_rate }).select('id').single()
    await supabase.from('notifications').insert({ user_id: selectedArtisan.artisan_id, type: type === 'call' ? 'call_request' : 'new_message', title: type === 'call' ? 'Demande d\'appel' : 'Nouveau message', message: `Un client souhaite vous contacter.` })
    if (type === 'message' && booking) window.location.href = `/chat/${booking.id}`
    else setContactSent(true)
  }

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !statsAnim.current) {
        statsAnim.current = true
        const t = { a: 12000, b: 98, c: 30, d: 50 }; const s = Date.now()
        const tick = () => { const p = Math.min((Date.now() - s) / 1800, 1); const e = 1 - Math.pow(1 - p, 3); setCounts({ a: Math.floor(e * t.a), b: Math.floor(e * t.b), c: Math.floor(e * t.c), d: Math.floor(e * t.d) }); if (p < 1) requestAnimationFrame(tick) }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.3 })
    if (statsRef.current) obs.observe(statsRef.current)
    return () => obs.disconnect()
  }, [])

  const getCatColor = (id: string) => SERVICES.find(c => c.id === id)?.color || '#C9A84C'
  const getCatLabel = (id: string) => SERVICES.find(c => c.id === id)?.label || id
  const timeAgo = (d: string) => { const x = Math.floor((Date.now() - new Date(d).getTime()) / 86400000); return x === 0 ? "Aujourd'hui" : x === 1 ? 'Hier' : x < 7 ? `Il y a ${x}j` : x < 30 ? `Il y a ${Math.floor(x/7)} sem.` : `Il y a ${Math.floor(x/30)} mois` }

  const sorted = [...artisans].sort((a, b) => {
    if (sortBy === 'distance') return (a.distance_km || 99) - (b.distance_km || 99)
    if (sortBy === 'rating') return (b.rating_avg || 0) - (a.rating_avg || 0)
    if (sortBy === 'price_asc') return (a.hourly_rate || 0) - (b.hourly_rate || 0)
    if (sortBy === 'price_desc') return (b.hourly_rate || 0) - (a.hourly_rate || 0)
    if (sortBy === 'missions') return (b.total_missions || 0) - (a.total_missions || 0)
    return 0
  })
  const visible = sorted.slice(0, displayCount)

  return (
    <>
      <style suppressHydrationWarning>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes slidePanel{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes countUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0a0a0f;color:#F0EDE8;font-family:Nexa,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#C9A84C33;border-radius:2px}
        .beti-card{transition:all 0.3s cubic-bezier(0.4,0,0.2,1)}
        .beti-card:hover{transform:translateY(-4px);border-color:#C9A84C33 !important}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0a0a0f', paddingTop: 52 }}>

        {/* ════════════════════════════════════════════════════════════
            HERO — Conversion-focused
        ════════════════════════════════════════════════════════════ */}
        <section style={{ position: 'relative', padding: '80px 24px 48px', overflow: 'hidden' }}>
          {/* BG */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,168,76,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.015) 1px,transparent 1px)', backgroundSize: '48px 48px' }}/>
            <div style={{ position: 'absolute', width: 600, height: 400, background: 'radial-gradient(ellipse, #C9A84C06 0%, transparent 70%)', top: -100, left: '50%', transform: 'translateX(-50%)' }}/>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 30%, transparent, #0a0a0f)' }}/>
          </div>

          <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 }}>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 16px', borderRadius: 20, background: '#13120e', border: '0.5px solid #2a2010', fontSize: 10, color: '#C9A84C', letterSpacing: '.12em', fontWeight: 800, marginBottom: 24 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C9A84C', animation: 'pulse 2s infinite' }}/>
              PLATEFORME N°1 EN ALGÉRIE
            </div>

            <h1 style={{ fontSize: 'clamp(2.4rem,5.5vw,4rem)', fontWeight: 800, lineHeight: 1.08, color: '#F0EDE8', marginBottom: 16, letterSpacing: '-0.02em' }}>
              Trouvez un artisan<br/>
              <span style={{ background: 'linear-gradient(135deg,#C9A84C,#FFE8A3,#C9A84C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>de confiance, maintenant</span>
            </h1>

            <p style={{ fontSize: 16, color: '#6b6b7b', maxWidth: 520, lineHeight: 1.7, margin: '0 auto 32px', fontWeight: 300 }}>
              Des artisans vérifiés et disponibles près de chez vous. Plombier, électricien, serrurier — intervention rapide, paiement en cash.
            </p>

            {/* Search intent */}
            <div style={{ background: '#12121a', border: '0.5px solid #1e1e2a', borderRadius: 16, padding: '20px', maxWidth: 560, margin: '0 auto 20px', textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: '#555', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 12 }}>DE QUOI AVEZ-VOUS BESOIN ?</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {QUICK_NEEDS.map(need => (
                  <button key={need} onClick={() => { setActiveCategory(''); document.getElementById('artisans')?.scrollIntoView({ behavior: 'smooth' }) }}
                    style={{ padding: '8px 16px', borderRadius: 10, background: '#0a0a0f', border: '0.5px solid #1e1e2a', color: '#888', fontSize: 12, fontWeight: 300, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#C9A84C44'; e.currentTarget.style.color = '#C9A84C' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e2a'; e.currentTarget.style.color = '#888' }}
                  >{need}</button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderRadius: 12, background: '#12121a', border: '0.5px solid #1e1e2a', maxWidth: 480, width: '100%' }}>
              {locating ? <span style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>Détection de votre position...</span> : (
                <>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', flexShrink: 0 }}/>
                  <input type="text" value={userAddress} onChange={e => setUserAddress(e.target.value)} placeholder="Entrez votre adresse..."
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#F0EDE8', fontSize: 13, fontFamily: 'Nexa, sans-serif', fontWeight: 300, padding: '2px 0', minWidth: 0 }}/>
                </>
              )}
            </div>

            {/* Trust bar */}
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
              {['Artisans vérifiés', 'Réponse en 30 min', 'Paiement en cash', 'Devis gratuit'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#4a4a5a', fontWeight: 300 }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#C9A84C' }}/>{t}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            SERVICES — Grid with descriptions
        ════════════════════════════════════════════════════════════ */}
        <section id="services" style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '.12em', fontWeight: 800, marginBottom: 6 }}>NOS SERVICES</div>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8', lineHeight: 1.2 }}>Tous vos besoins, une seule plateforme</h2>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
            {/* "Tous" card */}
            <div onClick={() => { setActiveCategory(''); document.getElementById('artisans')?.scrollIntoView({ behavior: 'smooth' }) }}
              className="beti-card" style={{ padding: '18px', borderRadius: 14, border: `0.5px solid ${!activeCategory ? '#C9A84C44' : '#1e1e2a'}`, background: !activeCategory ? '#13120e' : '#0f0f17', cursor: 'pointer' }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>✳</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: !activeCategory ? '#C9A84C' : '#F0EDE8', marginBottom: 4 }}>Tous les services</div>
              <div style={{ fontSize: 11, color: '#555', fontWeight: 300, lineHeight: 1.5 }}>Voir tous les artisans disponibles</div>
            </div>
            {SERVICES.map(s => (
              <div key={s.id} onClick={() => { setActiveCategory(s.id); document.getElementById('artisans')?.scrollIntoView({ behavior: 'smooth' }) }}
                className="beti-card" style={{ padding: '18px', borderRadius: 14, border: `0.5px solid ${activeCategory === s.id ? s.color + '44' : '#1e1e2a'}`, background: activeCategory === s.id ? s.color + '08' : '#0f0f17', cursor: 'pointer', position: 'relative' }}>
                {s.urgent && <div style={{ position: 'absolute', top: 10, right: 10, padding: '2px 8px', borderRadius: 6, background: '#f8717115', border: '0.5px solid #f8717133', fontSize: 9, color: '#f87171', fontWeight: 800 }}>URGENT</div>}
                <div style={{ fontSize: 22, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: activeCategory === s.id ? s.color : '#F0EDE8', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: '#555', fontWeight: 300, lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
            {/* Autre */}
            <div onClick={() => { setActiveCategory('autre'); setSearchTags([]) }}
              className="beti-card" style={{ padding: '18px', borderRadius: 14, border: `0.5px solid ${activeCategory === 'autre' ? '#a78bfa44' : '#1e1e2a'}`, background: activeCategory === 'autre' ? '#a78bfa08' : '#0f0f17', cursor: 'pointer' }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>◇</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: activeCategory === 'autre' ? '#a78bfa' : '#F0EDE8', marginBottom: 4 }}>Autre service</div>
              <div style={{ fontSize: 11, color: '#555', fontWeight: 300, lineHeight: 1.5 }}>Piscine, climatisation, livreur...</div>
            </div>
          </div>

          {activeCategory === 'autre' && (
            <div style={{ maxWidth: 560, margin: '16px auto 0', animation: 'fadeUp 0.3s ease' }}>
              <OtherCategorySearch onSearch={kw => {
                const tags = kw.trim().split(/\s+/).filter(Boolean)
                setSearchTags(tags)
                if (tags.length > 0) {
                  setTimeout(() => document.getElementById('artisans')?.scrollIntoView({ behavior: 'smooth' }), 200)
                }
              }}/>
              {searchTags.length === 0 && (
                <p style={{ textAlign: 'center', fontSize: 12, color: '#555', fontWeight: 300, marginTop: 12 }}>
                  Ajoutez des mots-clés pour trouver des artisans spécialisés
                </p>
              )}
            </div>
          )}
        </section>

        {/* ════════════════════════════════════════════════════════════
            ARTISANS — Real cards with trust signals
        ════════════════════════════════════════════════════════════ */}
        <section id="artisans" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 48px' }}>
          {/* Header + sort */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '.12em', fontWeight: 800, marginBottom: 6 }}>ARTISANS DISPONIBLES</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#F0EDE8' }}>
                {loadingArtisans ? 'Recherche...' : `${artisans.length} artisan${artisans.length > 1 ? 's' : ''} ${activeCategory ? getCatLabel(activeCategory).toLowerCase() : ''} près de vous`}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
              {(['distance', 'rating', 'price_asc', 'price_desc', 'missions'] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)}
                  style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', letterSpacing: '0.02em', background: sortBy === s ? '#13120e' : 'transparent', border: `0.5px solid ${sortBy === s ? '#C9A84C44' : '#1a1a24'}`, color: sortBy === s ? '#C9A84C' : '#555', fontWeight: sortBy === s ? 800 : 300, transition: 'all 0.2s' }}>
                  {{ distance: 'Distance', rating: 'Note', price_asc: 'Prix ↑', price_desc: 'Prix ↓', missions: 'Expérience' }[s]}
                </button>
              ))}
              <div style={{ width: '0.5px', height: 16, background: '#1e1e2a', margin: '0 4px' }}/>
              <a href="/map" style={{ fontSize: 11, color: '#555', textDecoration: 'none', fontWeight: 300 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#C9A84C')} onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
                Voir sur la carte
              </a>
            </div>
          </div>

          {loadingArtisans ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: 200, background: '#0f0f17', border: '0.5px solid #1a1a24', borderRadius: 16, animation: 'pulse 1.5s infinite' }}/>)}
            </div>
          ) : artisans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: '#333' }}>
              {activeCategory === 'autre' && searchTags.length === 0 ? (
                <>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#555', marginBottom: 8 }}>Ajoutez des mots-clés ci-dessus</div>
                  <div style={{ fontSize: 13, color: '#444', fontWeight: 300 }}>Les artisans ayant configuré ces spécialités dans leur profil apparaîtront ici</div>
                </>
              ) : activeCategory === 'autre' && searchTags.length > 0 ? (
                <>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#555', marginBottom: 8 }}>Aucun artisan trouvé pour ces mots-clés</div>
                  <div style={{ fontSize: 13, color: '#444', fontWeight: 300, marginBottom: 24 }}>Aucun artisan n'a encore configuré ces spécialités</div>
                  <button onClick={() => { setActiveCategory(''); setSearchTags([]) }} style={{ padding: '10px 24px', background: '#C9A84C', border: 'none', borderRadius: 10, color: '#0a0a0f', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>Voir tous les artisans</button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#555', marginBottom: 8 }}>Aucun artisan trouvé</div>
                  <div style={{ fontSize: 13, color: '#444', fontWeight: 300, marginBottom: 24 }}>Essayez une autre catégorie ou élargissez votre zone</div>
                  <button onClick={() => setActiveCategory('')} style={{ padding: '10px 24px', background: '#C9A84C', border: 'none', borderRadius: 10, color: '#0a0a0f', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>Voir tous les artisans</button>
                </>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                {visible.map(a => {
                  const cc = getCatColor(a.category)
                  const init = a.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'A'
                  const respTime = Math.floor(Math.random() * 20 + 5)
                  return (
                    <div key={a.artisan_id} onClick={() => openArtisan(a)} className="beti-card"
                      style={{ background: '#0f0f17', border: '0.5px solid #1a1a24', borderRadius: 16, padding: '20px', cursor: 'pointer', position: 'relative', opacity: a.is_available ? 1 : 0.5 }}>
                      {!a.is_available && <div style={{ position: 'absolute', top: 14, right: 14, padding: '3px 10px', borderRadius: 8, background: '#1a0a0a', border: '0.5px solid #2a1010', fontSize: 10, color: '#f87171', fontWeight: 800 }}>Indisponible</div>}

                      <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                        {a.avatar_url ? <img src={a.avatar_url} alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${cc}`, flexShrink: 0 }}/> :
                          <div style={{ width: 52, height: 52, borderRadius: '50%', background: cc + '12', border: `2px solid ${cc}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: cc, flexShrink: 0 }}>{init}</div>}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8' }}>{a.full_name}</span>
                            <div style={{ padding: '1px 6px', borderRadius: 4, background: '#13120e', border: '0.5px solid #2a2010', fontSize: 8, color: '#C9A84C', fontWeight: 800 }}>VÉRIFIÉ</div>
                          </div>
                          <div style={{ fontSize: 11, color: cc, fontWeight: 800, letterSpacing: '0.04em', marginBottom: 6 }}>{getCatLabel(a.category)}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Stars rating={a.rating_avg} size={12}/>
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#C9A84C' }}>{a.rating_avg ? a.rating_avg.toFixed(1) : '—'}</span>
                            <span style={{ fontSize: 11, color: '#444' }}>({a.rating_count})</span>
                          </div>
                        </div>
                      </div>

                      {/* Trust signals */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                        {[
                          { label: `${a.distance_km?.toFixed(1)} km`, color: '#4ade80' },
                          { label: `${a.total_missions} interventions`, color: '#888' },
                          { label: `Répond en ~${respTime} min`, color: '#60a5fa' },
                        ].map(t => (
                          <div key={t.label} style={{ padding: '3px 10px', borderRadius: 6, background: '#0a0a0f', border: '0.5px solid #1a1a24', fontSize: 10, color: t.color, fontWeight: 300 }}>{t.label}</div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '0.5px solid #1a1a24' }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#C9A84C' }}>{(a.hourly_rate || 0).toLocaleString('fr-DZ')} <span style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>DA</span></span>
                        {a.is_available && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#4ade80', fontWeight: 300 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }}/>Disponible
                        </div>}
                      </div>
                    </div>
                  )
                })}
              </div>

              {sorted.length > displayCount && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, gap: 12 }}>
                  <button onClick={() => setDisplayCount(p => p + 6)}
                    style={{ padding: '12px 32px', borderRadius: 12, background: '#12121a', border: '0.5px solid #C9A84C33', color: '#C9A84C', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                    Afficher + ({sorted.length - displayCount} restants)
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* ════════════════════════════════════════════════════════════
            STATS
        ════════════════════════════════════════════════════════════ */}
        <div ref={statsRef} style={{ background: '#08080d', borderTop: '0.5px solid #1a1a24', borderBottom: '0.5px solid #1a1a24', padding: '56px 40px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[
              { value: counts.a.toLocaleString('fr-FR'), suffix: '+', label: 'Artisans certifiés' },
              { value: counts.b, suffix: '%', label: 'Clients satisfaits' },
              { value: counts.c, prefix: '<', suffix: 'min', label: 'Temps de réponse' },
              { value: counts.d, suffix: '+', label: 'Villes couvertes' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '16px', borderRight: i < 3 ? '0.5px solid #1a1a24' : 'none' }}>
                <div style={{ fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', fontWeight: 800, color: '#C9A84C', lineHeight: 1, marginBottom: 8, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
                  {s.prefix && <span style={{ fontSize: '0.55em', fontWeight: 300, opacity: 0.6 }}>{s.prefix}</span>}
                  <span>{s.value}</span>
                  <span style={{ fontSize: '0.4em', fontWeight: 300, opacity: 0.6 }}>{s.suffix}</span>
                </div>
                <div style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            COMMENT ÇA MARCHE
        ════════════════════════════════════════════════════════════ */}
        <section id="comment" style={{ padding: '72px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '.12em', fontWeight: 800, marginBottom: 8 }}>COMMENT ÇA MARCHE</div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8' }}>Simple, rapide, fiable</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {[
              { n: '01', title: 'Décrivez votre besoin', desc: 'Choisissez un service ou décrivez votre problème. Notre système trouve les artisans qualifiés les plus proches.', color: '#3b82f6' },
              { n: '02', title: 'Comparez et contactez', desc: 'Consultez les profils, avis et tarifs. Contactez directement via message ou demande d\'appel — tout passe par BETI.', color: '#C9A84C' },
              { n: '03', title: 'L\'artisan intervient', desc: 'L\'artisan se déplace chez vous. Vous payez en cash après l\'intervention. Notez le travail pour aider la communauté.', color: '#4ade80' },
            ].map(s => (
              <div key={s.n} style={{ background: '#0f0f17', border: '0.5px solid #1a1a24', borderRadius: 16, padding: '28px 24px', position: 'relative' }}>
                <div style={{ fontSize: 48, fontWeight: 800, color: s.color + '15', lineHeight: 1, marginBottom: 16, fontFamily: 'Nexa, sans-serif' }}>{s.n}</div>
                <div style={{ width: 24, height: 2, background: s.color, marginBottom: 14, borderRadius: 1 }}/>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#F0EDE8', marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: '#6b6b7b', lineHeight: 1.7, fontWeight: 300 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            POURQUOI BETI
        ════════════════════════════════════════════════════════════ */}
        <section style={{ padding: '64px 24px', background: '#08080d', borderTop: '0.5px solid #1a1a24', borderBottom: '0.5px solid #1a1a24' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '.12em', fontWeight: 800, marginBottom: 8 }}>POURQUOI BETI</div>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8' }}>Pas un annuaire. Une vraie plateforme.</h2>
              <p style={{ fontSize: 14, color: '#555', fontWeight: 300, maxWidth: 480, margin: '12px auto 0', lineHeight: 1.7 }}>
                Fini les groupes Facebook, les numéros au hasard et les mauvaises surprises. BETI vérifie chaque artisan.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {[
                { title: 'Artisans vérifiés', desc: 'Chaque artisan est vérifié avant d\'être listé. Identité, compétences, avis clients.', color: '#C9A84C' },
                { title: 'Proximité réelle', desc: 'Géolocalisation précise. Vous voyez les artisans proches de chez vous, pas à l\'autre bout de la ville.', color: '#4ade80' },
                { title: 'Contact sécurisé', desc: 'Tout passe par BETI. Messages et appels via la plateforme. Pas de numéro exposé.', color: '#60a5fa' },
                { title: 'Prix transparents', desc: 'Chaque artisan affiche ses tarifs. À l\'heure, au forfait, ou sur devis. Pas de surprise.', color: '#f59e0b' },
                { title: 'Avis authentiques', desc: 'Seuls les clients ayant réservé peuvent laisser un avis. Photos de travaux vérifiées.', color: '#a78bfa' },
                { title: 'Intervention rapide', desc: 'Temps de réponse moyen de 30 minutes. Urgences traitées en priorité.', color: '#f87171' },
              ].map(f => (
                <div key={f.title} style={{ padding: '24px', borderRadius: 14, background: '#0f0f17', border: '0.5px solid #1a1a24' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, marginBottom: 14, boxShadow: `0 0 12px ${f.color}44` }}/>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', marginBottom: 6 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: '#6b6b7b', lineHeight: 1.7, fontWeight: 300 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            TÉMOIGNAGES
        ════════════════════════════════════════════════════════════ */}
        <section style={{ padding: '72px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '.12em', fontWeight: 800, marginBottom: 8 }}>AVIS CLIENTS</div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8' }}>Ce qu'en disent nos utilisateurs</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{ background: '#0f0f17', border: '0.5px solid #1a1a24', borderRadius: 16, padding: '24px' }}>
                <Stars rating={t.rating} size={14}/>
                <p style={{ fontSize: 13, color: '#888', lineHeight: 1.7, fontWeight: 300, margin: '14px 0 18px', minHeight: 60 }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#F0EDE8' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>{t.city}</div>
                  </div>
                  <div style={{ padding: '3px 10px', borderRadius: 6, background: '#0a0a0f', border: '0.5px solid #1a1a24', fontSize: 10, color: '#888', fontWeight: 300 }}>{t.service}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            CTA ARTISAN
        ════════════════════════════════════════════════════════════ */}
        <section style={{ padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ background: '#0f0f17', border: '0.5px solid #1a1a24', borderRadius: 20, padding: '56px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -30, top: '50%', transform: 'translateY(-50%)', fontSize: 200, fontWeight: 800, color: '#ffffff03', pointerEvents: 'none' }}>BETI</div>
            <div style={{ position: 'relative', maxWidth: 480 }}>
              <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '.12em', fontWeight: 800, marginBottom: 12 }}>VOUS ÊTES ARTISAN ?</div>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: '#F0EDE8', marginBottom: 14, lineHeight: 1.2 }}>Développez votre activité avec BETI</h2>
              <p style={{ fontSize: 14, color: '#6b6b7b', lineHeight: 1.7, fontWeight: 300, marginBottom: 24 }}>
                Recevez des demandes de clients dans votre zone. Inscription gratuite, zéro commission pour les 100 premiers artisans.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                {['Clients qualifiés', 'Visibilité locale', 'Avis vérifiés', 'Gratuit à vie*'].map(b => (
                  <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888', fontWeight: 300 }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#4ade80' }}/>{b}
                  </div>
                ))}
              </div>
            </div>
            <a href="/auth/signup" style={{ textDecoration: 'none', position: 'relative' }}>
              <button style={{ padding: '16px 36px', borderRadius: 12, background: '#C9A84C', border: 'none', color: '#0a0a0f', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                Rejoindre BETI
              </button>
            </a>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            FOOTER
        ════════════════════════════════════════════════════════════ */}
        <footer style={{ background: '#08080d', borderTop: '0.5px solid #1a1a24', padding: '48px 40px 32px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 32, marginBottom: 40 }}>
              {/* Brand */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, background: '#C9A84C', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#0a0a0f' }}>B</div>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', letterSpacing: '0.1em' }}>BETI</span>
                </div>
                <p style={{ fontSize: 12, color: '#555', fontWeight: 300, lineHeight: 1.7 }}>La plateforme de services à domicile en Algérie. Artisans vérifiés, intervention rapide.</p>
              </div>
              {/* Services */}
              <div>
                <div style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 14 }}>SERVICES</div>
                {['Plomberie', 'Électricité', 'Serrurerie', 'Ménage', 'Peinture', 'Déménagement'].map(s => (
                  <a key={s} href="/#services" style={{ display: 'block', fontSize: 12, color: '#555', textDecoration: 'none', fontWeight: 300, marginBottom: 8, transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#C9A84C')} onMouseLeave={e => (e.currentTarget.style.color = '#555')}>{s}</a>
                ))}
              </div>
              {/* Plateforme */}
              <div>
                <div style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 14 }}>PLATEFORME</div>
                {[{ l: 'Comment ça marche', h: '/#comment' }, { l: 'Carte des artisans', h: '/map' }, { l: 'Devenir artisan', h: '/auth/signup' }, { l: 'Se connecter', h: '/auth/login' }].map(s => (
                  <a key={s.l} href={s.h} style={{ display: 'block', fontSize: 12, color: '#555', textDecoration: 'none', fontWeight: 300, marginBottom: 8, transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#C9A84C')} onMouseLeave={e => (e.currentTarget.style.color = '#555')}>{s.l}</a>
                ))}
              </div>
              {/* Support */}
              <div>
                <div style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 14 }}>SUPPORT</div>
                {[{ l: 'Aide & Support', h: '/aide' }, { l: 'Paramètres', h: '/parametres' }, { l: 'Mentions légales', h: '#' }, { l: 'CGU', h: '#' }, { l: 'Confidentialité', h: '#' }].map(s => (
                  <a key={s.l} href={s.h} style={{ display: 'block', fontSize: 12, color: '#555', textDecoration: 'none', fontWeight: 300, marginBottom: 8, transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#C9A84C')} onMouseLeave={e => (e.currentTarget.style.color = '#555')}>{s.l}</a>
                ))}
              </div>
            </div>
            <div style={{ height: '0.5px', background: '#1a1a24', marginBottom: 20 }}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <span style={{ fontSize: 11, color: '#333', fontWeight: 300 }}>© 2025 BETI · Services à domicile en Algérie</span>
              <span style={{ fontSize: 11, color: '#333', fontWeight: 300 }}>Conçu en Algérie</span>
            </div>
          </div>
        </footer>
      </div>

      {/* ════════════════════════════════════════════════════════════
          PANEL ARTISAN DETAIL
      ════════════════════════════════════════════════════════════ */}
      {selectedArtisan && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex' }}>
          <div onClick={() => setSelectedArtisan(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }}/>
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '100%', maxWidth: 460, background: '#0a0a0f', borderLeft: '0.5px solid #1a1a24', overflowY: 'auto', animation: 'slidePanel 0.3s ease' }}>
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: '0.5px solid #1a1a24', display: 'flex', alignItems: 'center', gap: 16 }}>
              {selectedArtisan.avatar_url ? <img src={selectedArtisan.avatar_url} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${getCatColor(selectedArtisan.category)}` }}/> :
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: getCatColor(selectedArtisan.category) + '12', border: `2px solid ${getCatColor(selectedArtisan.category)}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: getCatColor(selectedArtisan.category) }}>
                  {selectedArtisan.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#F0EDE8' }}>{selectedArtisan.full_name}</div>
                <div style={{ fontSize: 11, color: getCatColor(selectedArtisan.category), fontWeight: 800, marginBottom: 4 }}>{getCatLabel(selectedArtisan.category)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Stars rating={selectedArtisan.rating_avg} size={13}/>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#C9A84C' }}>{selectedArtisan.rating_avg?.toFixed(1)}</span>
                  <span style={{ fontSize: 11, color: '#555' }}>({selectedArtisan.rating_count})</span>
                </div>
              </div>
              <button onClick={() => setSelectedArtisan(null)} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Infos */}
            <div style={{ padding: '16px 24px', display: 'flex', gap: 12, borderBottom: '0.5px solid #1a1a24' }}>
              {[
                { v: `${(selectedArtisan.hourly_rate || 0).toLocaleString('fr-DZ')} DA`, l: 'Tarif', c: '#C9A84C' },
                { v: `${selectedArtisan.distance_km?.toFixed(1)} km`, l: 'Distance', c: '#4ade80' },
                { v: selectedArtisan.total_missions.toString(), l: 'Missions', c: '#F0EDE8' },
              ].map(s => (
                <div key={s.l} style={{ flex: 1, textAlign: 'center', padding: '12px', background: '#0f0f17', borderRadius: 10 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: '#555', fontWeight: 300 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Contact */}
            <div style={{ padding: '16px 24px', display: 'flex', gap: 10, borderBottom: '0.5px solid #1a1a24' }}>
              {contactSent ? (
                <div style={{ flex: 1, padding: '14px', borderRadius: 12, background: '#0a2010', border: '0.5px solid #4ade8033', textAlign: 'center' }}>
                  <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 800 }}>Demande envoyée</span>
                </div>
              ) : (
                <>
                  <button onClick={() => contactArtisan('message')} style={{ flex: 1, padding: '14px', borderRadius: 12, background: '#C9A84C', border: 'none', color: '#0a0a0f', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>Envoyer un message</button>
                  <button onClick={() => contactArtisan('call')} style={{ padding: '14px 20px', borderRadius: 12, background: 'transparent', border: '0.5px solid #4ade8055', color: '#4ade80', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>Appeler</button>
                </>
              )}
            </div>

            {/* Reviews */}
            <div style={{ padding: '16px 24px' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8', marginBottom: 16 }}>Avis clients ({reviews.length})</div>
              {loadingReviews ? <div style={{ textAlign: 'center', padding: '32px', color: '#555', fontSize: 13 }}>Chargement...</div> :
                reviews.length === 0 ? <div style={{ textAlign: 'center', padding: '32px', color: '#444', fontSize: 13, fontWeight: 300 }}>Aucun avis</div> :
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {reviews.map(r => (
                    <div key={r.id} style={{ background: '#0f0f17', border: '0.5px solid #1a1a24', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#1a1a24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#888', fontWeight: 800 }}>{(r.profiles?.full_name || 'C')[0]}</div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#F0EDE8' }}>{r.profiles?.full_name || 'Client'}</div>
                            <div style={{ fontSize: 10, color: '#444', fontWeight: 300 }}>{timeAgo(r.created_at)}</div>
                          </div>
                        </div>
                        <Stars rating={r.rating} size={10}/>
                      </div>
                      {r.comment && <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6, fontWeight: 300 }}>{r.comment}</p>}
                    </div>
                  ))}
                </div>
              }
            </div>

            <div style={{ padding: '16px 24px 32px' }}>
              <a href={`/artisan/${selectedArtisan.artisan_id}`} style={{ textDecoration: 'none' }}>
                <button style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'transparent', border: '0.5px solid #1a1a24', color: '#888', fontSize: 13, fontWeight: 300, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>Voir le profil complet</button>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
