'use client'

import { supabase } from '@/lib/supabase'
import { useState, useRef, useEffect } from 'react'

// ================================================================
// BETI — Catégorie "Autre" avec système d'AJOUT de mots-clés
// Le client ajoute des tags dorés pour décrire le service cherché
// ================================================================

export const POPULAR_TAGS = [
  'piscine', 'climatisation', 'chauffe-eau solaire', 'VMC', 'pompe à chaleur',
  'domotique', 'panneau solaire', 'borne de recharge', 'vidéosurveillance', 'alarme',
  'carrelage', 'parquet', 'faux plafond', 'isolation', 'façade', 'enduit',
  'menuiserie', 'porte blindée', 'volets roulants', 'moustiquaire', 'pergola',
  'puits', 'forage', 'citerne', 'groupe électrogène', 'antenne TV',
  'débarras', 'nettoyage fin chantier', 'vitrier', 'tapissier', 'marbrier',
  'réparation téléphone', 'réseau wifi', 'installation TV', 'électroménager',
  'livreur', 'livraison', 'coursier', 'transport colis',
]

// ================================================================
// CÔTÉ CLIENT — Ajout de mots-clés
// ================================================================

export function OtherCategorySearch({
  onSearch,
}: {
  onSearch: (keyword: string) => void
}) {
  const [tags, setTags] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>(POPULAR_TAGS.slice(0, 8))
  const [showSuggestions, setShowSuggestions] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadPopularTags()
    const handleClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const loadPopularTags = async () => {
    try {
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
      }
    } catch {}
  }

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase()
    if (!t || tags.includes(t) || tags.length >= 8) return
    const next = [...tags, t]
    setTags(next)
    setInput('')
    onSearch(next.join(' '))
  }

  const removeTag = (tag: string) => {
    const next = tags.filter(t => t !== tag)
    setTags(next)
    onSearch(next.join(' '))
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

  const handleInput = (val: string) => {
    setInput(val)
    if (val.length >= 2) {
      const norm = val.toLowerCase()
      setSuggestions(POPULAR_TAGS.filter(t => t.toLowerCase().includes(norm) && !tags.includes(t)).slice(0, 6))
    } else {
      setSuggestions(POPULAR_TAGS.filter(t => !tags.includes(t)).slice(0, 8))
    }
    setShowSuggestions(true)
  }

  const filteredSuggestions = suggestions.filter(s => !tags.includes(s))

  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      {/* Zone de saisie avec tags dorés */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          minHeight: 48, padding: '8px 12px',
          background: '#13131e', border: '0.5px solid #6366f133',
          borderRadius: 12, cursor: 'text', display: 'flex',
          flexWrap: 'wrap', gap: 6, alignItems: 'center',
        }}
      >
        {tags.map(tag => (
          <div key={tag} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 20,
            background: '#6366f10d', border: '0.5px solid #6366f1',
            fontSize: 12, color: '#6366f1', fontFamily: 'Nexa, sans-serif', fontWeight: 800,
            animation: 'fadeIn 0.2s ease',
          }}>
            {tag}
            <button
              onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
              style={{ background: 'transparent', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1, opacity: 0.7 }}
            >✕</button>
          </div>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? 'Décrivez le service (ex: livreur, piscine, climatisation...)' : '+ Ajouter...'}
          style={{
            flex: 1, minWidth: 140, background: 'transparent',
            border: 'none', outline: 'none', color: '#e0dfe5',
            fontSize: 13, fontFamily: 'Nexa, sans-serif', fontWeight: 300, padding: '4px',
          }}
        />
        {input.trim() && (
          <button
            onClick={() => addTag(input)}
            style={{
              padding: '5px 16px', borderRadius: 20,
              background: '#6366f1', border: 'none',
              color: '#0b0b12', fontSize: 12, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'Nexa, sans-serif', flexShrink: 0,
            }}
          >
            + Ajouter
          </button>
        )}
      </div>

      {/* Compteur */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: '#444', fontWeight: 300 }}>
            {tags.length}/8 mots-clés · Entrée pour ajouter
          </span>
          <button
            onClick={() => { setTags([]); onSearch('') }}
            style={{ fontSize: 11, color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}
          >
            Tout effacer
          </button>
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, color: '#555', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 8 }}>
            {input.length >= 2 ? 'SUGGESTIONS' : 'POPULAIRE EN CE MOMENT'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {filteredSuggestions.map(s => (
              <button
                key={s}
                onClick={() => addTag(s)}
                style={{
                  padding: '5px 14px', borderRadius: 20,
                  background: 'transparent', border: '0.5px solid #1c1c30',
                  color: '#555', fontSize: 12, cursor: 'pointer',
                  fontFamily: 'Nexa, sans-serif', fontWeight: 300,
                  transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1c1c30'; e.currentTarget.style.color = '#555' }}
              >
                <span style={{ fontSize: 11 }}>+</span> {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


// ================================================================
// CÔTÉ ARTISAN — Saisie des mots-clés
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
          <br/>Ex: <span style={{ color: '#6366f1' }}>piscine, climatisation, livreur, livraison...</span>
        </p>
      </div>

      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          minHeight: 52, padding: '8px 12px',
          background: '#0b0b12', border: '0.5px solid #1c1c30',
          borderRadius: 12, cursor: 'text', display: 'flex',
          flexWrap: 'wrap', gap: 6, alignItems: 'center',
        }}
      >
        {tags.map(tag => (
          <div key={tag} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 20,
            background: '#6366f10d', border: '0.5px solid #6366f144',
            fontSize: 12, color: '#6366f1', fontFamily: 'Nexa, sans-serif', fontWeight: 300,
          }}>
            {tag}
            <button
              onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
              style={{ background: 'transparent', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1, opacity: 0.7 }}
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
            border: 'none', outline: 'none', color: '#e0dfe5',
            fontSize: 13, fontFamily: 'Nexa, sans-serif', fontWeight: 300, padding: '2px 4px',
          }}
        />
        {input.trim() && (
          <button
            onClick={() => addTag(input)}
            style={{
              padding: '4px 14px', borderRadius: 20,
              background: '#6366f1', border: 'none',
              color: '#0b0b12', fontSize: 11, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'Nexa, sans-serif', flexShrink: 0,
            }}
          >
            + Ajouter
          </button>
        )}
      </div>

      {error && <p style={{ fontSize: 12, color: '#f87171', marginTop: 6, fontWeight: 300 }}>{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: '#444', fontWeight: 300 }}>{tags.length}/15 mots-clés</p>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: 2, background: i < tags.length ? '#6366f1' : '#1c1c30', transition: 'background 0.2s' }}/>
          ))}
        </div>
      </div>

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
                  background: 'transparent', border: '0.5px solid #1c1c30',
                  color: '#555', fontSize: 12, cursor: 'pointer',
                  fontFamily: 'Nexa, sans-serif', fontWeight: 300, transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1c1c30'; e.currentTarget.style.color = '#555' }}
              >
                + {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || tags.length === 0}
        style={{
          width: '100%', padding: '12px',
          background: saved ? '#0a2010' : tags.length === 0 ? '#1a1a2a' : '#6366f1',
          border: saved ? '0.5px solid #4ade8044' : 'none',
          borderRadius: 10,
          color: saved ? '#4ade80' : tags.length === 0 ? '#444' : '#0b0b12',
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
