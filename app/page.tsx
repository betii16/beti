'use client'

import { useState, useEffect, useRef } from 'react'
import { AlgeriaCitySearch, ALGERIA_CITIES } from '@/components/AlgeriaSearch'
import { OtherCategorySearch } from '@/components/OtherCategory'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Types ──────────────────────────────────────────────────────────

type Artisan = {
  artisan_id: string
  full_name: string
  avatar_url: string | null
  category: string
  rating_avg: number
  rating_count: number
  hourly_rate: number
  distance_km: number
  is_available: boolean
  total_missions: number
}

// ── Data ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'plomberie',    icon: '⚙',  label: 'Plomberie',    color: '#3b82f6', bg: 'linear-gradient(135deg,#0d1a2a,#162030)' },
  { id: 'electricite',  icon: '⚡',  label: 'Électricité',  color: '#f59e0b', bg: 'linear-gradient(135deg,#1e1600,#2a1e00)' },
  { id: 'menage',       icon: '✦',  label: 'Ménage',        color: '#10b981', bg: 'linear-gradient(135deg,#051408,#0a2010)' },
  { id: 'demenagement', icon: '◈',  label: 'Déménagement',  color: '#8b5cf6', bg: 'linear-gradient(135deg,#0f081e,#1a1030)' },
  { id: 'jardinage',    icon: '❧',  label: 'Jardinage',     color: '#22c55e', bg: 'linear-gradient(135deg,#061204,#0a1e08)' },
  { id: 'peinture',     icon: '◉',  label: 'Peinture',      color: '#ef4444', bg: 'linear-gradient(135deg,#1a0505,#2a0a0a)' },
  { id: 'serrurerie',   icon: '⌘',  label: 'Serrurerie',    color: '#f97316', bg: 'linear-gradient(135deg,#180d00,#2a1400)' },
  { id: 'informatique', icon: '⬡',  label: 'Informatique',  color: '#6366f1', bg: 'linear-gradient(135deg,#080a1e,#0f1030)' },
  { id: 'coiffure',     icon: '✂',  label: 'Coiffure',      color: '#ec4899', bg: 'linear-gradient(135deg,#180510,#2a0a1e)' },
  { id: 'autre',        icon: '✳',  label: 'Autre',          color: '#a78bfa', bg: 'linear-gradient(135deg,#1a1030,#0f081e)' },
]

// ── Service Dropdown ───────────────────────────────────────────────

function ServiceDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = CATEGORIES.find(c => c.id === value)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      {/* Bouton */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8,
          background: '#161620', border: `0.5px solid ${selected ? selected.color + '66' : '#2a2a3a'}`,
          borderRadius: 10, cursor: 'pointer', outline: 'none',
          transition: 'border-color 0.2s', fontFamily: 'Nexa, sans-serif',
        }}
      >
        <span style={{ fontSize: 15 }}>{selected ? selected.icon : '🔧'}</span>
        <span style={{ flex: 1, fontSize: 13, color: selected ? '#F0EDE8' : '#555', fontWeight: selected ? 800 : 300, textAlign: 'left' }}>
          {selected ? selected.label : 'Choisir un service...'}
        </span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 9999,
          background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14,
          overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {/* Option tout effacer */}
          <div
            onClick={() => { onChange(''); setOpen(false) }}
            style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '0.5px solid #1e1e2a', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1e1e2a')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: 14 }}>✳</span>
            <span style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>Tous les services</span>
          </div>

          {/* Services */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {CATEGORIES.map((cat, i) => (
              <div
                key={cat.id}
                onClick={() => { onChange(cat.id); setOpen(false) }}
                style={{
                  padding: '11px 14px', cursor: 'pointer',
                  borderBottom: i < CATEGORIES.length - 2 ? '0.5px solid #1e1e2a' : 'none',
                  borderRight: i % 2 === 0 ? '0.5px solid #1e1e2a' : 'none',
                  background: value === cat.id ? cat.bg : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (value !== cat.id) e.currentTarget.style.background = '#1e1e2a' }}
                onMouseLeave={e => { if (value !== cat.id) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: 15 }}>{cat.icon}</span>
                <span style={{ fontSize: 13, fontWeight: value === cat.id ? 800 : 300, color: value === cat.id ? cat.color : '#888' }}>
                  {cat.label}
                </span>
                {value === cat.id && <span style={{ marginLeft: 'auto', fontSize: 10, color: cat.color }}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── CategoryChip ───────────────────────────────────────────────────

function CategoryChip({ cat, active, onClick }: {
  cat: typeof CATEGORIES[0]; active: boolean; onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  const isOn = active || hovered

  const handleClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const id = Date.now()
    setRipples(prev => [...prev, { id, x: e.clientX - rect.left - 60, y: e.clientY - rect.top - 60 }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 500)
    setClicked(true); setTimeout(() => setClicked(false), 150)
    onClick()
  }

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 9,
        padding: '12px 20px', borderRadius: 12, cursor: 'pointer', overflow: 'hidden',
        border: `0.5px solid ${isOn ? cat.color + '99' : '#2a2a3a'}`,
        background: '#161620',
        boxShadow: isOn ? `0 6px 24px ${cat.color}22, inset 0 0 16px ${cat.color}0a` : 'none',
        transition: 'transform .25s cubic-bezier(.4,0,.2,1), box-shadow .25s, border-color .25s',
        transform: clicked ? 'scale(0.97)' : hovered ? 'translateY(-3px) scale(1.03)' : 'translateY(0) scale(1)',
        outline: 'none', fontFamily: 'Nexa, sans-serif',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: cat.bg, opacity: isOn ? 1 : 0, transition: 'opacity .3s ease', borderRadius: 'inherit' }}/>
      {ripples.map(r => (
        <div key={r.id} style={{ position: 'absolute', width: 120, height: 120, left: r.x, top: r.y, borderRadius: '50%', background: cat.color, opacity: 0.2, transform: 'scale(0)', animation: 'beti-ripple .5s ease-out forwards', pointerEvents: 'none' }}/>
      ))}
      <div style={{ position: 'relative', zIndex: 1, fontSize: 15, width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isOn ? cat.color + '28' : 'rgba(255,255,255,.05)', color: isOn ? cat.color : '#666', transition: 'transform .3s cubic-bezier(.34,1.56,.64,1), background .25s, color .25s', transform: hovered ? 'rotate(-12deg) scale(1.2)' : 'rotate(0) scale(1)' }}>
        {cat.icon}
      </div>
      <span style={{ position: 'relative', zIndex: 1, fontSize: 13, fontWeight: 800, color: isOn ? cat.color : '#777', transition: 'color .25s ease' }}>
        {cat.label}
      </span>
    </button>
  )
}

// ── Stars ──────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill={i <= Math.round(rating) ? '#C9A84C' : '#2a2a3a'}>
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      ))}
    </div>
  )
}

// ── ArtisanCard ────────────────────────────────────────────────────

