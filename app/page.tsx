'use client'

import { useState, useEffect, useRef } from 'react'

const CATEGORIES = [
  { id: 'plomberie',    icon: '⚙',  label: 'Plomberie'    },
  { id: 'electricite',  icon: '⚡',  label: 'Électricité'  },
  { id: 'menage',       icon: '✦',  label: 'Ménage'       },
  { id: 'demenagement', icon: '◈',  label: 'Déménagement' },
  { id: 'jardinage',    icon: '❧',  label: 'Jardinage'    },
  { id: 'peinture',     icon: '◉',  label: 'Peinture'     },
  { id: 'serrurerie',   icon: '⌘',  label: 'Serrurerie'   },
  { id: 'informatique', icon: '⬡',  label: 'Informatique' },
]

const ARTISANS = [
  { id: 1, initials: 'JD', name: 'Jean Dupont',   category: 'Plombier',        rating: 4.9, reviews: 84,  distance: '1.2', price: 45,  available: true,  color: '#C9A84C', missions: 312, tag: 'Top BETI' },
  { id: 2, initials: 'ML', name: 'Marie Laurent', category: 'Électricienne',   rating: 4.8, reviews: 127, distance: '2.8', price: 55,  available: true,  color: '#60a5fa', missions: 198, tag: '' },
  { id: 3, initials: 'KS', name: 'Karim Seddik',  category: 'Peintre',         rating: 4.7, reviews: 63,  distance: '3.1', price: 40,  available: false, color: '#a78bfa', missions: 145, tag: '' },
  { id: 4, initials: 'AB', name: 'Amina Benali',  category: 'Ménage',          rating: 5.0, reviews: 211, distance: '0.9', price: 25,  available: true,  color: '#4ade80', missions: 521, tag: 'Top BETI' },
  { id: 5, initials: 'TP', name: 'Thomas Petit',  category: 'Serrurier',       rating: 4.6, reviews: 48,  distance: '4.2', price: 60,  available: true,  color: '#f97316', missions: 89,  tag: '' },
  { id: 6, initials: 'SC', name: 'Sophie Collin', category: 'Jardinière',      rating: 4.9, reviews: 73,  distance: '5.0', price: 35,  available: false, color: '#34d399', missions: 167, tag: '' },
]

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

