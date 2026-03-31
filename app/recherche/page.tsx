'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AlgeriaCitySearch, ALGERIA_CITIES } from '@/components/AlgeriaSearch'

const CATEGORIES = [
  { id: '',             icon: '✳',  label: 'Tous',          color: '#888' },
  { id: 'plomberie',    icon: '⚙',  label: 'Plomberie',     color: '#3b82f6' },
  { id: 'electricite',  icon: '⚡',  label: 'Électricité',   color: '#f59e0b' },
  { id: 'menage',       icon: '✦',  label: 'Ménage',        color: '#10b981' },
  { id: 'demenagement', icon: '◈',  label: 'Déménagement',  color: '#8b5cf6' },
  { id: 'jardinage',    icon: '❧',  label: 'Jardinage',     color: '#22c55e' },
  { id: 'peinture',     icon: '◉',  label: 'Peinture',      color: '#ef4444' },
  { id: 'serrurerie',   icon: '⌘',  label: 'Serrurerie',    color: '#f97316' },
  { id: 'informatique', icon: '⬡',  label: 'Informatique',  color: '#6366f1' },
  { id: 'coiffure',     icon: '✂',  label: 'Coiffure',      color: '#ec4899' },
]

type Artisan = {
  artisan_id: string; full_name: string; avatar_url: string | null
  category: string; rating_avg: number; rating_count: number
  hourly_rate: number; distance_km: number; is_available: boolean
  total_missions: number; bio: string | null
}

function Stars({ rating, size = 11 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(rating) ? '#C9A84C' : '#2a2a3a'}>
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      ))}
    </div>
  )
}