function ArtisanCard({ artisan, index }: { artisan: Artisan; index: number }) {
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)

  const catColor = CATEGORIES.find(c => artisan.category?.toLowerCase().includes(c.id.slice(0, 5)))?.color || '#C9A84C'
  const initials = artisan.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'A'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => { setClicked(true); setTimeout(() => setClicked(false), 300); window.location.href = `/artisan/${artisan.artisan_id}` }}
      style={{
        background: hovered ? '#1c1c28' : '#161620',
        border: `0.5px solid ${hovered ? catColor + '55' : '#2a2a3a'}`,
        borderRadius: 18, padding: '22px', cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        transform: clicked ? 'scale(0.97)' : hovered ? 'translateY(-4px)' : 'translateY(0)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: catColor, transform: hovered ? 'scaleX(1)' : 'scaleX(0)', transformOrigin: 'left', transition: 'transform 0.3s ease' }}/>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        {artisan.avatar_url ? (
          <img src={artisan.avatar_url} alt={artisan.full_name} style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${catColor}` }}/>
        ) : (
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: catColor + '22', border: `1.5px solid ${hovered ? catColor : catColor + '44'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: catColor, transition: 'border-color 0.3s' }}>
            {initials}
          </div>
        )}
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', marginBottom: 3 }}>{artisan.full_name}</div>
          <div style={{ fontSize: 10, color: catColor, letterSpacing: '0.07em', fontWeight: 800 }}>{artisan.category?.toUpperCase()}</div>
        </div>
      </div>

      <div style={{ height: '0.5px', background: '#2a2a3a', marginBottom: 16 }}/>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Stars rating={artisan.rating_avg || 0}/>
          <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
            {artisan.rating_avg ? artisan.rating_avg.toFixed(1) : 'Nouveau'} · {artisan.rating_count || 0} avis
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#C9A84C' }}>
            {artisan.hourly_rate} DA<span style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>/h</span>
          </div>
          <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
            {artisan.distance_km?.toFixed(1)} km · {artisan.total_missions || 0} missions
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: '#0D0D12', border: '0.5px solid #2a2a3a', marginBottom: 14 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: artisan.is_available ? '#4ade80' : '#555', boxShadow: artisan.is_available ? '0 0 8px #4ade8088' : 'none' }}/>
        <span style={{ fontSize: 11, color: artisan.is_available ? '#4ade80' : '#555', fontWeight: 300 }}>
          {artisan.is_available ? 'Disponible maintenant' : 'Indisponible'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 6, background: '#1a1508', border: '0.5px solid #2a2010' }}>
          <div style={{ width: 14, height: 14, background: '#C9A84C', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#0D0D12' }}>B</div>
          <span style={{ fontSize: 9, color: '#C9A84C', fontWeight: 800 }}>CERTIFIÉ</span>
        </div>
      </div>

      <button style={{ width: '100%', padding: '12px', background: hovered ? catColor : 'transparent', border: `0.5px solid ${hovered ? catColor : '#2a2a3a'}`, borderRadius: 10, color: hovered ? '#0D0D12' : '#666', fontSize: 13, fontWeight: hovered ? 800 : 300, cursor: 'pointer', transition: 'all 0.25s ease', fontFamily: 'Nexa, sans-serif' }}>
        {artisan.is_available ? 'Réserver maintenant' : 'Voir le profil'}
      </button>
    </div>
  )
}

// ── Skeleton Card ──────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 18, padding: '22px' }}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
        <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#2a2a3a', animation: 'pulse 1.5s infinite' }}/>
        <div style={{ flex: 1 }}>
          <div style={{ height: 14, background: '#2a2a3a', borderRadius: 4, marginBottom: 8, animation: 'pulse 1.5s infinite' }}/>
          <div style={{ height: 10, background: '#2a2a3a', borderRadius: 4, width: '60%', animation: 'pulse 1.5s infinite' }}/>
        </div>
      </div>
      <div style={{ height: '0.5px', background: '#2a2a3a', marginBottom: 16 }}/>
      <div style={{ height: 40, background: '#2a2a3a', borderRadius: 8, marginBottom: 14, animation: 'pulse 1.5s infinite' }}/>
      <div style={{ height: 36, background: '#2a2a3a', borderRadius: 8, animation: 'pulse 1.5s infinite' }}/>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────

