'use client'

// components/PhotoUpload.tsx
// Système de photos complet BETI

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
// ================================================================
// 1. UPLOAD PHOTO DE PROFIL
// ================================================================

export function AvatarUpload({
  userId,
  currentUrl,
  initials,
  onUpload,
}: {
  userId: string
  currentUrl: string | null
  initials: string
  onUpload: (url: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Vérifications
    if (file.size > 5 * 1024 * 1024) { alert('Photo trop lourde (max 5MB)'); return }
    if (!file.type.startsWith('image/')) { alert('Fichier invalide'); return }

    setLoading(true)

    // Preview immédiat
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    // Upload Supabase Storage
    const ext = file.name.split('.').pop()
    const path = `avatars/${userId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) { alert('Erreur upload'); setLoading(false); return }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = data.publicUrl + '?t=' + Date.now()

    // Mettre à jour le profil
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)

    onUpload(url)
    setLoading(false)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Avatar */}
      <div style={{
        width: 88, height: 88, borderRadius: '50%',
        background: preview ? 'transparent' : '#C9A84C22',
        border: '2px solid #C9A84C',
        overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, fontWeight: 800, color: '#C9A84C',
        cursor: 'pointer', position: 'relative',
      }} onClick={() => inputRef.current?.click()}>
        {preview
          ? <img src={preview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          : initials
        }
        {/* Overlay hover */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity 0.2s',
          fontSize: 20,
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
        >
          {loading ? '⏳' : '📷'}
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }}/>

      {/* Badge modifier */}
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 26, height: 26, borderRadius: '50%',
          background: '#C9A84C', border: '2px solid #0D0D12',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 12,
        }}
      >
        ✏️
      </div>
    </div>
  )
}

// ================================================================
// 2. UPLOAD PHOTOS DU PROBLÈME (réservation)
// ================================================================

export function ProblemPhotosUpload({
  bookingId,
  onUpload,
}: {
  bookingId: string
  onUpload: (urls: string[]) => void
}) {
  const [photos, setPhotos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + photos.length > 5) { alert('Maximum 5 photos'); return }

    setLoading(true)
    const newUrls: string[] = []

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { alert(`${file.name} trop lourd (max 10MB)`); continue }

      const ext = file.name.split('.').pop()
      const path = `intervention-photos/${bookingId}/${Date.now()}.${ext}`

      const { error } = await supabase.storage
        .from('intervention-photos')
        .upload(path, file)

      if (!error) {
        const { data } = supabase.storage.from('intervention-photos').getPublicUrl(path)
        newUrls.push(data.publicUrl)
      }
    }

    const allUrls = [...photos, ...newUrls]
    setPhotos(allUrls)
    onUpload(allUrls)
    setLoading(false)
  }

  const removePhoto = (url: string) => {
    const updated = photos.filter(p => p !== url)
    setPhotos(updated)
    onUpload(updated)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {/* Photos existantes */}
        {photos.map(url => (
          <div key={url} style={{ position: 'relative', width: 80, height: 80 }}>
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '0.5px solid #2a2a3a' }}/>
            <button
              onClick={() => removePhoto(url)}
              style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#f87171', border: 'none', color: 'white', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >✕</button>
          </div>
        ))}

        {/* Bouton ajouter */}
        {photos.length < 5 && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            style={{
              width: 80, height: 80, borderRadius: 8,
              background: '#0D0D12', border: '0.5px dashed #2a2a3a',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#555', fontSize: 11, gap: 4, fontFamily: 'Nexa, sans-serif', fontWeight: 300,
            }}
          >
            <span style={{ fontSize: 20 }}>{loading ? '⏳' : '+'}</span>
            Photo
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }}/>

      <p style={{ fontSize: 11, color: '#444', fontWeight: 300 }}>
        {photos.length}/5 photos · Max 10MB par photo
      </p>
    </div>
  )
}

// ================================================================
// 3. PORTFOLIO ARTISAN
// ================================================================

export function PortfolioUpload({
  artisanId,
  existingPhotos,
}: {
  artisanId: string
  existingPhotos: string[]
}) {
  const [photos, setPhotos] = useState<string[]>(existingPhotos)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + photos.length > 12) { alert('Maximum 12 photos'); return }

    setLoading(true)
    const newUrls: string[] = []

    for (const file of files) {
      const path = `portfolio/${artisanId}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('portfolio').upload(path, file)
      if (!error) {
        const { data } = supabase.storage.from('portfolio').getPublicUrl(path)
        newUrls.push(data.publicUrl)
      }
    }

    const all = [...photos, ...newUrls]
    setPhotos(all)

    // Sauvegarder dans la BDD (colonne portfolio_urls)
    await supabase.from('artisans').update({ subcategories: all }).eq('id', artisanId)

    setLoading(false)
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 12 }}>
        {photos.map((url, i) => (
          <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '0.5px solid #2a2a3a' }}>
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            <button
              onClick={async () => {
                const updated = photos.filter(p => p !== url)
                setPhotos(updated)
                await supabase.from('artisans').update({ subcategories: updated }).eq('id', artisanId)
              }}
              style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 10 }}
            >✕</button>
          </div>
        ))}

        {photos.length < 12 && (
          <button
            onClick={() => inputRef.current?.click()}
            style={{
              aspectRatio: '1', borderRadius: 10,
              background: '#0D0D12', border: '0.5px dashed #2a2a3a',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#555', gap: 6, fontFamily: 'Nexa, sans-serif', fontWeight: 300, fontSize: 12,
            }}
          >
            <span style={{ fontSize: 24 }}>{loading ? '⏳' : '+'}</span>
            Ajouter
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }}/>
      <p style={{ fontSize: 11, color: '#444', fontWeight: 300 }}>{photos.length}/12 photos de portfolio</p>
    </div>
  )
}

