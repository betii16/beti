'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AddressPicker } from '@/components/AddressPicker'
import { ArtisanAvatar, WorkGallery } from '@/components/ReviewPhotos'

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
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

const CATEGORY_COLORS: Record<string, string> = {
  plomberie: '#3b82f6', electricite: '#f59e0b', menage: '#10b981',
  demenagement: '#8b5cf6', jardinage: '#22c55e', peinture: '#ef4444',
  serrurerie: '#f97316', informatique: '#6366f1', coiffure: '#ec4899',
  autre: '#a78bfa',
}

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']
const TIME_SLOTS = [
  { label: 'Matin',      times: ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30'] },
  { label: 'Après-midi', times: ['14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30'] },
  { label: 'Soir',       times: ['18:00','18:30','19:00','19:30'] },
]

export default function ArtisanProfilePage() {
  const params = useParams()
  const artisanId = params?.id as string

  const [artisan, setArtisan] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [workPhotos, setWorkPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  const [activeTab, setActiveTab] = useState<'about'|'photos'|'reviews'|'rates'>('about')
  const [showBooking, setShowBooking] = useState(false)
  const [bookingStep, setBookingStep] = useState<1|2|3>(1)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState('')
  const [bookingAddress, setBookingAddress] = useState('')
  const [bookingDesc, setBookingDesc] = useState('')
  const [bookingSent, setBookingSent] = useState(false)
  const [calMonth, setCalMonth] = useState(new Date())

  useEffect(() => {
    loadData()
  }, [artisanId])

  const loadData = async () => {
    setLoading(true)

    // Current user
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
      setIsOwner(user.id === artisanId)
    }

    // Artisan + profile
    const [{ data: art }, { data: prof }] = await Promise.all([
      supabase.from('artisans').select('*').eq('id', artisanId).single(),
      supabase.from('profiles').select('full_name, phone, avatar_url').eq('id', artisanId).single(),
    ])

    if (art) setArtisan(art)
    if (prof) setProfile(prof)

    // Reviews avec infos client
    const { data: revs } = await supabase
      .from('reviews')
      .select('id, rating, comment, photos, created_at, client_id, profiles!reviews_client_id_fkey(full_name)')
      .eq('artisan_id', artisanId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (revs) {
      setReviews(revs)
      // Extraire les photos de travaux depuis les avis
      const photos = revs
        .filter((r: any) => r.photos && r.photos.length > 0)
        .flatMap((r: any) => (r.photos || []).map((url: string) => ({
          url,
          client_name: r.profiles?.full_name || 'Client vérifié',
          rating: r.rating,
          date: r.created_at,
        })))
      setWorkPhotos(photos)
    }

    setLoading(false)
  }

  // Fallback demo data
  const a = artisan || {
    id: artisanId, category: 'plomberie', bio: 'Artisan professionnel certifié BETI.',
    years_experience: 5, hourly_rate: 3000, intervention_radius_km: 15,
    location_city: 'Alger', is_available: true, rating_avg: 4.8, rating_count: 0,
    total_missions: 0, tags: [],
  }
  const p = profile || { full_name: 'Artisan BETI', phone: null, avatar_url: null }
  const color = CATEGORY_COLORS[a.category] || '#C9A84C'

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !bookingAddress) return

    if (currentUserId) {
      const scheduled = new Date(selectedDate)
      const [h, m] = selectedTime.split(':')
      scheduled.setHours(parseInt(h), parseInt(m))

      await supabase.from('bookings').insert({
        client_id: currentUserId,
        artisan_id: artisanId,
        title: `Réservation ${a.category}`,
        description: bookingDesc || null,
        address: bookingAddress,
        scheduled_at: scheduled.toISOString(),
        status: 'pending',
        price_agreed: a.hourly_rate,
      })

      // Notification artisan
      await supabase.from('notifications').insert({
        user_id: artisanId,
        type: 'new_booking',
        title: 'Nouvelle réservation',
        message: `${p.full_name || 'Un client'} souhaite réserver vos services.`,
      })
    }

    setBookingSent(true)
    setTimeout(() => { setShowBooking(false); setBookingSent(false); setBookingStep(1) }, 3000)
  }

  const formatDate = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const canNext = bookingStep === 1 ? (selectedDate !== null && selectedTime !== '') : bookingStep === 2 ? bookingAddress !== '' : true
  const timeAgo = (date: string) => {
    const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
    if (d === 0) return 'Aujourd\'hui'
    if (d === 1) return 'Hier'
    if (d < 7) return `Il y a ${d} jours`
    if (d < 30) return `Il y a ${Math.floor(d / 7)} sem.`
    return `Il y a ${Math.floor(d / 30)} mois`
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 64 }}>
        <div style={{ fontSize: 14, color: '#555' }}>Chargement...</div>
      </div>
    )
  }

  return (
    <>
      <style suppressHydrationWarning>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0D0D12; font-family: 'Nexa', sans-serif; -webkit-font-smoothing: antialiased; }
        @keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>

      <div style={{ paddingTop: 52, minHeight: '100vh', background: '#0D0D12' }}>

        {/* ── HERO ── */}
        <div style={{ background: '#09090f', borderBottom: '0.5px solid #1e1e2a', padding: '48px 32px 40px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28, flexWrap: 'wrap' }}>

              {/* Avatar */}
              <ArtisanAvatar
                userId={artisanId}
                currentUrl={p.avatar_url}
                name={p.full_name}
                size={88}
                editable={isOwner}
                color={color}
                onUpload={(url) => setProfile({ ...p, avatar_url: url })}
              />

              {/* Infos */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                  <h1 style={{ fontSize: 32, fontWeight: 800, color: '#F0EDE8', fontFamily: 'Nexa, sans-serif' }}>{p.full_name}</h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: a.is_available ? '#0a2010' : '#1a1010', border: `0.5px solid ${a.is_available ? '#0a3a20' : '#2a1010'}`, fontSize: 11, fontWeight: 800, color: a.is_available ? '#4ade80' : '#666' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: a.is_available ? '#4ade80' : '#444' }}/>
                    {a.is_available ? 'Disponible' : 'Occupé'}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#C9A84C', letterSpacing: '0.06em', fontWeight: 800, marginBottom: 12 }}>
                  {(a.category || '').toUpperCase()} · {a.location_city || 'Algérie'}
                </div>
                <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                  {[
                    { val: <><StarRating rating={a.rating_avg || 0} size={13}/><span style={{marginLeft:6}}>{(a.rating_avg || 0).toFixed(1)}</span></>, label: `${a.rating_count || 0} avis` },
                    { val: a.total_missions || 0, label: 'Missions' },
                    { val: `${a.years_experience || 0} ans`, label: 'Expérience' },
                    { val: `${a.intervention_radius_km || 10} km`, label: 'Rayon' },
                  ].map((s, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', display: 'flex', alignItems: 'center' }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prix + Boutons */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: '#C9A84C', fontFamily: 'Nexa, sans-serif' }}>{(a.hourly_rate || 0).toLocaleString('fr-DZ')} DA</span>
                  <span style={{ fontSize: 13, color: '#555' }}>/heure</span>
                </div>

                {/* Bouton Réserver */}
                <button onClick={() => { setShowBooking(true); setBookingStep(1) }}
                  style={{ padding: '14px 28px', background: '#C9A84C', border: 'none', borderRadius: 12, color: '#0D0D12', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', width: '100%', marginBottom: 10 }}>
                  Réserver maintenant
                </button>

                {/* Bouton Appeler */}
                {p.phone && (
                  <a href={`tel:${p.phone}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <button
                      style={{
                        padding: '12px 28px', width: '100%',
                        background: 'transparent', border: '0.5px solid #4ade8066',
                        borderRadius: 12, color: '#4ade80', fontSize: 13, fontWeight: 800,
                        cursor: 'pointer', fontFamily: 'Nexa, sans-serif',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      Appeler directement
                    </button>
                  </a>
                )}
              </div>
            </div>

            {/* Tags / Mots-clés */}
            {a.tags && a.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 20 }}>
                {a.tags.map((tag: string) => (
                  <span key={tag} style={{ padding: '4px 12px', borderRadius: 20, background: '#1a1508', border: '0.5px solid #C9A84C44', fontSize: 11, color: '#C9A84C', fontWeight: 300 }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '7px 14px', borderRadius: 8, background: '#1a1508', border: '0.5px solid #2a2010' }}>
              <div style={{ width: 18, height: 18, background: '#C9A84C', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#0D0D12' }}>B</div>
              <span style={{ fontSize: 11, color: '#C9A84C', letterSpacing: '0.06em', fontWeight: 800 }}>ARTISAN BETI CERTIFIÉ</span>
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px' }}>
          <div style={{ display: 'flex', borderBottom: '0.5px solid #2a2a3a', marginBottom: 32 }}>
            {([
              { id: 'about', label: 'À propos' },
              { id: 'photos', label: `Travaux (${workPhotos.length})` },
              { id: 'reviews', label: `Avis (${reviews.length})` },
              { id: 'rates', label: 'Tarifs' },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '14px 24px', background: 'transparent', border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #C9A84C' : '2px solid transparent',
                  color: activeTab === tab.id ? '#C9A84C' : '#555',
                  fontSize: 13, fontWeight: activeTab === tab.id ? 800 : 300,
                  cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s',
                }}
              >{tab.label}</button>
            ))}
          </div>

          {/* Tab: À propos */}
          {activeTab === 'about' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F0EDE8', marginBottom: 12 }}>Description</h3>
              <p style={{ fontSize: 14, color: '#888', lineHeight: 1.8, fontWeight: 300, marginBottom: 32 }}>
                {a.bio || 'Artisan professionnel certifié BETI, disponible pour vos interventions à domicile.'}
              </p>

              {a.tags && a.tags.length > 0 && (
                <>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F0EDE8', marginBottom: 12 }}>Spécialités</h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
                    {a.tags.map((tag: string) => (
                      <span key={tag} style={{ padding: '6px 16px', borderRadius: 20, background: '#1a1508', border: '0.5px solid #C9A84C44', fontSize: 12, color: '#C9A84C', fontWeight: 300 }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </>
              )}

              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F0EDE8', marginBottom: 12 }}>Zone d'intervention</h3>
              <p style={{ fontSize: 14, color: '#888', fontWeight: 300 }}>
                📍 {a.location_city || 'Algérie'} · Rayon de {a.intervention_radius_km || 10} km
              </p>
            </div>
          )}

          {/* Tab: Photos travaux */}
          {activeTab === 'photos' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F0EDE8' }}>Travaux réalisés</h3>
                <div style={{ padding: '3px 10px', borderRadius: 20, background: '#0a2010', border: '0.5px solid #0a3a20', fontSize: 10, color: '#4ade80', fontWeight: 800 }}>
                  ✓ Photos vérifiées
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#555', fontWeight: 300, marginBottom: 20 }}>
                Ces photos sont exclusivement postées par les clients ayant effectué une réservation confirmée.
              </p>
              <WorkGallery photos={workPhotos}/>
            </div>
          )}

          {/* Tab: Avis */}
          {activeTab === 'reviews' && (
            <div>
              {/* Résumé */}
              {reviews.length > 0 && (
                <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '24px', marginBottom: 24, display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', minWidth: 100 }}>
                    <div style={{ fontSize: 48, fontWeight: 800, color: '#C9A84C', lineHeight: 1, fontFamily: 'Nexa, sans-serif' }}>
                      {(a.rating_avg || 0).toFixed(1)}
                    </div>
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'center', margin: '8px 0' }}>
                      {[1,2,3,4,5].map(i => <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i <= Math.round(a.rating_avg || 0) ? '#C9A84C' : '#2a2a3a'}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>)}
                    </div>
                    <div style={{ fontSize: 11, color: '#555' }}>{reviews.length} avis</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    {[5,4,3,2,1].map(star => {
                      const count = reviews.filter((r: any) => r.rating === star).length
                      const pct = Math.round((count / reviews.length) * 100)
                      return (
                        <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: '#555', width: 8 }}>{star}</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="#C9A84C"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                          <div style={{ flex: 1, height: 5, background: '#1e1e2a', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: '#C9A84C', borderRadius: 3 }}/>
                          </div>
                          <span style={{ fontSize: 11, color: '#555', width: 28 }}>{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Liste avis */}
              {reviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: '#444', fontSize: 14 }}>
                  Aucun avis pour l'instant.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {reviews.map((r: any) => (
                    <div key={r.id} style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '20px 24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#888', fontWeight: 800 }}>
                            {(r.profiles?.full_name || 'C')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8' }}>{r.profiles?.full_name || 'Client vérifié'}</div>
                            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{timeAgo(r.created_at)}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1,2,3,4,5].map(i => <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i <= r.rating ? '#C9A84C' : '#2a2a3a'}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>)}
                        </div>
                      </div>
                      {r.comment && <p style={{ fontSize: 13, color: '#888', lineHeight: 1.7, fontWeight: 300 }}>{r.comment}</p>}
                      {/* Photos de l'avis */}
                      {r.photos && r.photos.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                          {r.photos.map((url: string, pi: number) => (
                            <img key={pi} src={url} alt="" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', border: '0.5px solid #2a2a3a' }}/>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Tarifs */}
          {activeTab === 'rates' && (
            <div>
              <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#555', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 4 }}>TARIF HORAIRE</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#C9A84C', fontFamily: 'Nexa, sans-serif' }}>
                      {(a.hourly_rate || 0).toLocaleString('fr-DZ')} DA<span style={{ fontSize: 14, color: '#555', fontWeight: 300 }}>/heure</span>
                    </div>
                  </div>
                  <div style={{ padding: '8px 16px', borderRadius: 10, background: '#0D0D12', border: '0.5px solid #2a2a3a' }}>
                    <div style={{ fontSize: 11, color: '#555', fontWeight: 800, marginBottom: 4 }}>PAIEMENT</div>
                    <div style={{ fontSize: 13, color: '#F0EDE8', fontWeight: 300 }}>💵 Cash uniquement</div>
                  </div>
                </div>
                <div style={{ height: '0.5px', background: '#2a2a3a', marginBottom: 16 }}/>
                <p style={{ fontSize: 12, color: '#555', fontWeight: 300, lineHeight: 1.7 }}>
                  Le tarif est indicatif et peut varier selon la complexité de l'intervention. 
                  Un devis précis vous sera communiqué par l'artisan avant le début des travaux.
                  Le paiement se fait en cash directement à l'artisan après l'intervention.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL RÉSERVATION ── */}
      {showBooking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }}>
          <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 20, maxWidth: 480, width: '100%', maxHeight: '90vh', overflow: 'auto', animation: 'slideUp 0.3s ease' }}>

            {/* Header */}
            <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#F0EDE8', fontFamily: 'Nexa, sans-serif' }}>Réserver</div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>avec {p.full_name}</div>
              </div>
              <button onClick={() => setShowBooking(false)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>

            {/* Steps indicator */}
            <div style={{ padding: '0 28px', display: 'flex', gap: 8, marginBottom: 24 }}>
              {[1,2,3].map(s => (
                <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= bookingStep ? '#C9A84C' : '#2a2a3a', transition: 'background 0.3s' }}/>
              ))}
            </div>

            {bookingSent ? (
              <div style={{ padding: '48px 28px', textAlign: 'center' }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#F0EDE8', marginBottom: 8, fontFamily: 'Nexa, sans-serif' }}>Demande envoyée !</div>
                <div style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>L'artisan va confirmer votre réservation sous peu.</div>
              </div>
            ) : (
              <>
                <div style={{ padding: '0 28px 20px' }}>
                  {/* Step 1: Date & Heure */}
                  {bookingStep === 1 && (
                    <div>
                      <div style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 16 }}>DATE & HEURE</div>
                      <BookingCalendar
                        selectedDate={selectedDate}
                        onSelect={d => setSelectedDate(d)}
                        month={calMonth}
                        onPrevMonth={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}
                        onNextMonth={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}
                      />
                      {selectedDate && (
                        <div style={{ marginTop: 20 }}>
                          <div style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 12 }}>CRÉNEAU</div>
                          {TIME_SLOTS.map(group => (
                            <div key={group.label} style={{ marginBottom: 14 }}>
                              <div style={{ fontSize: 11, color: '#444', marginBottom: 8 }}>{group.label}</div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {group.times.map(t => (
                                  <button key={t} onClick={() => setSelectedTime(t)}
                                    style={{
                                      padding: '6px 14px', borderRadius: 8,
                                      background: selectedTime === t ? '#C9A84C' : '#0D0D12',
                                      border: `0.5px solid ${selectedTime === t ? '#C9A84C' : '#2a2a3a'}`,
                                      color: selectedTime === t ? '#0D0D12' : '#888',
                                      fontSize: 12, fontWeight: selectedTime === t ? 800 : 300,
                                      cursor: 'pointer', fontFamily: 'Nexa, sans-serif',
                                    }}
                                  >{t}</button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Adresse */}
                  {bookingStep === 2 && (
                    <div>
                      {selectedDate && selectedTime && (
                        <div style={{ background: '#0D0D12', border: '0.5px solid #2a2010', borderRadius: 12, padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 20 }}>📅</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#C9A84C' }}>{formatDate(selectedDate)}</div>
                            <div style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>à {selectedTime}</div>
                          </div>
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 12 }}>ADRESSE D'INTERVENTION</div>
                      <AddressPicker onConfirm={({ address: addr }) => setBookingAddress(addr)}/>
                    </div>
                  )}

                  {/* Step 3: Confirmation */}
                  {bookingStep === 3 && (
                    <div>
                      <div style={{ background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
                        {[
                          { icon: '🔧', label: 'Artisan', val: p.full_name },
                          { icon: '📅', label: 'Date',    val: selectedDate ? formatDate(selectedDate) : '' },
                          { icon: '🕐', label: 'Heure',   val: selectedTime },
                          { icon: '📍', label: 'Adresse', val: bookingAddress },
                          { icon: '💰', label: 'Tarif',   val: `${(a.hourly_rate || 0).toLocaleString('fr-DZ')} DA/h · Paiement en cash` },
                        ].map(item => (
                          <div key={item.label} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '0.5px solid #1e1e2a' }}>
                            <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                            <div>
                              <div style={{ fontSize: 11, color: '#555', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 2 }}>{item.label}</div>
                              <div style={{ fontSize: 13, color: '#F0EDE8', fontWeight: 300 }}>{item.val}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 8, fontWeight: 800, letterSpacing: '0.06em' }}>DESCRIPTION (optionnel)</label>
                        <textarea value={bookingDesc} onChange={e => setBookingDesc(e.target.value)} placeholder="Décrivez votre problème en quelques mots..." rows={3}
                          style={{ width: '100%', padding: '12px 14px', background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#F0EDE8', fontSize: 13, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300, resize: 'none' }}/>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer navigation */}
                <div style={{ padding: '0 28px 28px', display: 'flex', gap: 10 }}>
                  {bookingStep > 1 && (
                    <button onClick={() => setBookingStep(s => (s-1) as any)}
                      style={{ flex: 1, padding: '13px', background: 'transparent', border: '0.5px solid #2a2a3a', borderRadius: 12, color: '#888', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                      ← Retour
                    </button>
                  )}
                  <button
                    onClick={() => bookingStep < 3 ? setBookingStep(s => (s+1) as any) : handleBooking()}
                    disabled={!canNext}
                    style={{
                      flex: 2, padding: '13px',
                      background: canNext ? '#C9A84C' : '#1a1a2a',
                      border: 'none', borderRadius: 12,
                      color: canNext ? '#0D0D12' : '#444',
                      fontSize: 13, fontWeight: 800,
                      cursor: canNext ? 'pointer' : 'not-allowed',
                      fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s',
                    }}
                  >
                    {bookingStep === 3 ? '✓ Envoyer la demande' : 'Continuer →'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}


// ── Calendrier ─────────────────────────────────────────────────────

function BookingCalendar({ selectedDate, onSelect, month, onPrevMonth, onNextMonth }: {
  selectedDate: Date | null; onSelect: (d: Date) => void; month: Date; onPrevMonth: () => void; onNextMonth: () => void
}) {
  const year = month.getFullYear(), m = month.getMonth()
  const firstDay = new Date(year, m, 1).getDay()
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  const offset = firstDay === 0 ? 6 : firstDay - 1
  const days: (Date | null)[] = []
  for (let i = 0; i < offset; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, m, d))

  const today = new Date(); today.setHours(0,0,0,0)
  const isPast = (d: Date) => d < today
  const isToday = (d: Date) => d.toDateString() === today.toDateString()
  const isSel = (d: Date) => selectedDate?.toDateString() === d.toDateString()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={onPrevMonth} style={{ width: 34, height: 34, borderRadius: '50%', background: '#1e1e2a', border: 'none', color: '#F0EDE8', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', fontFamily: 'Nexa, sans-serif' }}>{MONTHS_FR[m]} {year}</span>
        <button onClick={onNextMonth} style={{ width: 34, height: 34, borderRadius: '50%', background: '#1e1e2a', border: 'none', color: '#F0EDE8', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
        {DAYS_FR.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#555', fontWeight: 800, padding: '4px 0', fontFamily: 'Nexa, sans-serif' }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {days.map((d, i) => (
          <div key={i}>
            {d ? (
              <button onClick={() => !isPast(d) && onSelect(d)} disabled={isPast(d)}
                style={{
                  width: '100%', aspectRatio: '1', borderRadius: '50%', border: 'none',
                  background: isSel(d) ? '#C9A84C' : isToday(d) ? '#1a1508' : 'transparent',
                  color: isSel(d) ? '#0D0D12' : isPast(d) ? '#2a2a3a' : isToday(d) ? '#C9A84C' : '#F0EDE8',
                  fontSize: 13, fontWeight: isSel(d) || isToday(d) ? 800 : 300,
                  cursor: isPast(d) ? 'not-allowed' : 'pointer', fontFamily: 'Nexa, sans-serif',
                  boxShadow: isSel(d) ? '0 0 12px #C9A84C66' : 'none', transition: 'all 0.15s',
                }}
              >{d.getDate()}</button>
            ) : <div/>}
          </div>
        ))}
      </div>
    </div>
  )
}