export default function BetiHomePage() {
  const [artisans, setArtisans] = useState<Artisan[]>([])
  const [loadingArtisans, setLoadingArtisans] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [counts, setCounts] = useState({ a: 0, b: 0, c: 0, d: 0 })
  const [userLocation, setUserLocation] = useState({ lat: 36.7538, lng: 3.0588 })
  const [selectedCity, setSelectedCity] = useState<string>('Alger')
  const [user, setUser] = useState<any>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const statsAnimated = useRef(false)

  useEffect(() => {
    // Auth
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    // Scroll
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)

    // Géolocalisation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // Garde Alger par défaut
      )
    }

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Charger artisans quand la localisation change
  useEffect(() => { loadArtisans() }, [userLocation, activeCategory])

  // Stats animées
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

  const loadArtisans = async () => {
    setLoadingArtisans(true)
    try {
      const { data, error } = await supabase.rpc('get_nearby_artisans', {
        lat: userLocation.lat,
        lng: userLocation.lng,
        radius_km: 50,
        category_filter: activeCategory || null,
      })
      if (!error && data) setArtisans(data)
    } catch (e) {
      // Fallback si la fonction n'existe pas encore
      const { data } = await supabase
        .from('artisans')
        .select('id, category, hourly_rate, is_available, rating_avg, rating_count, total_missions, profiles(full_name, avatar_url)')
        .eq('is_available', true)
        .limit(6)

      if (data) {
        setArtisans(data.map((a: any) => ({
          artisan_id: a.id,
          full_name: a.profiles?.full_name || 'Artisan',
          avatar_url: a.profiles?.avatar_url || null,
          category: a.category,
          rating_avg: a.rating_avg || 0,
          rating_count: a.rating_count || 0,
          hourly_rate: a.hourly_rate || 0,
          distance_km: Math.random() * 10,
          is_available: a.is_available,
          total_missions: a.total_missions || 0,
        })))
      } else {
        // Données démo si BDD vide
        setArtisans([
          { artisan_id: '1', full_name: 'Karim Benali',   avatar_url: null, category: 'plomberie',    rating_avg: 4.9, rating_count: 84,  hourly_rate: 3500, distance_km: 1.2, is_available: true,  total_missions: 312 },
          { artisan_id: '2', full_name: 'Sofiane Amrani', avatar_url: null, category: 'electricite',  rating_avg: 4.8, rating_count: 127, hourly_rate: 4000, distance_km: 2.8, is_available: true,  total_missions: 198 },
          { artisan_id: '3', full_name: 'Yacine Meziane', avatar_url: null, category: 'peinture',     rating_avg: 4.7, rating_count: 63,  hourly_rate: 3000, distance_km: 3.1, is_available: false, total_missions: 145 },
          { artisan_id: '4', full_name: 'Amina Kaci',     avatar_url: null, category: 'menage',       rating_avg: 5.0, rating_count: 211, hourly_rate: 2000, distance_km: 0.9, is_available: true,  total_missions: 521 },
          { artisan_id: '5', full_name: 'Riad Hamdi',     avatar_url: null, category: 'serrurerie',   rating_avg: 4.6, rating_count: 48,  hourly_rate: 4500, distance_km: 4.2, is_available: true,  total_missions: 89  },
          { artisan_id: '6', full_name: 'Nadia Bouzid',   avatar_url: null, category: 'coiffure',     rating_avg: 4.9, rating_count: 73,  hourly_rate: 1500, distance_km: 5.0, is_available: false, total_missions: 167 },
        ])
      }
    }
    setLoadingArtisans(false)
  }

  const filtered = artisans.filter(a => {
    if (!search) return true
    return a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
           a.category?.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <>
      <style suppressHydrationWarning>{`
        @keyframes beti-ripple { to { transform: scale(4); opacity: 0; } }
        @keyframes drift1 { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.1)} 66%{transform:translate(-20px,20px) scale(0.95)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes drift2 { 0%{transform:translate(0,0) scale(1)} 40%{transform:translate(-50px,25px) scale(1.08)} 70%{transform:translate(30px,-15px) scale(0.92)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes drift3 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,40px) scale(1.05)} 80%{transform:translate(-30px,-10px) scale(0.97)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes drift4 { 0%{transform:translate(0,0) scale(1)} 30%{transform:translate(-25px,-35px) scale(1.12)} 65%{transform:translate(35px,20px) scale(0.9)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0D0D12; color: #F0EDE8; font-family: Nexa, sans-serif; -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #C9A84C44; border-radius: 2px; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0D0D12', paddingTop: 64 }}>

        {/* Hero avec orbes */}
        <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 600, height: 350, background: '#C9A84C', opacity: 0.09, borderRadius: '50%', filter: 'blur(70px)', top: -100, left: '50%', transform: 'translateX(-50%)', animation: 'drift1 8s ease-in-out infinite', pointerEvents: 'none' }}/>
          <div style={{ position: 'absolute', width: 400, height: 400, background: '#3b82f6', opacity: 0.07, borderRadius: '50%', filter: 'blur(70px)', bottom: -120, left: -100, animation: 'drift2 11s ease-in-out infinite', pointerEvents: 'none' }}/>
          <div style={{ position: 'absolute', width: 350, height: 350, background: '#8b5cf6', opacity: 0.07, borderRadius: '50%', filter: 'blur(70px)', bottom: -100, right: -80, animation: 'drift3 9s ease-in-out infinite', pointerEvents: 'none' }}/>
          <div style={{ position: 'absolute', width: 200, height: 200, background: '#f59e0b', opacity: 0.06, borderRadius: '50%', filter: 'blur(60px)', top: '35%', right: '8%', animation: 'drift4 13s ease-in-out infinite', pointerEvents: 'none' }}/>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }}/>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 20, background: '#1a1508', border: '0.5px solid #2a2010', fontSize: 10, color: '#C9A84C', letterSpacing: '0.1em', fontWeight: 800, marginBottom: 24, position: 'relative', zIndex: 50 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C9A84C', animation: 'pulse 2s infinite' }}/>
            ARTISANS CERTIFIÉS · RÉPONSE EN 30 MIN
          </div>

          <h1 style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)', fontWeight: 800, lineHeight: 1.05, color: '#F0EDE8', marginBottom: 16, position: 'relative', zIndex: 50 }}>
            L'artisan qu'il vous faut,<br/>
            <span style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #FFE8A3 50%, #C9A84C 100%)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>maintenant.</span>
          </h1>

          <p style={{ fontSize: 16, color: '#555', maxWidth: 480, lineHeight: 1.7, margin: '0 auto 40px', fontWeight: 300, position: 'relative', zIndex: 50 }}>
            Des professionnels vérifiés et certifiés BETI,<br/>proches de chez vous, disponibles immédiatement.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 620, width: '100%', margin: '0 auto 32px', position: 'relative', zIndex: 50 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Dropdown service */}
              <ServiceDropdown
                value={selectedService}
                onChange={v => {
                  setSelectedService(v)
                  setActiveCategory(v || null)
                }}
              />
              {/* Champ ville */}
              <div style={{ flex: 1 }}>
                <AlgeriaCitySearch
                  defaultCity={ALGERIA_CITIES.find(c => c.id === 'alger-centre')}
                  onSelect={city => { setUserLocation({ lat: city.lat, lng: city.lng }); setSelectedCity(city.name) }}
                  placeholder="Votre ville... (ex: 16)"
                />
              </div>
              {/* Bouton recherche */}
              <button
                onClick={() => { loadArtisans() }}
                style={{ padding: '11px 20px', borderRadius: 10, background: '#C9A84C', border: 'none', color: '#0D0D12', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Nexa, sans-serif', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s' }}
                onMouseEnter={e => (e.target as HTMLElement).style.background = '#d4b55a'}
                onMouseLeave={e => (e.target as HTMLElement).style.background = '#C9A84C'}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0D0D12" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                Trouver
              </button>
            </div>

            {/* Recherche libre si "Autre" sélectionné */}
            {selectedService === 'autre' && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <OtherCategorySearch onSearch={kw => setSearch(kw)}/>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 2, marginTop: 8 }}>
            {['Paiement sécurisé', 'Pros vérifiés', 'Garantie satisfaction', 'Support 24/7'].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#444', fontWeight: 300 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#C9A84C' }}/>{t}
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <div ref={statsRef} style={{ background: '#09090f', borderTop: '0.5px solid #1e1e2a', borderBottom: '0.5px solid #1e1e2a', padding: '56px 40px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[
              { value: counts.a.toLocaleString('fr-FR') + '+', label: 'Artisans certifiés' },
              { value: counts.b + '%', label: 'Clients satisfaits' },
              { value: '< ' + counts.c + 'min', label: 'Temps de réponse' },
              { value: counts.d + '+', label: 'Villes couvertes' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '0 20px', borderRight: i < 3 ? '0.5px solid #1e1e2a' : 'none' }}>
                <div style={{ fontSize: 'clamp(2rem, 3vw, 3rem)', fontWeight: 800, color: '#C9A84C', lineHeight: 1, marginBottom: 10 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Catégories */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 40px 0' }}>
          <div style={{ marginBottom: 8, fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800 }}>NOS SERVICES</div>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#F0EDE8', marginBottom: 32, lineHeight: 1.2 }}>Tous vos besoins,<br/>un seul endroit.</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <CategoryChip key={cat.id} cat={cat}
                active={activeCategory === cat.id}
                onClick={() => {
                  const newCat = activeCategory === cat.id ? null : cat.id
                  setActiveCategory(newCat)
                  setSelectedService(newCat || '')
                }}
              />
            ))}
          </div>
          {/* Recherche libre si "Autre" cliqué depuis les chips */}
          {activeCategory === 'autre' && (
            <div style={{ marginTop: 16 }}>
              <OtherCategorySearch onSearch={kw => setSearch(kw)}/>
            </div>
          )}
        </section>

        {/* Artisans — données réelles */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 40px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <div style={{ marginBottom: 8, fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800 }}>ARTISANS BETI</div>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: '#F0EDE8', lineHeight: 1.2 }}>Proches de vous,<br/>prêts à intervenir.</h2>
            </div>
            <a href="/map" style={{ fontSize: 13, color: '#555', textDecoration: 'none', fontWeight: 300, display: 'flex', alignItems: 'center', gap: 6 }}>
              Voir sur la carte →
            </a>
          </div>

          {loadingArtisans ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {[1,2,3,4,5,6].map(i => <SkeletonCard key={i}/>)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#333' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#555', marginBottom: 8 }}>Aucun artisan trouvé</div>
              <div style={{ fontSize: 13, color: '#444', fontWeight: 300, marginBottom: 24 }}>
                {search ? `Aucun résultat pour "${search}"` : 'Aucun artisan disponible dans votre zone pour l\'instant'}
              </div>
              <button onClick={() => { setSearch(''); setActiveCategory(null) }} style={{ padding: '10px 24px', background: '#C9A84C', border: 'none', borderRadius: 10, color: '#0D0D12', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                Réinitialiser la recherche
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {filtered.map((a, i) => <ArtisanCard key={a.artisan_id} artisan={a} index={i}/>)}
            </div>
          )}
        </section>

        {/* Comment ça marche */}
        <section style={{ background: '#09090f', borderTop: '0.5px solid #1e1e2a', padding: '80px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 8 }}>COMMENT ÇA MARCHE</div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: '#F0EDE8', marginBottom: 48, lineHeight: 1.2 }}>Réservez en 3 étapes.</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 48 }}>
              {[
                { n: '01', title: 'Choisissez votre service', desc: 'Sélectionnez le type d\'intervention parmi nos 9 catégories.' },
                { n: '02', title: 'Choisissez votre artisan', desc: 'Comparez les profils, notes et avis des professionnels certifiés.' },
                { n: '03', title: 'Confirmez et payez', desc: 'Payez en toute sécurité. L\'artisan arrive à l\'heure.' },
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

        {/* CTA */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 40px' }}>
          <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 24, padding: '64px 52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', fontSize: 180, fontWeight: 800, color: '#1a1a22', pointerEvents: 'none', userSelect: 'none', lineHeight: 1 }}>BETI</div>
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 12 }}>DEVENEZ PARTENAIRE</div>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: '#F0EDE8', marginBottom: 14, lineHeight: 1.2 }}>Vous êtes artisan ?<br/>Rejoignez BETI.</h2>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, maxWidth: 420, fontWeight: 300 }}>Développez votre clientèle et bénéficiez de la certification BETI. Inscription gratuite.</p>
            </div>
            <div style={{ position: 'relative' }}>
              <a href="/auth/signup">
                <button style={{ padding: '16px 32px', borderRadius: 12, background: '#C9A84C', border: 'none', color: '#0D0D12', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s' }}
                  onMouseEnter={e => (e.target as HTMLElement).style.background = '#d4b55a'}
                  onMouseLeave={e => (e.target as HTMLElement).style.background = '#C9A84C'}
                >Devenir partenaire</button>
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ background: '#09090f', borderTop: '0.5px solid #1e1e2a', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: '#C9A84C', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#0D0D12' }}>B</div>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', letterSpacing: '0.1em' }}>BETI</span>
          </div>
          <span style={{ fontSize: 12, color: '#333', fontWeight: 300 }}>© 2025 BETI · Services à domicile</span>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Mentions légales', 'CGU', 'Confidentialité', 'Contact'].map(l => (
              <a key={l} href="#" style={{ fontSize: 12, color: '#333', textDecoration: 'none', fontWeight: 300, transition: 'color 0.2s' }}
                onMouseEnter={e => (e.target as HTMLElement).style.color = '#C9A84C'}
                onMouseLeave={e => (e.target as HTMLElement).style.color = '#333'}
              >{l}</a>
            ))}
          </div>
        </footer>

      </div>
    </>
  )
}
