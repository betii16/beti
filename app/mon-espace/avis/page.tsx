'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { ReviewPhotoUpload } from '@/components/ReviewPhotos'
import { SkeletonPage } from '@/components/Skeleton'
import { CheckCircle2, AlertTriangle, Star } from 'lucide-react'

const SCOPE_CSS = `.avis-scope :is(a,button):focus-visible{outline:2px solid var(--accent);outline-offset:2px}`

type Review = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  artisans: { full_name: string; category: string } | null
}

// L'artisan d'un avis : nom sur `profiles`, catégorie sur `artisans` (même id).
// On enrichit en 2 requêtes au lieu d'un embed par nom de FK (fragile/erroné).
async function withArtisanInfo(reviews: any[]): Promise<any[]> {
  const list = reviews || []
  const ids = Array.from(new Set(list.map(r => r.artisan_id).filter(Boolean)))
  if (!ids.length) return list
  const [{ data: profs }, { data: arts }] = await Promise.all([
    supabase.from('profiles').select('id, full_name').in('id', ids),
    supabase.from('artisans').select('id, category').in('id', ids),
  ])
  const pMap = new Map((profs || []).map((p: any) => [p.id, p.full_name]))
  const aMap = new Map((arts || []).map((a: any) => [a.id, a.category]))
  return list.map(r => ({
    ...r,
    artisans: { full_name: pMap.get(r.artisan_id) || 'Artisan', category: aMap.get(r.artisan_id) || '' },
  }))
}

function StarSvg({ size, on }: { size: number; on: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill={on ? 'var(--laiton)' : 'var(--border2)'} style={{ transition: 'fill 0.15s' }}>
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
    </svg>
  )
}

