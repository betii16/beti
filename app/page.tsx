'use client'
import { NotificationBell } from '@/components/NotificationBell'
import { NotificationProvider } from '@/components/NotificationBell'
import { useState, useEffect, useRef } from 'react'


// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
  id: string
  icon: string
  label: string
}

type Artisan = {
  id: number
  initials: string
  name: string
  category: string
  rating: number
  reviews: number
  distance: string
  price: number
  available: boolean
  color: string
  missions: number
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  { id: 'plomberie',    icon: '⚙',  label: 'Plomberie'    },
  { id: 'electricite',  icon: '⚡',  label: 'Électricité'  },
  { id: 'menage',       icon: '✦',  label: 'Ménage'       },
  { id: 'demenagement', icon: '◈',  label: 'Déménagement' },
  { id: 'jardinage',    icon: '❧',  label: 'Jardinage'    },
  { id: 'peinture',     icon: '◉',  label: 'Peinture'     },
  { id: 'serrurerie',   icon: '⌘',  label: 'Serrurerie'   },
  { id: 'informatique', icon: '⬡',  label: 'Informatique' },
]

const ARTISANS: Artisan[] = [
  { id: 1, initials: 'JD', name: 'Jean Dupont',     category: 'Plombier',        rating: 4.9, reviews: 84,  distance: '1.2', price: 45,  available: true,  color: '#C9A84C', missions: 312 },
  { id: 2, initials: 'ML', name: 'Marie Laurent',   category: 'Électricienne',   rating: 4.8, reviews: 127, distance: '2.8', price: 55,  available: true,  color: '#60a5fa', missions: 198 },
  { id: 3, initials: 'KS', name: 'Karim Seddik',    category: 'Peintre',         rating: 4.7, reviews: 63,  distance: '3.1', price: 40,  available: false, color: '#a78bfa', missions: 145 },
  { id: 4, initials: 'AB', name: 'Amina Benali',    category: 'Agent de ménage', rating: 5.0, reviews: 211, distance: '0.9', price: 25,  available: true,  color: '#4ade80', missions: 521 },
  { id: 5, initials: 'TP', name: 'Thomas Petit',    category: 'Serrurier',       rating: 4.6, reviews: 48,  distance: '4.2', price: 60,  available: true,  color: '#f97316', missions: 89  },
  { id: 6, initials: 'SC', name: 'Sophie Collin',   category: 'Jardinière',      rating: 4.9, reviews: 73,  distance: '5.0', price: 35,  available: false, color: '#34d399', missions: 167 },
]

const STATS = [
  { value: '12 000+', label: 'Artisans certifiés' },
  { value: '98%',     label: 'Clients satisfaits'  },
  { value: '< 30min', label: 'Temps de réponse'    },
  { value: '50+',     label: 'Villes couvertes'     },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill={i <= Math.round(rating) ? '#C9A84C' : '#2a2a3a'}>
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      ))}
    </div>
  )
}

