'use client'
// components/Portfolio.tsx
// Portfolio des artisans — fil de "posts" de travaux (description + plusieurs photos).
// PortfolioManager : édition côté dashboard artisan (création/suppression).
// PortfolioFeed    : affichage lecture seule sur le profil public.

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { Skeleton } from '@/components/Skeleton'
import { Camera, Hammer } from 'lucide-react'

/** Grille de vignettes shimmer pour le chargement du portfolio. */
function PortfolioSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
      {[0, 1, 2, 3].map(i => <Skeleton key={i} h={150} r={14} />)}
    </div>
  )
}

export type PortfolioPost = {
  id: string
  artisan_id: string
  description: string | null
  photos: string[]
  created_at: string
}

const fmtDate = (d: string) => {
  const x = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (x === 0) return "Aujourd'hui"
  if (x === 1) return 'Hier'
  if (x < 7) return `il y a ${x} j`
  if (x < 30) return `il y a ${Math.floor(x / 7)} sem.`
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Grille de photos d'un post (1 = pleine largeur, 2+ = grille) ──────────────
function PhotoGrid({ photos, onOpen }: { photos: string[]; onOpen?: (i: number) => void }) {
  if (photos.length === 0) return null
  const cols = photos.length === 1 ? 1 : 2
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6, borderRadius: 12, overflow: 'hidden' }}>
      {photos.map((url, i) => (
        <div key={i} onClick={() => onOpen?.(i)}
          style={{ position: 'relative', aspectRatio: photos.length === 1 ? '16/10' : '1', cursor: onOpen ? 'zoom-in' : 'default', overflow: 'hidden', background: 'var(--bg3)' }}>
          <img src={url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ))}
    </div>
  )
}