export default function RecherchePage() {
  const [artisans, setArtisans] = useState<Artisan[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // Filtres
  const [category, setCategory] = useState('')
  const [userLocation, setUserLocation] = useState({ lat: 36.7538, lng: 3.0588 })
  const [radius, setRadius] = useState(50)
  const [minRating, setMinRating] = useState(0)
  const [maxPrice, setMaxPrice] = useState(15000)
  const [availableOnly, setAvailableOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'price_asc' | 'price_desc'>('distance')

  // Système mots-clés
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])

  const addKeyword = () => {
    const kw = keywordInput.trim()
    if (kw && !keywords.includes(kw)) {
      setKeywords(prev => [...prev, kw])
    }
    setKeywordInput('')
  }

  const removeKeyword = (kw: string) => {
    setKeywords(prev => prev.filter(k => k !== kw))
  }

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      )
    }
  }, [])

  const search = async () => {
    setLoading(true)
    setSearched(true)
    try {
      const { data } = await supabase.rpc('get_nearby_artisans', {
        lat: userLocation.lat, lng: userLocation.lng, radius_km: radius,
        category_filter: category || null,
      })
      let results = (data || []) as Artisan[]
      if (minRating > 0) results = results.filter(a => (a.rating_avg || 0) >= minRating)
      if (maxPrice < 15000) results = results.filter(a => (a.hourly_rate || 0) <= maxPrice)
      if (availableOnly) results = results.filter(a => a.is_available)
      // Filtre mots-clés — chaque mot-clé doit matcher nom ou catégorie
      if (keywords.length > 0) {
        results = results.filter(a =>
          keywords.some(kw =>
            a.full_name?.toLowerCase().includes(kw.toLowerCase()) ||
            a.category?.toLowerCase().includes(kw.toLowerCase()) ||
            a.bio?.toLowerCase().includes(kw.toLowerCase())
          )
        )
      }
      results.sort((a, b) => {
        if (sortBy === 'rating') return (b.rating_avg || 0) - (a.rating_avg || 0)
        if (sortBy === 'price_asc') return (a.hourly_rate || 0) - (b.hourly_rate || 0)
        if (sortBy === 'price_desc') return (b.hourly_rate || 0) - (a.hourly_rate || 0)
        return (a.distance_km || 0) - (b.distance_km || 0)
      })
      setArtisans(results)
    } catch {
      setArtisans([])
    }
    setLoading(false)
  }

  const catColor = CATEGORIES.find(c => c.id === category)?.color || '#888'

  return (
    <>
      <style suppressHydrationWarning>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0D0D12;font-family:Nexa,sans-serif}
      `}</style>
      <div style={{ minHeight: '100vh', background: '#0D0D12', fontFamily: 'Nexa, sans-serif', paddingTop: 84 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px 80px', display: 'grid', gridTemplateColumns: '300px 1fr', gap: 32, alignItems: 'start' }}>

          {/* ── SIDEBAR FILTRES ── */}
          <div style={{ position: 'sticky', top: 84 }}>
            <div style={{ fontSize: 10, color: '#C9A84C', fontWeight: 800, letterSpacing: '.12em', marginBottom: 8 }}>RECHERCHE</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F0EDE8', marginBottom: 24, lineHeight: 1.2 }}>Trouvez votre<br/>artisan idéal.</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Mots-clés */}
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>MOTS-CLÉS</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="Ex: hafaf, soudure..."
                    value={keywordInput}
                    onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addKeyword()}
                    style={{ flex: 1, padding: '10px 12px', background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 9, color: '#F0EDE8', fontSize: 13, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}
                  />
                  <button
                    onClick={addKeyword}
                    disabled={!keywordInput.trim()}
                    style={{ padding: '10px 14px', background: keywordInput.trim() ? '#C9A84C' : '#1a1a2a', border: 'none', borderRadius: 9, color: keywordInput.trim() ? '#0D0D12' : '#444', fontSize: 12, fontWeight: 800, cursor: keywordInput.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Nexa, sans-serif', whiteSpace: 'nowrap' }}
                  >+ Ajouter</button>
                </div>
                {/* Tags ajoutés */}
                {keywords.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {keywords.map(kw => (
                      <div key={kw} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#1a1508', border: '0.5px solid #C9A84C44', borderRadius: 20 }}>
                        <span style={{ fontSize: 12, color: '#C9A84C', fontWeight: 300 }}>{kw}</span>
                        <button onClick={() => removeKeyword(kw)} style={{ background: 'transparent', border: 'none', color: '#C9A84C', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                      </div>
                    ))}
                    <button onClick={() => setKeywords([])} style={{ padding: '4px 10px', background: 'transparent', border: '0.5px solid #2a1010', borderRadius: 20, color: '#f87171', fontSize: 11, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>Tout effacer</button>
                  </div>
                )}
                {keywords.length === 0 && (
                  <div style={{ fontSize: 11, color: '#444', fontWeight: 300 }}>Tapez un mot et cliquez <strong style={{ color: '#C9A84C' }}>+ Ajouter</strong></div>
                )}
              </div>

              {/* Ville */}
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>VILLE</label>
                <AlgeriaCitySearch
                  defaultCity={ALGERIA_CITIES.find(c => c.id === 'alger-centre')}
                  onSelect={city => setUserLocation({ lat: city.lat, lng: city.lng })}
                  placeholder="Votre ville..."
                />
              </div>

              {/* Catégorie */}
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>CATÉGORIE</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setCategory(cat.id)}
                      style={{ padding: '9px 14px', borderRadius: 9, border: `0.5px solid ${category === cat.id ? cat.color : '#2a2a3a'}`, background: category === cat.id ? cat.color + '12' : 'transparent', color: category === cat.id ? cat.color : '#666', fontSize: 13, fontWeight: category === cat.id ? 800 : 300, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
                    >
                      <span>{cat.icon}</span>{cat.label}
                      {category === cat.id && <span style={{ marginLeft: 'auto' }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rayon */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em' }}>RAYON</label>
                  <span style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800 }}>{radius} km</span>
                </div>
                <input type="range" min={5} max={100} step={5} value={radius} onChange={e => setRadius(Number(e.target.value))} style={{ width: '100%', accentColor: '#C9A84C', cursor: 'pointer' }}/>
              </div>

              {/* Note minimum */}
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>NOTE MINIMUM</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[0, 3, 4, 4.5].map(r => (
                    <button key={r} onClick={() => setMinRating(r)}
                      style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: `0.5px solid ${minRating === r ? '#C9A84C' : '#2a2a3a'}`, background: minRating === r ? '#1a1508' : '#161620', color: minRating === r ? '#C9A84C' : '#555', fontSize: 11, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: minRating === r ? 800 : 300 }}
                    >{r === 0 ? 'Tous' : `${r}+⭐`}</button>
                  ))}
                </div>
              </div>

              {/* Prix max */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em' }}>PRIX MAX</label>
                  <span style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800 }}>{maxPrice === 15000 ? 'Illimité' : `${maxPrice.toLocaleString('fr-DZ')} DA/h`}</span>
                </div>
                <input type="range" min={500} max={15000} step={500} value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} style={{ width: '100%', accentColor: '#C9A84C', cursor: 'pointer' }}/>
              </div>

              {/* Disponible maintenant */}
              <div onClick={() => setAvailableOnly(!availableOnly)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, border: `0.5px solid ${availableOnly ? '#4ade80' : '#2a2a3a'}`, background: availableOnly ? '#0a2010' : '#161620', cursor: 'pointer', transition: 'all 0.15s' }}
              >
                <div style={{ width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${availableOnly ? '#4ade80' : '#444'}`, background: availableOnly ? '#4ade80' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                  {availableOnly && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0D0D12" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                </div>
                <span style={{ fontSize: 13, color: availableOnly ? '#4ade80' : '#666', fontWeight: availableOnly ? 800 : 300 }}>Disponible maintenant</span>
              </div>

              {/* Bouton rechercher */}
              <button onClick={search} disabled={loading}
                style={{ width: '100%', padding: '14px', background: '#C9A84C', border: 'none', borderRadius: 12, color: '#0D0D12', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#d4b55a'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#C9A84C'}
              >
                {loading ? 'Recherche...' : '🔍 Rechercher'}
              </button>
            </div>
          </div>

          {/* ── RÉSULTATS ── */}
          <div>
            {searched && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ fontSize: 14, color: '#888', fontWeight: 300 }}>
                  {loading ? 'Recherche en cours...' : <><strong style={{ color: '#F0EDE8', fontWeight: 800 }}>{artisans.length}</strong> artisan{artisans.length !== 1 ? 's' : ''} trouvé{artisans.length !== 1 ? 's' : ''}</>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { id: 'distance',   label: '📍 Distance' },
                    { id: 'rating',     label: '⭐ Mieux notés' },
                    { id: 'price_asc',  label: '↑ Prix' },
                    { id: 'price_desc', label: '↓ Prix' },
                  ].map(s => (
                    <button key={s.id} onClick={() => setSortBy(s.id as any)}
                      style={{ padding: '6px 12px', borderRadius: 8, border: `0.5px solid ${sortBy === s.id ? '#C9A84C' : '#2a2a3a'}`, background: sortBy === s.id ? '#1a1508' : '#161620', color: sortBy === s.id ? '#C9A84C' : '#666', fontSize: 11, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: sortBy === s.id ? 800 : 300 }}
                    >{s.label}</button>
                  ))}
                </div>
              </div>
            )}

            {!searched && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#555', marginBottom: 8 }}>Lancez une recherche</div>
                <div style={{ fontSize: 13, color: '#444', fontWeight: 300 }}>Utilisez les filtres à gauche pour trouver votre artisan</div>
              </div>
            )}

            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '20px', display: 'flex', gap: 16 }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#2a2a3a', animation: 'pulse 1.5s infinite', flexShrink: 0 }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 14, background: '#2a2a3a', borderRadius: 4, marginBottom: 8, width: '40%', animation: 'pulse 1.5s infinite' }}/>
                      <div style={{ height: 10, background: '#2a2a3a', borderRadius: 4, width: '60%', animation: 'pulse 1.5s infinite' }}/>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searched && !loading && artisans.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#555', marginBottom: 8 }}>Aucun artisan trouvé</div>
                <div style={{ fontSize: 13, color: '#444', fontWeight: 300 }}>Essayez d'élargir votre rayon ou de changer les filtres</div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {artisans.map((a, idx) => {
                const col = CATEGORIES.find(c => a.category?.toLowerCase().includes(c.id.slice(0, 5)))?.color || '#C9A84C'
                const initials = a.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'A'
                return (
                  <div key={a.artisan_id}
                    style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '20px', display: 'flex', gap: 16, alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s', animation: `fadeIn 0.3s ease ${idx * 0.05}s both` }}
                    onClick={() => window.location.href = `/artisan/${a.artisan_id}`}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = col + '55'; (e.currentTarget as HTMLElement).style.background = '#1c1c28' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2a3a'; (e.currentTarget as HTMLElement).style.background = '#161620' }}
                  >
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: col + '22', border: `2px solid ${col}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: col, flexShrink: 0 }}>
                      {a.avatar_url ? <img src={a.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}/> : initials}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8' }}>{a.full_name}</span>
                        <span style={{ fontSize: 9, background: '#1a1508', border: '0.5px solid #2a2010', color: '#C9A84C', padding: '2px 7px', borderRadius: 20, fontWeight: 800 }}>CERTIFIÉ</span>
                      </div>
                      <div style={{ fontSize: 10, color: col, letterSpacing: '.06em', fontWeight: 800, marginBottom: 6 }}>{a.category?.toUpperCase()}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <Stars rating={a.rating_avg || 0}/>
                        <span style={{ fontSize: 11, color: '#555' }}>{a.rating_avg ? a.rating_avg.toFixed(1) : 'Nouveau'} ({a.rating_count || 0})</span>
                        <span style={{ color: '#2a2a3a' }}>·</span>
                        <span style={{ fontSize: 11, color: '#555' }}>{a.distance_km?.toFixed(1)} km</span>
                        <span style={{ color: '#2a2a3a' }}>·</span>
                        <span style={{ fontSize: 11, color: '#555' }}>{a.total_missions || 0} missions</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#C9A84C', marginBottom: 6 }}>{(a.hourly_rate || 0).toLocaleString('fr-DZ')} <span style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>DA/h</span></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.is_available ? '#4ade80' : '#555', boxShadow: a.is_available ? '0 0 6px #4ade80' : 'none' }}/>
                        <span style={{ fontSize: 11, color: a.is_available ? '#4ade80' : '#555', fontWeight: 300 }}>{a.is_available ? 'Disponible' : 'Occupé'}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
git 