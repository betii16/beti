'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Review = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  artisans: { full_name: string; category: string } | null
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
          style={{ fontSize: interactive ? 28 : 16, cursor: interactive ? 'pointer' : 'default', color: n <= (hover || rating) ? '#C9A84C' : '#2a2a3a', transition: 'color 0.15s' }}>
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
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
      const { data } = await supabase
        .from('reviews')
        .select('*, artisans!reviews_artisan_id_fkey(full_name, category)')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
      if (data) setReviews(data)
      setLoading(false)
    }
    init()
  }, [])

  const submitReview = async () => {
    if (!rating || !bookingId || !userId) return
    setSubmitting(true)
    const { data: booking } = await supabase.from('bookings').select('artisan_id').eq('id', bookingId).single()
    if (booking) {
      await supabase.from('reviews').insert({
        client_id: userId, artisan_id: booking.artisan_id,
        booking_id: bookingId, rating, comment: comment.trim() || null,
      })
      const { data } = await supabase
        .from('reviews')
        .select('*, artisans!reviews_artisan_id_fkey(full_name, category)')
        .eq('client_id', userId)
        .order('created_at', { ascending: false })
      if (data) setReviews(data)
    }
    setSubmitting(false); setSubmitted(true); setShowForm(false); setRating(0); setComment('')
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: '#555', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>Chargement...</div>
    </div>
  )

  return (
    <div style={{ paddingTop: 64, minHeight: '100vh', background: '#0D0D12', fontFamily: 'Nexa, sans-serif' }}>
      <div style={{ background: '#09090f', borderBottom: '0.5px solid #1e1e2a', padding: '32px 40px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 6 }}>MON ESPACE</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8', marginBottom: 4 }}>Mes avis</h1>
          <p style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>{reviews.length} avis laissé{reviews.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 40px' }}>
        {showForm && bookingId && (
          <div style={{ background: '#161620', border: '0.5px solid #C9A84C44', borderRadius: 16, padding: '28px', marginBottom: 28 }}>
            <div style={{ height: 2, background: 'linear-gradient(90deg, #C9A84C, #f59e0b)', borderRadius: 1, marginBottom: 24, marginTop: -28, marginLeft: -28, marginRight: -28 }}/>
            <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 16 }}>LAISSER UN AVIS</div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: '#888', fontWeight: 300, marginBottom: 10 }}>Votre note</div>
              <Stars rating={rating} interactive onRate={setRating}/>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: '#888', fontWeight: 300, marginBottom: 10 }}>Commentaire <span style={{ color: '#444' }}>(optionnel)</span></div>
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Décrivez votre expérience..." rows={4}
                style={{ width: '100%', background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 10, padding: '12px 14px', color: '#F0EDE8', fontSize: 13, fontFamily: 'Nexa, sans-serif', fontWeight: 300, resize: 'none', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)}
                style={{ flex: 1, padding: '11px', background: 'transparent', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#555', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>
                Annuler
              </button>
              <button onClick={submitReview} disabled={!rating || submitting}
                style={{ flex: 2, padding: '11px', background: rating ? '#C9A84C' : '#2a2a3a', border: 'none', borderRadius: 10, color: rating ? '#0D0D12' : '#555', fontSize: 13, fontWeight: 800, cursor: rating ? 'pointer' : 'not-allowed', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s' }}>
                {submitting ? 'Envoi...' : '✓ Publier l\'avis'}
              </button>
            </div>
          </div>
        )}

        {submitted && (
          <div style={{ background: '#0a2010', border: '0.5px solid #4ade8044', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 300 }}>Votre avis a été publié, merci !</span>
          </div>
        )}

        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#333' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⭐</div>
            <div style={{ fontSize: 14, fontWeight: 300 }}>Vous n'avez pas encore laissé d'avis</div>
            <a href="/mon-espace/reservations" style={{ display: 'inline-block', marginTop: 20, padding: '10px 24px', background: '#C9A84C', borderRadius: 10, color: '#0D0D12', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
              Voir mes réservations
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {reviews.map(r => (
              <div key={r.id} style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8', marginBottom: 3 }}>{r.artisans?.full_name || 'Artisan'}</div>
                    <div style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>{r.artisans?.category}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Stars rating={r.rating}/>
                    <div style={{ fontSize: 11, color: '#444', marginTop: 4, fontWeight: 300 }}>{fmt(r.created_at)}</div>
                  </div>
                </div>
                {r.comment && (
                  <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, fontWeight: 300, borderTop: '0.5px solid #1e1e2a', paddingTop: 12, marginTop: 4 }}>
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
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 14, color: '#555', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>Chargement...</div>
      </div>
    }>
      <MesAvisContent />
    </Suspense>
  )
}
