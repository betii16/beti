'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ReviewPhotoUpload } from '@/components/ReviewPhotos'
import { SkeletonPage } from '@/components/Skeleton'
import { CheckCircle2 } from 'lucide-react'

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

function Stars({ rating, interactive = false, onRate }: { rating: number; interactive?: boolean; onRate?: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n}
          onClick={() => interactive && onRate?.(n)}
          onMouseEnter={() => interactive && setHover(n)}
          onMouseLeave={() => interactive && setHover(0)}
          style={{ fontSize: interactive ? 28 : 16, cursor: interactive ? 'pointer' : 'default', color: n <= (hover || rating) ? '#6366f1' : 'var(--border)', transition: 'color 0.15s' }}>
          ★
        </span>
      ))}
    </div>
  )
}

function MesAvisContent() {
  const router = useRouter()
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

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
      // Vérifier que la réservation appartient au client ET est terminée
      if (bookingId) {
        const { data: bk } = await supabase.from('bookings').select('client_id, status').eq('id', bookingId).single()
        const { data: existing } = await supabase.from('reviews').select('id').eq('booking_id', bookingId).maybeSingle()
        if (!bk || bk.client_id !== user.id) { setBookingOk(false); setCheckMsg('Cette réservation est introuvable ou ne vous appartient pas.') }
        else if (bk.status !== 'completed') { setBookingOk(false); setCheckMsg('Vous pourrez laisser un avis une fois la prestation terminée par l\'artisan.') }
        else if (existing) { setBookingOk(false); setCheckMsg('Vous avez déjà laissé un avis pour cette réservation.') }
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
    setSubmitting(true)
    const { data: booking } = await supabase.from('bookings').select('artisan_id').eq('id', bookingId).single()
    if (booking) {
      const { error } = await supabase.from('reviews').insert({
        client_id: userId, artisan_id: booking.artisan_id,
        booking_id: bookingId, rating, comment: comment.trim() || null,
        photos,
      })
      if (error) {
        setSubmitting(false)
        alert(error.message.includes('row-level security')
          ? 'Avis refusé : seuls les clients ayant terminé cette prestation peuvent laisser un avis.'
          : 'Erreur : ' + error.message)
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

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) return <SkeletonPage rows={5} />

  return (
    <div style={{ paddingTop: 64, minHeight: '100vh', fontFamily: 'Nexa, sans-serif' }}>
      <div style={{ borderBottom: '0.5px solid var(--border)', padding: '32px 40px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ fontSize: 10, color: '#6366f1', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 6 }}>MON ESPACE</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--tx)', marginBottom: 4 }}>Mes avis</h1>
          <p style={{ fontSize: 13, color: 'var(--tx3)', fontWeight: 300 }}>{reviews.length} avis laissé{reviews.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 40px' }}>
        {bookingId && bookingOk === false && (
          <div style={{ background: '#f59e0b10', border: '0.5px solid #f59e0b33', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>⏳</span>
            <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 300 }}>{checkMsg}</span>
          </div>
        )}

        {showForm && bookingId && bookingOk === true && (
          <div className="card" style={{ borderColor: '#6366f155', padding: '28px', marginBottom: 28 }}>
            <div style={{ height: 2, background: 'linear-gradient(90deg, #6366f1, #f59e0b)', marginBottom: 24, marginTop: -28, marginLeft: -28, marginRight: -28 }}/>
            <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 16 }}>LAISSER UN AVIS</div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 300, marginBottom: 10 }}>Votre note</div>
              <Stars rating={rating} interactive onRate={setRating}/>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 300, marginBottom: 10 }}>Commentaire <span style={{ color: 'var(--tx3)' }}>(optionnel)</span></div>
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Décrivez votre expérience..." rows={4} className="field" style={{ resize: 'none' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <ReviewPhotoUpload bookingId={bookingId} onPhotosChange={setPhotos} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} className="btn-ghost" style={{ flex: 1 }}>
                Annuler
              </button>
              <button onClick={submitReview} disabled={!rating || submitting} className="btn-primary" style={{ flex: 2 }}>
                {submitting ? 'Envoi...' : '✓ Publier l\'avis'}
              </button>
            </div>
          </div>
        )}

        {submitted && (
          <div style={{ background: '#10b98112', border: '0.5px solid #10b98144', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={18} color="#10b981"/>
            <span style={{ fontSize: 13, color: '#10b981', fontWeight: 300 }}>Votre avis a été publié, merci !</span>
          </div>
        )}

        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#333' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⭐</div>
            <div style={{ fontSize: 14, fontWeight: 300 }}>Vous n'avez pas encore laissé d'avis</div>
            <a href="/mon-espace/reservations" className="btn-primary btn-sm" style={{ marginTop: 20 }}>
              Voir mes réservations
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {reviews.map(r => (
              <div key={r.id} className="card" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', marginBottom: 3 }}>{r.artisans?.full_name || 'Artisan'}</div>
                    <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>{r.artisans?.category}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Stars rating={r.rating}/>
                    <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 4, fontWeight: 300 }}>{fmt(r.created_at)}</div>
                  </div>
                </div>
                {r.comment && (
                  <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.6, fontWeight: 300, borderTop: '0.5px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                    "{r.comment}"
                  </div>
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