// ================================================================
// 4. PHOTOS AVANT / APRÈS INTERVENTION
// ================================================================

export function BeforeAfterUpload({
  bookingId,
  artisanId,
}: {
  bookingId: string
  artisanId: string
}) {
  const [before, setBefore] = useState<string | null>(null)
  const [after, setAfter] = useState<string | null>(null)
  const [loading, setLoading] = useState<'before' | 'after' | null>(null)
  const beforeRef = useRef<HTMLInputElement>(null)
  const afterRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File, type: 'before' | 'after') => {
    setLoading(type)
    const path = `intervention-photos/${bookingId}/${type}_${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('intervention-photos').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('intervention-photos').getPublicUrl(path)
      if (type === 'before') setBefore(data.publicUrl)
      else setAfter(data.publicUrl)
    }
    setLoading(null)
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Avant */}
        <div>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 10 }}>AVANT</div>
          <div
            onClick={() => beforeRef.current?.click()}
            style={{
              aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden',
              background: '#0D0D12', border: `0.5px dashed ${before ? '#2a2a3a' : '#f97316'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative',
            }}
          >
            {before
              ? <img src={before} alt="Avant" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              : <>
                <span style={{ fontSize: 32, marginBottom: 8 }}>{loading === 'before' ? '⏳' : '📷'}</span>
                <span style={{ fontSize: 12, color: '#f97316', fontWeight: 300 }}>Photo avant</span>
              </>
            }
          </div>
          <input ref={beforeRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, 'before') }}
          />
        </div>

        {/* Après */}
        <div>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 10 }}>APRÈS</div>
          <div
            onClick={() => afterRef.current?.click()}
            style={{
              aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden',
              background: '#0D0D12', border: `0.5px dashed ${after ? '#2a2a3a' : '#4ade80'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative',
            }}
          >
            {after
              ? <img src={after} alt="Après" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              : <>
                <span style={{ fontSize: 32, marginBottom: 8 }}>{loading === 'after' ? '⏳' : '📷'}</span>
                <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 300 }}>Photo après</span>
              </>
            }
          </div>
          <input ref={afterRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, 'after') }}
          />
        </div>
      </div>

      {before && after && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#0a2010', border: '0.5px solid #4ade8044', borderRadius: 8 }}>
          <p style={{ fontSize: 12, color: '#4ade80', fontWeight: 300 }}>✅ Photos avant/après enregistrées !</p>
        </div>
      )}
    </div>
  )
}