function ArtisanCard({ artisan, index }: { artisan: typeof ARTISANS[0]; index: number }) {
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)

  const handleClick = () => {
    setClicked(true)
    setTimeout(() => setClicked(false), 300)
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      style={{
        background: hovered ? '#1c1c28' : '#161620',
        border: `0.5px solid ${hovered ? artisan.color + '55' : '#2a2a3a'}`,
        borderRadius: 18, padding: '22px', cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        transform: clicked ? 'scale(0.97)' : hovered ? 'translateY(-4px)' : 'translateY(0)',
        opacity: 1, position: 'relative', overflow: 'hidden',
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Ligne colorée top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: artisan.color,
        transform: hovered ? 'scaleX(1)' : 'scaleX(0)',
        transformOrigin: 'left', transition: 'transform 0.3s ease',
      }}/>

      {/* Tag */}
      {artisan.tag && (
        <div style={{
          position: 'absolute', top: 14, right: 14,
          padding: '3px 8px', borderRadius: 6,
          background: '#1a1508', border: '0.5px solid #2a2010',
          fontSize: 9, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.06em',
        }}>{artisan.tag.toUpperCase()}</div>
      )}

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{
          width: 50, height: 50, borderRadius: '50%',
          background: artisan.color + '22',
          border: `1.5px solid ${hovered ? artisan.color : artisan.color + '44'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, fontWeight: 800, color: artisan.color,
          transition: 'border-color 0.3s',
        }}>{artisan.initials}</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', marginBottom: 3 }}>{artisan.name}</div>
          <div style={{ fontSize: 10, color: artisan.color, letterSpacing: '0.07em', fontWeight: 800 }}>
            {artisan.category.toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ height: '0.5px', background: '#2a2a3a', marginBottom: 16 }}/>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Stars rating={artisan.rating}/>
          <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{artisan.rating} · {artisan.reviews} avis</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#C9A84C' }}>
            {artisan.price}€<span style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>/h</span>
          </div>
          <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{artisan.distance} km · {artisan.missions} missions</div>
        </div>
      </div>

      {/* Disponibilité */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 12px', borderRadius: 8,
        background: '#0D0D12', border: '0.5px solid #2a2a3a', marginBottom: 14,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: artisan.available ? '#4ade80' : '#555',
          boxShadow: artisan.available ? '0 0 8px #4ade8088' : 'none',
        }}/>
        <span style={{ fontSize: 11, color: artisan.available ? '#4ade80' : '#555', fontWeight: 300 }}>
          {artisan.available ? 'Disponible maintenant' : 'Indisponible'}
        </span>
      </div>

      {/* CTA */}
      <button style={{
        width: '100%', padding: '12px',
        background: hovered ? artisan.color : 'transparent',
        border: `0.5px solid ${hovered ? artisan.color : '#2a2a3a'}`,
        borderRadius: 10,
        color: hovered ? '#0D0D12' : '#666',
        fontSize: 13, fontWeight: hovered ? 800 : 300,
        cursor: 'pointer', transition: 'all 0.25s ease',
        fontFamily: 'Nexa, sans-serif',
        transform: clicked ? 'scale(0.96)' : 'scale(1)',
      }}>
        {artisan.available ? 'Réserver maintenant' : 'Voir le profil'}
      </button>
    </div>
  )
}

export default function BetiHomePage() {
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [counts, setCounts] = useState({ a: 0, b: 0, c: 0, d: 0 })
  const statsRef = useRef<HTMLDivElement>(null)
  const statsAnimated = useRef(false)

  useEffect(() => {
    setMounted(true)
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !statsAnimated.current) {
        statsAnimated.current = true
        const targets = { a: 12000, b: 98, c: 30, d: 50 }
        const duration = 1800
        const start = Date.now()
        const tick = () => {
          const p = Math.min((Date.now() - start) / duration, 1)
          const ease = 1 - Math.pow(1 - p, 3)
          setCounts({
            a: Math.floor(ease * targets.a),
            b: Math.floor(ease * targets.b),
            c: Math.floor(ease * targets.c),
            d: Math.floor(ease * targets.d),
          })
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.3 })
    if (statsRef.current) obs.observe(statsRef.current)
    return () => obs.disconnect()
  }, [mounted])

  const filtered = ARTISANS.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase())
    const matchCat = !activeCategory || a.category.toLowerCase().includes(activeCategory.slice(0, 5).toLowerCase())
    return matchSearch && matchCat
  })

  const navStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    height: 64, padding: '0 40px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    transition: 'all 0.3s ease',
    background: scrolled ? 'rgba(9,9,15,0.95)' : 'transparent',
    borderBottom: scrolled ? '0.5px solid #1e1e2a' : 'none',
    backdropFilter: scrolled ? 'blur(20px)' : 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D12', color: '#F0EDE8', fontFamily: 'Nexa, sans-serif' }}>

      {/* Nav */}
      <nav style={navStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, background: '#C9A84C', borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#0D0D12',
          }}>B</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#F0EDE8', letterSpacing: '0.1em' }}>BETI</span>
        </div>

        <div style={{ display: 'flex', gap: 32 }}>
          {['Services', 'Artisans', 'Comment ça marche', 'Devenir partenaire'].map(l => (
            <a key={l} href="#" style={{ fontSize: 13, color: '#555', textDecoration: 'none', fontWeight: 300, transition: 'color 0.2s' }}
              onMouseEnter={e => (e.target as HTMLElement).style.color = '#F0EDE8'}
              onMouseLeave={e => (e.target as HTMLElement).style.color = '#555'}
            >{l}</a>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/auth/login">
            <button style={{
              padding: '8px 18px', borderRadius: 8, background: 'transparent',
              border: '0.5px solid #2a2a3a', color: '#888', fontSize: 13,
              cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300,
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#C9A84C'; (e.target as HTMLElement).style.color = '#C9A84C' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#2a2a3a'; (e.target as HTMLElement).style.color = '#888' }}
            >Se connecter</button>
          </a>
          <a href="/auth/signup">
            <button style={{
              padding: '8px 18px', borderRadius: 8, background: '#C9A84C',
              border: 'none', color: '#0D0D12', fontSize: 13, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = '#d4b55a'; (e.target as HTMLElement).style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = '#C9A84C'; (e.target as HTMLElement).style.transform = 'translateY(0)' }}
            >Commencer</button>
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '120px 24px 80px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent)',
        }}/>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 18px', borderRadius: 20,
          background: '#1a1508', border: '0.5px solid #2a2010',
          fontSize: 11, color: '#C9A84C', letterSpacing: '0.1em', fontWeight: 800,
          marginBottom: 28,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C9A84C' }}/>
          ARTISANS CERTIFIÉS · RÉPONSE EN 30 MIN
        </div>

        <h1 style={{
          fontSize: 'clamp(3rem, 7vw, 5.5rem)', fontWeight: 800,
          lineHeight: 1.05, color: '#F0EDE8', marginBottom: 16,
        }}>
          L'artisan qu'il vous faut,<br/>
          <span style={{
            background: 'linear-gradient(135deg, #C9A84C 0%, #FFE8A3 50%, #C9A84C 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>maintenant.</span>
        </h1>

        <p style={{ fontSize: 17, color: '#555', maxWidth: 480, lineHeight: 1.7, margin: '0 auto 48px', fontWeight: 300 }}>
          Des professionnels vérifiés et certifiés BETI,<br/>proches de chez vous, disponibles immédiatement.
        </p>

        {/* Barre de recherche */}
        <div style={{ display: 'flex', gap: 10, maxWidth: 580, width: '100%', margin: '0 auto 40px' }}>
          <input
            type="text"
            placeholder="Plombier, électricien, ménage..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, padding: '16px 22px',
              background: '#161620', border: '0.5px solid #2a2a3a',
              borderRadius: 12, color: '#F0EDE8', fontSize: 15,
              outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300,
              transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.target as HTMLElement).style.borderColor = '#C9A84C44'}
            onBlur={e => (e.target as HTMLElement).style.borderColor = '#2a2a3a'}
          />
          <button style={{
            padding: '16px 28px', borderRadius: 12, background: '#C9A84C',
            border: 'none', color: '#0D0D12', fontSize: 15, fontWeight: 800,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}
            onMouseEnter={e => { (e.target as HTMLElement).style.background = '#d4b55a'; (e.target as HTMLElement).style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.background = '#C9A84C'; (e.target as HTMLElement).style.transform = 'translateY(0)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D0D12" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            Trouver un pro
          </button>
        </div>

        {/* Trust */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['Paiement sécurisé', 'Pros vérifiés', 'Garantie satisfaction', 'Support 24/7'].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#444', fontWeight: 300 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C9A84C' }}/>
              {t}
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <div ref={statsRef} style={{
        background: '#09090f',
        borderTop: '0.5px solid #1e1e2a', borderBottom: '0.5px solid #1e1e2a',
        padding: '56px 40px',
      }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
        }}>
          {[
            { value: counts.a.toLocaleString('fr-FR') + '+', label: 'Artisans certifiés' },
            { value: counts.b + '%',   label: 'Clients satisfaits' },
            { value: '< ' + counts.c + 'min', label: 'Temps de réponse' },
            { value: counts.d + '+',   label: 'Villes couvertes' },
          ].map((s, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '0 20px',
              borderRight: i < 3 ? '0.5px solid #1e1e2a' : 'none',
            }}>
              <div style={{ fontSize: 'clamp(2rem, 3vw, 3rem)', fontWeight: 800, color: '#C9A84C', lineHeight: 1, marginBottom: 10 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Catégories */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 40px 0' }}>
        <div style={{ marginBottom: 8, fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800 }}>NOS SERVICES</div>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: '#F0EDE8', marginBottom: 32, lineHeight: 1.2 }}>
          Tous vos besoins,<br/>un seul endroit.
        </h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 10,
                background: activeCategory === cat.id ? '#1a1508' : '#161620',
                border: `0.5px solid ${activeCategory === cat.id ? '#C9A84C' : '#2a2a3a'}`,
                color: activeCategory === cat.id ? '#C9A84C' : '#555',
                fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300,
                transition: 'all 0.2s', transform: activeCategory === cat.id ? 'scale(1.03)' : 'scale(1)',
              }}
            >
              <span style={{ fontSize: 15 }}>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Artisans */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 40px 80px' }}>
        <div style={{ marginBottom: 8, fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800 }}>ARTISANS BETI</div>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: '#F0EDE8', marginBottom: 32, lineHeight: 1.2 }}>
          Proches de vous,<br/>prêts à intervenir.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map((a, i) => <ArtisanCard key={a.id} artisan={a} index={i}/>)}
        </div>
      </section>

      {/* Comment ça marche */}
      <section style={{ background: '#09090f', borderTop: '0.5px solid #1e1e2a', padding: '80px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 8 }}>COMMENT ÇA MARCHE</div>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#F0EDE8', marginBottom: 48, lineHeight: 1.2 }}>Réservez en 3 étapes.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 48 }}>
            {[
              { n: '01', title: 'Choisissez votre service', desc: 'Sélectionnez le type d\'intervention parmi nos 8 catégories.' },
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
        <div style={{
          background: '#161620', border: '0.5px solid #2a2a3a',
          borderRadius: 24, padding: '64px 52px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 40, flexWrap: 'wrap', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)',
            fontSize: 180, fontWeight: 800, color: '#1a1a22',
            pointerEvents: 'none', userSelect: 'none', lineHeight: 1,
          }}>BETI</div>
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 12 }}>DEVENEZ PARTENAIRE</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#F0EDE8', marginBottom: 14, lineHeight: 1.2 }}>
              Vous êtes artisan ?<br/>Rejoignez BETI.
            </h2>
            <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, maxWidth: 420, fontWeight: 300 }}>
              Développez votre clientèle et bénéficiez de la certification BETI. Inscription gratuite.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, position: 'relative' }}>
            <a href="/auth/signup">
              <button style={{
                padding: '16px 32px', borderRadius: 12, background: '#C9A84C',
                border: 'none', color: '#0D0D12', fontSize: 15, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s',
              }}
                onMouseEnter={e => (e.target as HTMLElement).style.background = '#d4b55a'}
                onMouseLeave={e => (e.target as HTMLElement).style.background = '#C9A84C'}
              >Devenir partenaire</button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: '#09090f', borderTop: '0.5px solid #1e1e2a',
        padding: '40px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, background: '#C9A84C', borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#0D0D12',
          }}>B</div>
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
  )
}
