'use client'

// components/ReviewPhotos.tsx
// Photos de travaux — uniquement uploadées par les clients ayant réservé
// + Galerie de travaux sur le profil artisan

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ================================================================
// 1. UPLOAD PHOTOS DANS L'AVIS (côté client après mission)
// ================================================================

export function ReviewPhotoUpload({
  bookingId,
  onPhotosChange,
}: {
  bookingId: string
  onPhotosChange: (urls: string[]) => void
}) {
  const [photos, setPhotos] = useState<{ url: string; preview: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (photos.length + files.length > 5) {
      alert('Maximum 5 photos par avis')
      return
    }

    setUploading(true)
    const newPhotos: { url: string; preview: string }[] = []

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { alert(`${file.name} trop lourd (max 5MB)`); continue }
      if (!file.type.startsWith('image/')) { alert(`${file.name} n'est pas une image`); continue }

      const preview = URL.createObjectURL(file)
      const ext = file.name.split('.').pop()
      const path = `review-photos/${bookingId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from('beti-photos')
        .upload(path, file, { contentType: file.type })

      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('beti-photos').getPublicUrl(path)
        newPhotos.push({ url: publicUrl, preview })
      }
    }

    const updated = [...photos, ...newPhotos]
    setPhotos(updated)
    onPhotosChange(updated.map(p => p.url))
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index)
    setPhotos(updated)
    onPhotosChange(updated.map(p => p.url))
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 10 }}>
        PHOTOS DU TRAVAIL RÉALISÉ (optionnel)
      </div>
      <p style={{ fontSize: 12, color: '#555', fontWeight: 300, marginBottom: 12 }}>
        Ajoutez des photos du travail effectué pour aider les futurs clients.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {/* Photos preview */}
        {photos.map((photo, i) => (
          <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 10, overflow: 'hidden', border: '0.5px solid #2a2a3a' }}>
            <img src={photo.preview || photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            <button
              onClick={() => removePhoto(i)}
              style={{
                position: 'absolute', top: 4, right: 4,
                width: 20, height: 20, borderRadius: '50%',
                background: 'rgba(0,0,0,0.7)', border: 'none',
                color: '#fff', fontSize: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>
          </div>
        ))}

        {/* Bouton ajouter */}
        {photos.length < 5 && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{
              width: 80, height: 80, borderRadius: 10,
              background: '#0D0D12', border: '1px dashed #2a2a3a',
              color: uploading ? '#444' : '#C9A84C', fontSize: 24,
              cursor: uploading ? 'wait' : 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4,
              transition: 'all 0.15s',
            }}
          >
            {uploading ? (
              <div style={{ fontSize: 11, fontWeight: 300 }}>...</div>
            ) : (
              <>
                <span>📷</span>
                <span style={{ fontSize: 9, fontWeight: 300 }}>{photos.length}/5</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        style={{ display: 'none' }}
      />
    </div>
  )
}


// ================================================================
// 2. GALERIE DES TRAVAUX (profil artisan)
// ================================================================

export function WorkGallery({
  photos,
}: {
  photos: {
    url: string
    client_name?: string
    service?: string
    date?: string
    rating?: number
  }[]
}) {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null)

  if (photos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#333' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#555', marginBottom: 6 }}>Aucune photo pour l'instant</div>
        <div style={{ fontSize: 12, color: '#444', fontWeight: 300 }}>
          Les photos sont ajoutées par les clients après chaque mission terminée.
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
        {photos.map((photo, i) => (
          <div
            key={i}
            onClick={() => setSelectedPhoto(i)}
            style={{
              position: 'relative', borderRadius: 12, overflow: 'hidden',
              cursor: 'pointer', aspectRatio: '1',
              border: '0.5px solid #2a2a3a', transition: 'all 0.2s',
            }}
          >
            <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              padding: '16px 10px 8px',
            }}>
              {photo.client_name && (
                <div style={{ fontSize: 10, color: '#aaa', fontWeight: 300 }}>
                  Par {photo.client_name}
                </div>
              )}
              {photo.rating && (
                <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                  {[1,2,3,4,5].map(n => (
                    <span key={n} style={{ fontSize: 8, color: n <= photo.rating! ? '#C9A84C' : '#444' }}>★</span>
                  ))}
                </div>
              )}
            </div>
            {/* Badge vérifié */}
            <div style={{
              position: 'absolute', top: 6, left: 6,
              padding: '2px 8px', borderRadius: 10,
              background: 'rgba(10,32,16,0.9)', border: '0.5px solid #0a3a20',
              fontSize: 9, color: '#4ade80', fontWeight: 800,
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <span>✓</span> Client vérifié
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedPhoto !== null && (
        <div
          onClick={() => setSelectedPhoto(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 500, padding: 24,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: 700, width: '100%' }}>
            <img
              src={photos[selectedPhoto].url}
              alt=""
              style={{ width: '100%', borderRadius: 14, maxHeight: '80vh', objectFit: 'contain' }}
            />
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {photos[selectedPhoto].client_name && (
                  <div style={{ fontSize: 13, color: '#F0EDE8', fontWeight: 300 }}>
                    Photo par <span style={{ fontWeight: 800 }}>{photos[selectedPhoto].client_name}</span>
                  </div>
                )}
                {photos[selectedPhoto].service && (
                  <div style={{ fontSize: 11, color: '#C9A84C', marginTop: 4 }}>{photos[selectedPhoto].service}</div>
                )}
              </div>
              <div style={{ padding: '4px 12px', borderRadius: 20, background: '#0a2010', border: '0.5px solid #0a3a20', fontSize: 11, color: '#4ade80', fontWeight: 800 }}>
                ✓ Client vérifié BETI
              </div>
            </div>

            {/* Navigation */}
            {selectedPhoto > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedPhoto(selectedPhoto - 1) }}
                style={{ position: 'absolute', left: -50, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: '50%', background: '#161620', border: '0.5px solid #2a2a3a', color: '#F0EDE8', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >‹</button>
            )}
            {selectedPhoto < photos.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedPhoto(selectedPhoto + 1) }}
                style={{ position: 'absolute', right: -50, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: '50%', background: '#161620', border: '0.5px solid #2a2a3a', color: '#F0EDE8', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >›</button>
            )}

            {/* Close */}
            <button
              onClick={() => setSelectedPhoto(null)}
              style={{ position: 'absolute', top: -16, right: -16, width: 36, height: 36, borderRadius: '50%', background: '#161620', border: '0.5px solid #2a2a3a', color: '#F0EDE8', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >✕</button>
          </div>
        </div>
      )}
    </>
  )
}


// ================================================================
// 3. PHOTO DE PROFIL ARTISAN (intégrée au profil)
// ================================================================

export function ArtisanAvatar({
  userId,
  currentUrl,
  name,
  size = 88,
  editable = false,
  color = '#C9A84C',
  onUpload,
}: {
  userId: string
  currentUrl: string | null
  name: string
  size?: number
  editable?: boolean
  color?: string
  onUpload?: (url: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const inputRef = useRef<HTMLInputElement>(null)
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'A'

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Photo trop lourde (max 5MB)'); return }
    if (!file.type.startsWith('image/')) { alert('Fichier invalide'); return }

    setLoading(true)
    setPreview(URL.createObjectURL(file))

    const ext = file.name.split('.').pop()
    const path = `avatars/${userId}/profile.${ext}`

    // Supprimer l'ancien si existe
    await supabase.storage.from('beti-photos').remove([path]).catch(() => {})

    const { error } = await supabase.storage
      .from('beti-photos')
      .upload(path, file, { contentType: file.type, upsert: true })

    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('beti-photos').getPublicUrl(path)
      // Mettre à jour le profil
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)
      onUpload?.(publicUrl)
    }
    setLoading(false)
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {preview ? (
        <img
          src={preview}
          alt={name}
          style={{
            width: size, height: size, borderRadius: '50%',
            objectFit: 'cover', border: `2px solid ${color}`,
          }}
        />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: color + '22', border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.35, fontWeight: 800, color: color,
        }}>
          {initials}
        </div>
      )}

      {editable && (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 28, height: 28, borderRadius: '50%',
              background: '#C9A84C', border: '2px solid #0D0D12',
              color: '#0D0D12', fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {loading ? '...' : '📷'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
        </>
      )}
    </div>
  )
}