function Stars({ rating, interactive = false, onRate, label }: { rating: number; interactive?: boolean; onRate?: (n: number) => void; label?: string }) {
  const [hover, setHover] = useState(0)
  if (!interactive) {
    return (
      <div role="img" aria-label={`${rating}/5`} style={{ display: 'flex', gap: 3 }}>
        {[1,2,3,4,5].map(n => <StarSvg key={n} size={16} on={n <= rating} />)}
      </div>
    )
  }
  // Notation : vrais boutons radio (clavier + lecteur d'écran), cibles 44px.
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'flex', gap: 2, marginInlineStart: -8 }} onMouseLeave={() => setHover(0)}>
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n}/5`}
          onClick={() => onRate?.(n)}
          onMouseEnter={() => setHover(n)}
          style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 10, cursor: 'pointer', transition: 'transform 0.15s ease', transform: hover === n ? 'scale(1.15)' : 'none' }}>
          <StarSvg size={30} on={n <= (hover || rating)} />
        </button>
      ))}
    </div>
  )
}

function MesAvisContent() {
  const router = useRouter()
  const { t, isAr } = useLang()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking')

  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(!!bookingId)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [bookingOk, setBookingOk] = useState<boolean | null>(null)
  const [checkMsg, setCheckMsg] = useState('')
  const [submitErr, setSubmitErr] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
      // Vérifier que la réservation appartient au client ET est terminée
      if (bookingId) {
        const { data: bk } = await supabase.from('bookings').select('client_id, status').eq('id', bookingId).single()
        const { data: existing } = await supabase.from('reviews').select('id').eq('booking_id', bookingId).maybeSingle()
        if (!bk || bk.client_id !== user.id) { setBookingOk(false); setCheckMsg(t('avis.errNotFound')) }
        else if (bk.status !== 'completed') { setBookingOk(false); setCheckMsg(t('avis.errNotDone')) }
        else if (existing) { setBookingOk(false); setCheckMsg(t('avis.errAlready')) }
        else { setBookingOk(true) }
      }
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
      if (data) setReviews(await withArtisanInfo(data) as any)
      setLoading(false)
    }
    init()
  }, [])

  const submitReview = async () => {
    if (!rating || !bookingId || !userId) return
    setSubmitting(true); setSubmitErr('')
    const { data: booking } = await supabase.from('bookings').select('artisan_id').eq('id', bookingId).single()
    if (booking) {
      const { error } = await supabase.from('reviews').insert({
        client_id: userId, artisan_id: booking.artisan_id,
        booking_id: bookingId, rating, comment: comment.trim() || null,
        photos,
      })
      if (error) {
        setSubmitting(false)
        setSubmitErr(error.message.includes('row-level security')
          ? t('avis.errDenied')
          : 'Impossible de publier l’avis : ' + error.message)
        return
      }
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('client_id', userId)
        .order('created_at', { ascending: false })
      if (data) setReviews(await withArtisanInfo(data) as any)
    }
    setSubmitting(false); setSubmitted(true); setShowForm(false); setRating(0); setComment(''); setPhotos([])
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) return <SkeletonPage rows={5} />

  return (
    <div className="avis-scope" style={{ paddingTop: 64, minHeight: '100vh', direction: isAr ? 'rtl' : 'ltr' }}>
      <style>{SCOPE_CSS}</style>
      <div className="page-x" style={{ borderBottom: '1px solid var(--border)', padding: '32px 40px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div className="section-label">{t('avis.eyebrow')}</div>
          <h1 style={{ fontSize: 'clamp(24px, 6vw, 30px)', lineHeight: 1.15, fontWeight: 800, color: 'var(--tx)', marginBottom: 6 }}>{t('avis.title')}</h1>
          <p style={{ fontSize: 14, color: 'var(--tx2)' }}><span className="num">{reviews.length}</span> {t('avis.subtitle')}</p>
        </div>
      </div>

      <div className="page-pad-m" style={{ maxWidth: 700, margin: '0 auto', padding: '28px 40px 48px' }}>
        {bookingId && bookingOk === false && (
          <div role="status" style={{ background: 'color-mix(in srgb, var(--warning) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--warning) 35%, transparent)', borderRadius: 'var(--r-field)', padding: '14px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={18} color="var(--warning)" aria-hidden style={{ flexShrink: 0 }}/>
            <span style={{ fontSize: 14, color: 'var(--tx)', lineHeight: 1.5 }}>{checkMsg}</span>
          </div>
        )}

        {showForm && bookingId && bookingOk === true && (
          <div className="card" style={{ borderColor: 'color-mix(in srgb, var(--accent) 40%, var(--border))', padding: 'clamp(20px, 5vw, 28px)', marginBottom: 28 }}>
            <h2 className="section-label" style={{ marginBottom: 16 }}>{t('avis.formTitle')}</h2>
            <div style={{ marginBottom: 20 }}>
              <div id="avis-rating" style={{ fontSize: 14, color: 'var(--tx)', fontWeight: 600, marginBottom: 6 }}>{t('avis.ratingLabel')}</div>
              <Stars rating={rating} interactive onRate={setRating} label={t('avis.ratingLabel')}/>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="avis-comment" style={{ display: 'block', fontSize: 14, color: 'var(--tx)', fontWeight: 600, marginBottom: 10 }}>{t('avis.commentLabel')} <span style={{ color: 'var(--tx2)', fontWeight: 400 }}>{t('avis.optional')}</span></label>
              <textarea id="avis-comment" value={comment} onChange={e => setComment(e.target.value)} placeholder={t('avis.commentPh')} rows={4} className="field" style={{ resize: 'none' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <ReviewPhotoUpload bookingId={bookingId} onPhotosChange={setPhotos} />
            </div>

            {submitErr && (
              <div role="alert" style={{ padding: '11px 14px', borderRadius: 'var(--r-field)', marginBottom: 14, background: 'color-mix(in srgb, var(--danger) 9%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', fontSize: 13, color: 'var(--danger)', fontWeight: 600, lineHeight: 1.5 }}>{submitErr}</div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} className="btn-ghost" style={{ flex: 1, minHeight: 46 }}>
                {t('avis.cancel')}
              </button>
              <button onClick={submitReview} disabled={!rating || submitting} className="btn-primary" style={{ flex: 2, minHeight: 46 }}>
                {submitting ? t('avis.publishing') : t('avis.publish')}
              </button>
            </div>
          </div>
        )}

        {submitted && (
          <div role="status" style={{ background: 'color-mix(in srgb, var(--success) 11%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 32%, transparent)', borderRadius: 'var(--r-field)', padding: '14px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={18} color="var(--success)" aria-hidden style={{ flexShrink: 0 }}/>
            <span style={{ fontSize: 14, color: 'var(--tx)', fontWeight: 600 }}>{t('avis.successMsg')}</span>
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div aria-hidden style={{ width: 56, height: 56, borderRadius: 14, margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--laiton)', background: 'color-mix(in srgb, var(--laiton) 14%, transparent)' }}>
              <Star size={26} fill="currentColor" strokeWidth={0}/>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx)', marginBottom: 18 }}>{t('avis.empty')}</div>
            <a href="/mon-espace/reservations" className="btn-primary" style={{ minHeight: 44 }}>
              {t('avis.seeBookings')}
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {reviews.map(r => (
              <div key={r.id} className="card" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: r.comment ? 10 : 0 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', marginBottom: 3 }}>{r.artisans?.full_name || t('avis.artisanFallback')}</div>
                    {r.artisans?.category && <div style={{ fontSize: 13, color: 'var(--tx2)' }}>{t(`categories.${r.artisans.category}`)}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                    <Stars rating={r.rating}/>
                    <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 5 }}>{fmt(r.created_at)}</div>
                  </div>
                </div>
                {r.comment && (
                  <blockquote style={{ fontSize: 14, color: 'var(--tx)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                    « {r.comment} »
                  </blockquote>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MesAvis() {
  return (
    <Suspense fallback={<SkeletonPage rows={5} />}>
      <MesAvisContent />
    </Suspense>
  )
}