function ArtisanCard({ artisan, index }: { artisan: Artisan; index: number }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#1a1a24' : '#161620',
        border: `0.5px solid ${hovered ? '#3a3a4a' : '#2a2a3a'}`,
        borderRadius: 16,
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        animationDelay: `${index * 80}ms`,
        animation: 'fadeUp 0.5s ease both',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 46, height: 46, borderRadius: '50%',
            background: artisan.color + '22',
            border: `1.5px solid ${artisan.color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 500, color: artisan.color,
            fontFamily: 'Georgia, serif',
          }}>
            {artisan.initials}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#F0EDE8', marginBottom: 2 }}>
              {artisan.name}
            </div>
            <div style={{ fontSize: 11, color: '#C9A84C', letterSpacing: '0.06em', fontWeight: 500 }}>
              {artisan.category.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Availability badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 20,
          background: artisan.available ? '#0a2010' : '#1a1010',
          border: `0.5px solid ${artisan.available ? '#0a3a20' : '#2a1010'}`,
          fontSize: 10, fontWeight: 500,
          color: artisan.available ? '#4ade80' : '#666',
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: artisan.available ? '#4ade80' : '#444',
          }} />
          {artisan.available ? 'Disponible' : 'Occupé'}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '0.5px', background: '#2a2a3a', marginBottom: 16 }} />

      {/* Stats row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <StarRating rating={artisan.rating} />
          <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
            {artisan.rating} · {artisan.reviews} avis
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: '#C9A84C' }}>
            {artisan.price} €<span style={{ fontSize: 11, color: '#555' }}>/h</span>
          </div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
            {artisan.distance} km · {artisan.missions} missions
          </div>
        </div>
      </div>

      {/* BETI certified badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 12px', borderRadius: 8,
        background: '#1a1508', border: '0.5px solid #2a2010',
        marginBottom: 14,
      }}>
        <div style={{
          width: 16, height: 16, background: '#C9A84C', borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 500, color: '#0D0D12', fontFamily: 'Georgia, serif',
        }}>B</div>
        <span style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.05em', fontWeight: 500 }}>
          ARTISAN BETI CERTIFIÉ
        </span>
      </div>

      {/* CTA */}
      <button style={{
        width: '100%', padding: '11px', borderRadius: 10,
        background: hovered ? '#C9A84C' : 'transparent',
        border: `0.5px solid ${hovered ? '#C9A84C' : '#2a2a3a'}`,
        color: hovered ? '#0D0D12' : '#888',
        fontSize: 13, fontWeight: 500, cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontFamily: 'inherit',
      }}>
        {artisan.available ? 'Réserver maintenant' : 'Voir le profil'}
      </button>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function BetiHomePage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const filtered = ARTISANS.filter(a => {
    const matchCat = !activeCategory || a.category.toLowerCase().includes(activeCategory.replace('electricite','electr').replace('menage','ménage'))
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0D0D12;
          color: #F0EDE8;
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        :root {
          --beti-bg:      #0D0D12;
          --beti-surface: #161620;
          --beti-gold:    #C9A84C;
          --beti-text:    #F0EDE8;
          --beti-muted:   #666666;
          --beti-border:  #2a2a3a;
          --beti-success: #4ade80;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }

        .beti-page {
          min-height: 100vh;
          background: #0D0D12;
        }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0D0D12; }
        ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 2px; }

        /* ── Nav ── */
        .beti-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          height: 64px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 40px;
          transition: all 0.3s ease;
        }
        .beti-nav.scrolled {
          background: rgba(9, 9, 15, 0.92);
          backdrop-filter: blur(16px);
          border-bottom: 0.5px solid #1e1e2a;
        }
        .beti-nav-logo {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none;
        }
        .beti-nav-icon {
          width: 36px; height: 36px;
          background: #C9A84C; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 600; color: #0D0D12;
          font-family: 'Cormorant Garamond', Georgia, serif;
        }
        .beti-nav-name {
          font-size: 18px; font-weight: 500; color: #F0EDE8;
          letter-spacing: 0.08em;
        }
        .beti-nav-links {
          display: flex; align-items: center; gap: 32px;
        }
        .beti-nav-link {
          font-size: 13px; color: #666; text-decoration: none;
          transition: color 0.2s;
          letter-spacing: 0.02em;
        }
        .beti-nav-link:hover { color: #F0EDE8; }
        .beti-nav-cta {
          display: flex; align-items: center; gap: 8px;
        }
        .btn-outline-sm {
          padding: 8px 18px; border-radius: 8px;
          background: transparent; border: 0.5px solid #2a2a3a;
          color: #888; font-size: 13px; cursor: pointer;
          transition: all 0.2s; font-family: 'DM Sans', sans-serif;
        }
        .btn-outline-sm:hover { border-color: #C9A84C; color: #C9A84C; }
        .btn-gold-sm {
          padding: 8px 18px; border-radius: 8px;
          background: #C9A84C; border: none;
          color: #0D0D12; font-size: 13px; font-weight: 500;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .btn-gold-sm:hover { background: #d4b55a; }

        /* ── Hero ── */
        .beti-hero {
          min-height: 100vh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 120px 24px 80px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .hero-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black, transparent);
        }
        .hero-glow {
          position: absolute;
          width: 600px; height: 300px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(201,168,76,0.08) 0%, transparent 70%);
          top: 30%; left: 50%; transform: translateX(-50%);
          pointer-events: none;
        }
        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px; border-radius: 20px;
          background: #1a1508; border: 0.5px solid #2a2010;
          font-size: 11px; color: #C9A84C; letter-spacing: 0.1em; font-weight: 500;
          margin-bottom: 28px;
          animation: fadeIn 0.6s ease both;
        }
        .hero-h1 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(3rem, 7vw, 6rem);
          font-weight: 500; line-height: 1.05;
          color: #F0EDE8;
          margin-bottom: 10px;
          animation: fadeUp 0.7s ease 0.1s both;
        }
        .hero-h1-accent {
          background: linear-gradient(135deg, #C9A84C 0%, #e8c96a 50%, #C9A84C 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: fadeUp 0.7s ease 0.1s both, shimmer 3s linear 1s infinite;
        }
        .hero-sub {
          font-size: 16px; color: #555; max-width: 480px;
          line-height: 1.7; margin: 0 auto 48px;
          animation: fadeUp 0.7s ease 0.2s both;
          font-weight: 300;
        }
        .hero-search-wrap {
          display: flex; gap: 10px; max-width: 580px; width: 100%;
          margin: 0 auto 48px;
          animation: fadeUp 0.7s ease 0.3s both;
        }
        .hero-search-input {
          flex: 1; padding: 16px 22px;
          background: #161620; border: 0.5px solid #2a2a3a;
          border-radius: 12px; color: #F0EDE8; font-size: 15px;
          outline: none; font-family: 'DM Sans', sans-serif;
          transition: border-color 0.2s;
        }
        .hero-search-input::placeholder { color: #3a3a4a; }
        .hero-search-input:focus { border-color: #C9A84C44; }
        .hero-search-btn {
          padding: 16px 28px; border-radius: 12px;
          background: #C9A84C; border: none;
          color: #0D0D12; font-size: 15px; font-weight: 500;
          cursor: pointer; white-space: nowrap;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.2s;
          display: flex; align-items: center; gap: 8px;
        }
        .hero-search-btn:hover { background: #d4b55a; }
        .hero-trust {
          display: flex; align-items: center; gap: 20px; flex-wrap: wrap; justify-content: center;
          animation: fadeUp 0.7s ease 0.4s both;
        }
        .hero-trust-item {
          display: flex; align-items: center; gap: 7px;
          font-size: 12px; color: #444;
        }
        .hero-trust-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #C9A84C;
        }

        /* ── Stats ── */
        .beti-stats {
          border-top: 0.5px solid #1e1e2a;
          border-bottom: 0.5px solid #1e1e2a;
          padding: 48px 40px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 32px;
          text-align: center;
          background: #09090f;
          animation: fadeIn 0.8s ease 0.5s both;
        }
        .stat-value {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 40px; font-weight: 500; color: #C9A84C;
          line-height: 1;
          margin-bottom: 8px;
        }
        .stat-label {
          font-size: 12px; color: #555; letter-spacing: 0.04em;
        }

        /* ── Categories ── */
        .beti-categories {
          padding: 72px 40px 0;
          max-width: 1200px; margin: 0 auto;
        }
        .section-header {
          display: flex; align-items: flex-end; justify-content: space-between;
          margin-bottom: 32px;
        }
        .section-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 32px; font-weight: 500; color: #F0EDE8;
          line-height: 1.2;
        }
        .section-eyebrow {
          font-size: 10px; color: #C9A84C; letter-spacing: 0.12em;
          font-weight: 500; margin-bottom: 8px;
        }
        .section-link {
          font-size: 13px; color: #555; text-decoration: none;
          transition: color 0.2s; display: flex; align-items: center; gap: 6px;
        }
        .section-link:hover { color: #C9A84C; }
        .cats-grid {
          display: flex; gap: 10px; flex-wrap: wrap;
        }
        .cat-chip {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 18px; border-radius: 10px;
          background: #161620; border: 0.5px solid #2a2a3a;
          font-size: 13px; color: #666; cursor: pointer;
          transition: all 0.2s; user-select: none;
        }
        .cat-chip:hover {
          border-color: #3a3a4a; color: #F0EDE8;
        }
        .cat-chip.active {
          background: #1a1508; border-color: #3a2a10; color: #C9A84C;
        }
        .cat-icon { font-size: 14px; }

        /* ── Artisans grid ── */
        .beti-artisans {
          padding: 48px 40px 80px;
          max-width: 1200px; margin: 0 auto;
        }
        .artisans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }
        .no-results {
          grid-column: 1/-1; text-align: center; padding: 60px;
          color: #333; font-size: 14px;
        }

        /* ── How it works ── */
        .beti-how {
          border-top: 0.5px solid #1e1e2a;
          padding: 80px 40px;
          background: #09090f;
        }
        .how-inner { max-width: 1100px; margin: 0 auto; }
        .how-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 40px; margin-top: 48px;
        }
        .how-step-num {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 48px; font-weight: 500; color: #1e1e2a;
          line-height: 1; margin-bottom: 16px;
        }
        .how-step-title {
          font-size: 16px; font-weight: 500; color: #F0EDE8;
          margin-bottom: 10px;
        }
        .how-step-desc {
          font-size: 13px; color: #555; line-height: 1.7; font-weight: 300;
        }
        .how-step-line {
          width: 24px; height: 1px; background: #C9A84C;
          margin-bottom: 16px;
        }

        /* ── CTA Artisan ── */
        .beti-cta {
          padding: 80px 40px;
          max-width: 1200px; margin: 0 auto;
        }
        .cta-inner {
          background: #161620;
          border: 0.5px solid #2a2a3a;
          border-radius: 24px;
          padding: 60px 48px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 40px; flex-wrap: wrap;
          position: relative; overflow: hidden;
        }
        .cta-bg-text {
          position: absolute; right: -20px; top: 50%;
          transform: translateY(-50%);
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 160px; font-weight: 500; color: #1a1a20;
          pointer-events: none; line-height: 1; user-select: none;
          letter-spacing: 0.05em;
        }
        .cta-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 36px; font-weight: 500; color: #F0EDE8;
          margin-bottom: 12px; line-height: 1.2;
        }
        .cta-sub {
          font-size: 14px; color: #555; line-height: 1.7;
          max-width: 400px; font-weight: 300;
        }
        .cta-btns {
          display: flex; gap: 12px; flex-wrap: wrap;
          position: relative;
        }
        .btn-gold-lg {
          padding: 16px 32px; border-radius: 12px;
          background: #C9A84C; border: none;
          color: #0D0D12; font-size: 15px; font-weight: 500;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: background 0.2s; white-space: nowrap;
        }
        .btn-gold-lg:hover { background: #d4b55a; }
        .btn-outline-lg {
          padding: 16px 32px; border-radius: 12px;
          background: transparent; border: 0.5px solid #2a2a3a;
          color: #666; font-size: 15px; cursor: pointer;
          font-family: 'DM Sans', sans-serif; transition: all 0.2s;
        }
        .btn-outline-lg:hover { border-color: #C9A84C; color: #C9A84C; }

        /* ── Footer ── */
        .beti-footer {
          border-top: 0.5px solid #1e1e2a;
          padding: 40px;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 20px;
          background: #09090f;
        }
        .footer-copy {
          font-size: 12px; color: #333;
        }
        .footer-links {
          display: flex; gap: 24px;
        }
        .footer-link {
          font-size: 12px; color: #333; text-decoration: none;
          transition: color 0.2s;
        }
        .footer-link:hover { color: #C9A84C; }

        @media (max-width: 768px) {
          .beti-nav { padding: 0 20px; }
          .beti-nav-links { display: none; }
          .hero-search-wrap { flex-direction: column; }
          .beti-categories, .beti-artisans, .beti-cta { padding-left: 20px; padding-right: 20px; }
          .beti-stats { padding: 40px 20px; }
          .beti-how { padding: 60px 20px; }
          .cta-inner { padding: 40px 28px; }
          .cta-bg-text { display: none; }
          .beti-footer { padding: 32px 20px; }
        }
      `}</style>

      <div className="beti-page">

        {/* ── Navigation ── */}
        <nav className={`beti-nav${scrolled ? ' scrolled' : ''}`}>
          <a href="#" className="beti-nav-logo">
            <div className="beti-nav-icon">B</div>
            <span className="beti-nav-name">BETI</span>
          </a>

          <div className="beti-nav-links">
            <a href="#services" className="beti-nav-link">Services</a>
            <a href="#artisans" className="beti-nav-link">Artisans</a>
            <a href="#comment" className="beti-nav-link">Comment ça marche</a>
            <a href="#artisan" className="beti-nav-link">Devenir partenaire</a>
          </div>

          <div className="beti-nav-cta">
            <button className="btn-outline-sm">Se connecter</button>
            <button className="btn-gold-sm">Commencer</button>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="beti-hero" ref={heroRef}>
          <div className="hero-grid" />
          <div className="hero-glow" />

          <div className="hero-eyebrow">
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C9A84C' }} />
            ARTISANS CERTIFIÉS · RÉPONSE EN 30 MIN
          </div>

          <h1 className="hero-h1">
            L'artisan qu'il vous faut,<br />
            <span className="hero-h1-accent">maintenant.</span>
          </h1>

          <p className="hero-sub">
            Des professionnels vérifiés et certifiés BETI, proches de chez vous,
            disponibles immédiatement. Réservez en 3 clics.
          </p>

          <div className="hero-search-wrap">
            <input
              type="text"
              className="hero-search-input"
              placeholder="Plombier, électricien, ménage..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="hero-search-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D0D12" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              Trouver un pro
            </button>
          </div>

          <div className="hero-trust">
            {['Paiement sécurisé', 'Pros vérifiés', 'Garantie satisfaction', 'Support 24/7'].map((t, i) => (
              <div className="hero-trust-item" key={i}>
                <div className="hero-trust-dot" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Stats ── */}
        <div className="beti-stats">
          {STATS.map(s => (
            <div key={s.label}>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Categories ── */}
        <section className="beti-categories" id="services">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">NOS SERVICES</div>
              <h2 className="section-title">Tous vos besoins,<br />un seul endroit.</h2>
            </div>
            <a href="#" className="section-link">
              Voir tous les services
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>

          <div className="cats-grid">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`cat-chip${activeCategory === cat.id ? ' active' : ''}`}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              >
                <span className="cat-icon">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Artisans ── */}
        <section className="beti-artisans" id="artisans">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">ARTISANS BETI</div>
              <h2 className="section-title">Proches de vous,<br />prêts à intervenir.</h2>
            </div>
            <a href="#" className="section-link">
              Voir tout
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>

          <div className="artisans-grid">
            {filtered.length > 0
              ? filtered.map((a, i) => <ArtisanCard key={a.id} artisan={a} index={i} />)
              : <div className="no-results">Aucun artisan trouvé pour cette recherche.</div>
            }
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="beti-how" id="comment">
          <div className="how-inner">
            <div className="section-eyebrow" style={{ marginBottom: 8 }}>COMMENT ÇA MARCHE</div>
            <h2 className="section-title">Réservez en 3 étapes.</h2>
            <div className="how-grid">
              {[
                { n: '01', title: 'Choisissez votre service', desc: 'Sélectionnez le type d\'intervention parmi nos 8 catégories. Précisez votre besoin en quelques mots.' },
                { n: '02', title: 'Choisissez votre artisan', desc: 'Comparez les profils, notes et avis des professionnels BETI certifiés disponibles près de vous.' },
                { n: '03', title: 'Confirmez et payez', desc: 'Sélectionnez la date, validez le devis et payez de manière sécurisée. L\'artisan arrive à l\'heure.' },
              ].map(step => (
                <div key={step.n}>
                  <div className="how-step-num">{step.n}</div>
                  <div className="how-step-line" />
                  <div className="how-step-title">{step.title}</div>
                  <div className="how-step-desc">{step.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Artisan ── */}
        <section className="beti-cta" id="artisan">
          <div className="cta-inner">
            <div className="cta-bg-text">BETI</div>
            <div>
              <h2 className="cta-title">Vous êtes artisan ?<br />Rejoignez BETI.</h2>
              <p className="cta-sub">
                Développez votre clientèle, gérez vos missions en toute simplicité
                et bénéficiez de la certification BETI. Inscription gratuite.
              </p>
            </div>
            <div className="cta-btns">
              <button className="btn-gold-lg">Devenir partenaire</button>
              <button className="btn-outline-lg">En savoir plus</button>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="beti-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, background: '#C9A84C', borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 500, color: '#0D0D12',
              fontFamily: 'Georgia, serif',
            }}>B</div>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#F0EDE8', letterSpacing: '0.06em' }}>BETI</span>
          </div>
          <span className="footer-copy">© 2025 BETI · Services à domicile</span>
          <div className="footer-links">
            {['Mentions légales', 'CGU', 'Confidentialité', 'Contact'].map(l => (
              <a href="#" className="footer-link" key={l}>{l}</a>
            ))}
          </div>
        </footer>

      </div>
    </>
  )
}