// ── Lightbox plein écran ──────────────────────────────────────────────────────
function Lightbox({ photos, index, onClose }: { photos: string[]; index: number; onClose: () => void }) {
  const [i, setI] = useState(index)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setI(p => Math.max(0, p - 1))
      if (e.key === 'ArrowRight') setI(p => Math.min(photos.length - 1, p + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photos.length, onClose])
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600, padding: 24 }}>
      <img src={photos[i]} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '90%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12 }} />
      {i > 0 && <button onClick={e => { e.stopPropagation(); setI(i - 1) }} style={navBtn('left')}>‹</button>}
      {i < photos.length - 1 && <button onClick={e => { e.stopPropagation(); setI(i + 1) }} style={navBtn('right')}>›</button>}
      <button onClick={onClose} style={{ position: 'fixed', top: 24, right: 24, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>✕</button>
      <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{i + 1} / {photos.length}</div>
    </div>
  )
}
const navBtn = (side: 'left' | 'right'): React.CSSProperties => ({ position: 'fixed', [side]: 24, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' })

// ════════════════════════════════════════════════════════════════════════════
// MANAGER — côté dashboard artisan
// ════════════════════════════════════════════════════════════════════════════
// Formule Basic : portfolio plafonné. Premium : illimité (cf. lib/plans.ts FEATURES).
const BASIC_PHOTO_LIMIT = 6

export function PortfolioManager({ artisanId, plan = 'free' }: { artisanId: string; plan?: 'free' | 'basic' | 'premium' }) {
  const { t } = useLang()
  const [posts, setPosts] = useState<PortfolioPost[]>([])
  const [loading, setLoading] = useState(true)
  const [description, setDescription] = useState('')
  const [drafts, setDrafts] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [err, setErr] = useState('')
  const [lb, setLb] = useState<{ photos: string[]; i: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [artisanId])
  const load = async () => {
    const { data } = await supabase.from('portfolio_posts').select('*').eq('artisan_id', artisanId).order('created_at', { ascending: false })
    if (data) setPosts(data as PortfolioPost[])
    setLoading(false)
  }

  const unlimited = plan === 'premium'
  const postedCount = posts.reduce((s, p) => s + p.photos.length, 0)
  const usedCount = postedCount + drafts.length
  const limitReached = !unlimited && usedCount >= BASIC_PHOTO_LIMIT

  const addPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (drafts.length + files.length > 8) { setErr(t('portfolio.errMaxPhotos')); return }
    if (!unlimited && postedCount + drafts.length + files.length > BASIC_PHOTO_LIMIT) {
      setErr(`${t('portfolio.errBasicLimit')} ${BASIC_PHOTO_LIMIT} ${t('portfolio.errBasicLimitEnd')}`)
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setUploading(true); setErr('')
    const urls: string[] = []
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { setErr(`${file.name} ${t('portfolio.errSizeLimit')}`); continue }
      if (!file.type.startsWith('image/')) { setErr(`${file.name} ${t('portfolio.errNotImage')}`); continue }
      const ext = file.name.split('.').pop()
      const path = `portfolio/${artisanId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('beti-photos').upload(path, file, { contentType: file.type })
      if (error) { setErr(error.message.includes('security policy') ? t('portfolio.errStoragePolicy') : `${t('portfolio.errUploadFailed')} ${error.message}`); continue }
      urls.push(supabase.storage.from('beti-photos').getPublicUrl(path).data.publicUrl)
    }
    setDrafts(d => [...d, ...urls]); setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const publish = async () => {
    if (drafts.length === 0 && !description.trim()) { setErr(t('portfolio.errEmpty')); return }
    setPosting(true); setErr('')
    const { data, error } = await supabase.from('portfolio_posts')
      .insert({ artisan_id: artisanId, description: description.trim() || null, photos: drafts })
      .select('*').single()
    if (error) { setErr(`${t('portfolio.errPublish')} ${error.message}`); setPosting(false); return }
    setPosts(p => [data as PortfolioPost, ...p])
    setDescription(''); setDrafts([]); setPosting(false)
  }

  const removeDraft = (i: number) => setDrafts(d => d.filter((_, x) => x !== i))
  const deletePost = async (id: string) => {
    if (!confirm(t('portfolio.deleteConfirm'))) return
    await supabase.from('portfolio_posts').delete().eq('id', id)
    setPosts(p => p.filter(x => x.id !== id))
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Composer */}
      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', marginBottom: 4 }}>{t('portfolio.publishTitle')}</div>
        <p style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300, marginBottom: 14 }}>{t('portfolio.publishDesc')}</p>

        {!unlimited && (
          <div style={{ fontSize: 12, color: limitReached ? '#f59e0b' : 'var(--tx3)', fontWeight: 300, lineHeight: 1.6, marginBottom: 14, padding: '10px 12px', borderRadius: 10, background: 'var(--bg)', border: '0.5px solid var(--border)' }}>
            {t('portfolio.basicQuota')} <strong style={{ color: 'var(--tx2)' }}>{Math.min(postedCount, BASIC_PHOTO_LIMIT)}/{BASIC_PHOTO_LIMIT}</strong> {t('portfolio.basicQuotaUsed')}{' '}
            <a href="/artisan-dashboard/abonnement" style={{ color: '#5A3DF0', fontWeight: 700, textDecoration: 'none' }}>{t('portfolio.upgradePremium')}</a> {t('portfolio.unlimitedHint')}
          </div>
        )}

        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
          placeholder={t('portfolio.descPh')}
          style={{ width: '100%', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 14px', color: 'var(--tx)', fontSize: 13, fontFamily: 'Nexa, sans-serif', fontWeight: 300, resize: 'none', outline: 'none', marginBottom: 12 }} />

        {drafts.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {drafts.map((url, i) => (
              <div key={i} style={{ position: 'relative', width: 84, height: 84, borderRadius: 10, overflow: 'hidden', border: '0.5px solid var(--border)' }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => removeDraft(i)} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {err && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => fileRef.current?.click()} disabled={uploading || drafts.length >= 8 || limitReached}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: 'var(--bg)', border: '1px dashed var(--border)', color: (drafts.length >= 8 || limitReached) ? 'var(--tx3)' : '#5A3DF0', fontSize: 13, fontWeight: 700, cursor: (uploading ? 'wait' : limitReached ? 'not-allowed' : 'pointer'), fontFamily: 'Nexa, sans-serif' }}>
            <Camera size={15} />{uploading ? t('portfolio.uploading') : limitReached ? t('portfolio.limitReached') : `${t('portfolio.addPhotos')} (${drafts.length}/8)`}
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={publish} disabled={posting || (drafts.length === 0 && !description.trim())}
            style={{ padding: '10px 22px', borderRadius: 10, background: (drafts.length || description.trim()) ? 'linear-gradient(135deg,#5A3DF0,#7C5CFF)' : 'var(--border)', border: 'none', color: (drafts.length || description.trim()) ? '#fff' : 'var(--tx3)', fontSize: 13, fontWeight: 800, cursor: posting ? 'wait' : 'pointer', fontFamily: 'Nexa, sans-serif' }}>
            {posting ? t('portfolio.publishing') : t('portfolio.publish')}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={addPhotos} style={{ display: 'none' }} />
      </div>

      {/* Posts existants */}
      {loading ? (
        <PortfolioSkeleton />
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--tx3)' }}>
          <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}><Hammer size={32} /></div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx2)', marginBottom: 4 }}>{t('portfolio.emptyTitle')}</div>
          <div style={{ fontSize: 12, fontWeight: 300 }}>{t('portfolio.emptyDesc')}</div>
        </div>
      ) : (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {posts.map(post => (
            <div key={post.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>{fmtDate(post.created_at)}</span>
                <button onClick={() => deletePost(post.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', opacity: 0.7 }}>{t('portfolio.deletePost')}</button>
              </div>
              {post.description && <p style={{ fontSize: 13, color: 'var(--tx)', lineHeight: 1.6, fontWeight: 300, marginBottom: post.photos.length ? 12 : 0 }}>{post.description}</p>}
              <PhotoGrid photos={post.photos} onOpen={i => setLb({ photos: post.photos, i })} />
            </div>
          ))}
        </div>
      )}

      {lb && <Lightbox photos={lb.photos} index={lb.i} onClose={() => setLb(null)} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// FEED — profil public (lecture seule)
// ════════════════════════════════════════════════════════════════════════════
export function PortfolioFeed({ artisanId }: { artisanId: string }) {
  const { t } = useLang()
  const [posts, setPosts] = useState<PortfolioPost[]>([])
  const [loading, setLoading] = useState(true)
  const [lb, setLb] = useState<{ photos: string[]; i: number } | null>(null)

  useEffect(() => {
    supabase.from('portfolio_posts').select('*').eq('artisan_id', artisanId).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setPosts(data as PortfolioPost[]); setLoading(false) })
  }, [artisanId])

  if (loading) return <PortfolioSkeleton />
  if (posts.length === 0) return (
    <div style={{ textAlign: 'center', padding: 48, color: 'var(--tx3)' }}>
      <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}><Hammer size={32}/></div>
      <div style={{ fontSize: 14, fontWeight: 300 }}>{t('portfolio.emptyFeed')}</div>
    </div>
  )

  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {posts.map(post => (
        <div key={post.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300, marginBottom: 10 }}>{fmtDate(post.created_at)}</div>
          {post.description && <p style={{ fontSize: 14, color: 'var(--tx)', lineHeight: 1.7, fontWeight: 300, marginBottom: post.photos.length ? 12 : 0 }}>{post.description}</p>}
          <PhotoGrid photos={post.photos} onOpen={i => setLb({ photos: post.photos, i })} />
        </div>
      ))}
      {lb && <Lightbox photos={lb.photos} index={lb.i} onClose={() => setLb(null)} />}
    </div>
  )
}
