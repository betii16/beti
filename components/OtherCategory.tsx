'use client'

// ================================================================
// BETI — Catégorie "Autre" avec mots-clés libres
// 2 composants :
// 1. OtherCategorySearch — côté client (recherche libre)
// 2. ArtisanTagsInput — côté artisan (saisie mots-clés)
// ================================================================

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Suggestions populaires pour inspirer l'artisan ────────────────

export const POPULAR_TAGS = [
  // Plomberie avancée
  'piscine', 'climatisation', 'chauffe-eau solaire', 'VMC', 'pompe à chaleur',
  // Électricité avancée
  'domotique', 'panneau solaire', 'borne de recharge', 'vidéosurveillance', 'alarme',
  // Bâtiment
  'carrelage', 'parquet', 'faux plafond', 'isolation', 'façade', 'enduit',
  // Menuiserie
  'menuiserie', 'porte blindée', 'volets roulants', 'moustiquaire', 'pergola',
  // Spécial
  'puits', 'forage', 'citerne', 'groupe électrogène', 'antenne TV',
  // Services
  'débarras', 'nettoyage fin chantier', 'vitrier', 'tapissier', 'marbrier',
  // Tech
  'réparation téléphone', 'réseau wifi', 'installation TV', 'électroménager',
]

// ================================================================
// 1. CÔTÉ CLIENT — Recherche dans "Autre"
// ================================================================

export function OtherCategorySearch({
  onSearch,
}: {
  onSearch: (keyword: string) => void
}) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Charger les mots-clés populaires depuis Supabase
    loadPopularTags()
    const handleClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const loadPopularTags = async () => {
    // Récupérer les tags les plus utilisés par les artisans
    const { data } = await supabase
      .from('artisans')
      .select('tags')
      .not('tags', 'is', null)
      .limit(100)

    if (data) {
      const allTags = data.flatMap((a: any) => a.tags || [])
      const freq: Record<string, number> = {}
      allTags.forEach((t: string) => { freq[t] = (freq[t] || 0) + 1 })
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([t]) => t)
      if (sorted.length > 0) setSuggestions(sorted)
      else setSuggestions(POPULAR_TAGS.slice(0, 12))
    } else {
      setSuggestions(POPULAR_TAGS.slice(0, 12))
    }
  }

  const handleInput = (val: string) => {
    setQuery(val)
    if (val.length >= 2) {
      const norm = val.toLowerCase()
      const filtered = POPULAR_TAGS.filter(t => t.toLowerCase().includes(norm)).slice(0, 6)
      setSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      loadPopularTags()
      setShowSuggestions(val.length === 0)
    }
  }

  const handleSearch = (keyword: string) => {
    const k = keyword.trim()
    if (!k) return
    setQuery(k)
    setShowSuggestions(false)
    setRecentSearches(prev => [k, ...prev.filter(r => r !== k)].slice(0, 5))
    onSearch(k)
  }

  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      {/* Barre de recherche */}
      <div style={{ position: 'relative', display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>🔍</div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleInput(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(query) }}
            placeholder="Que cherchez-vous ? (piscine, domotique, parquet...)"
            style={{
              width: '100%', padding: '12px 18px 12px 42px',
              background: '#161620', border: '0.5px solid #C9A84C44',
              borderRadius: 12, color: '#F0EDE8', fontSize: 14,
              outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300,
            }}
          />
        </div>
        <button
          onClick={() => handleSearch(query)}
          style={{
            padding: '12px 20px', borderRadius: 12, background: '#C9A84C',
            border: 'none', color: '#0D0D12', fontSize: 13, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'Nexa, sans-serif', whiteSpace: 'nowrap',
          }}
        >
          Rechercher
        </button>
      </div>

      {/* Dropdown suggestions */}
      {showSuggestions && (
        <div style={{
          marginTop: 6, background: '#161620', border: '0.5px solid #2a2a3a',
          borderRadius: 12, overflow: 'hidden', zIndex: 500, position: 'relative',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {recentSearches.length > 0 && (
            <div style={{ padding: '10px 16px 6px' }}>
              <div style={{ fontSize: 10, color: '#555', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 8 }}>RECHERCHES RÉCENTES</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {recentSearches.map(r => (
                  <button key={r} onClick={() => handleSearch(r)} style={{ padding: '4px 12px', borderRadius: 20, background: '#0D0D12', border: '0.5px solid #2a2a3a', color: '#888', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>
                    🕐 {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: '10px 16px', borderTop: recentSearches.length > 0 ? '0.5px solid #1e1e2a' : 'none' }}>
            <div style={{ fontSize: 10, color: '#555', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 8 }}>
              {query.length >= 2 ? 'SUGGESTIONS' : 'POPULAIRE EN CE MOMENT'}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => handleSearch(s)}
                  style={{
                    padding: '5px 14px', borderRadius: 20,
                    background: '#1a1508', border: '0.5px solid #2a2010',
                    color: '#C9A84C', fontSize: 12, cursor: 'pointer',
                    fontFamily: 'Nexa, sans-serif', fontWeight: 300,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.background = '#241e08'; (e.target as HTMLElement).style.borderColor = '#C9A84C' }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background = '#1a1508'; (e.target as HTMLElement).style.borderColor = '#2a2010' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ================================================================
// 2. CÔTÉ ARTISAN — Saisie des mots-clés
// À intégrer dans la page d'inscription/profil artisan
// ================================================================

export function ArtisanTagsInput({
  artisanId,
  initialTags = [],
  onSave,
}: {
  artisanId: string
  initialTags?: string[]
  onSave?: (tags: string[]) => void
}) {
  const [tags, setTags] = useState<string[]>(initialTags)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase()
    if (!t) return
    if (tags.includes(t)) { setError('Ce mot-clé existe déjà'); return }
    if (tags.length >= 15) { setError('Maximum 15 mots-clés'); return }
    if (t.length > 30) { setError('Mot-clé trop long (max 30 caractères)'); return }
    setTags(prev => [...prev, t])
    setInput('')
    setError('')
    setSaved(false)
  }

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag))
    setSaved(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('artisans')
      .update({ tags })
      .eq('id', artisanId)
    setSaving(false)
    if (!error) {
      setSaved(true)
      onSave?.(tags)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 6 }}>
          VOS SPÉCIALITÉS / MOTS-CLÉS
        </div>
        <p style={{ fontSize: 12, color: '#555', fontWeight: 300, lineHeight: 1.6, marginBottom: 14 }}>
          Ajoutez des mots-clés décrivant vos spécialités. Les clients pourront vous trouver en les cherchant.
          <br/>Ex: <span style={{ color: '#C9A84C' }}>piscine, climatisation, parquet, domotique...</span>
        </p>
      </div>

      {/* Zone de saisie avec tags */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          minHeight: 52, padding: '8px 12px',
          background: '#0D0D12', border: '0.5px solid #2a2a3a',
          borderRadius: 12, cursor: 'text', display: 'flex',
          flexWrap: 'wrap', gap: 6, alignItems: 'center',
          transition: 'border-color 0.2s',
        }}
      >
        {tags.map(tag => (
          <div key={tag} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 20,
            background: '#1a1508', border: '0.5px solid #C9A84C44',
            fontSize: 12, color: '#C9A84C', fontFamily: 'Nexa, sans-serif', fontWeight: 300,
          }}>
            {tag}
            <button
              onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
              style={{ background: 'transparent', border: 'none', color: '#C9A84C', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1, opacity: 0.7 }}
            >✕</button>
          </div>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={e => { setInput(e.target.value); setError('') }}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? 'Tapez un mot-clé et appuyez sur Entrée...' : '+ Ajouter...'}
          style={{
            flex: 1, minWidth: 120, background: 'transparent',
            border: 'none', outline: 'none', color: '#F0EDE8',
            fontSize: 13, fontFamily: 'Nexa, sans-serif', fontWeight: 300,
            padding: '2px 4px',
          }}
        />
      </div>

      {/* Erreur */}
      {error && <p style={{ fontSize: 12, color: '#f87171', marginTop: 6, fontWeight: 300 }}>{error}</p>}

      {/* Compteur */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: '#444', fontWeight: 300 }}>
          {tags.length}/15 mots-clés · Appuyez sur Entrée ou virgule pour ajouter
        </p>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: 2, background: i < tags.length ? '#C9A84C' : '#2a2a3a', transition: 'background 0.2s' }}/>
          ))}
        </div>
      </div>

      {/* Suggestions rapides */}
      {tags.length < 15 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#555', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 8 }}>SUGGESTIONS RAPIDES</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {POPULAR_TAGS.filter(t => !tags.includes(t)).slice(0, 10).map(t => (
              <button
                key={t}
                onClick={() => addTag(t)}
                style={{
                  padding: '4px 12px', borderRadius: 20,
                  background: 'transparent', border: '0.5px solid #2a2a3a',
                  color: '#555', fontSize: 12, cursor: 'pointer',
                  fontFamily: 'Nexa, sans-serif', fontWeight: 300, transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#C9A84C'; (e.target as HTMLElement).style.color = '#C9A84C' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#2a2a3a'; (e.target as HTMLElement).style.color = '#555' }}
              >
                + {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bouton sauvegarder */}
      <button
        onClick={handleSave}
        disabled={saving || tags.length === 0}
        style={{
          width: '100%', padding: '12px',
          background: saved ? '#0a2010' : tags.length === 0 ? '#1a1a2a' : '#C9A84C',
          border: saved ? '0.5px solid #4ade8044' : 'none',
          borderRadius: 10,
          color: saved ? '#4ade80' : tags.length === 0 ? '#444' : '#0D0D12',
          fontSize: 13, fontWeight: 800,
          cursor: tags.length === 0 ? 'not-allowed' : 'pointer',
          fontFamily: 'Nexa, sans-serif', transition: 'all 0.3s',
        }}
      >
        {saving ? 'Sauvegarde...' : saved ? '✅ Mots-clés sauvegardés !' : 'Sauvegarder mes mots-clés'}
      </button>
    </div>
  )
}
