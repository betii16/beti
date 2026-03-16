'use client'
import { ReviewList, RatingSummary } from '@/components/ReviewSystem'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i <= Math.round(rating) ? '#C9A84C' : '#2a2a3a'}>
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </div>
  )
}

// Données de démo (remplacées par les vraies données Supabase)
const DEMO_ARTISAN = {
  id: '1',
  full_name: 'Jean Dupont',
  initials: 'JD',
  category: 'Plombier',
  color: '#C9A84C',
  bio: 'Plombier professionnel depuis 10 ans, spécialisé en rénovation et dépannage d\'urgence. Interviens en Île-de-France sous 1h. Travail soigné, devis gratuit.',
  years_experience: 10,
  hourly_rate: 45,
  intervention_radius_km: 20,
  location_city: 'Paris',
  is_available: true,
  rating_avg: 4.9,
  rating_count: 84,
  total_missions: 312,
  subcategories: ['Fuite d\'eau', 'Installation', 'Débouchage', 'Chauffe-eau', 'Urgence'],
}

const DEMO_REVIEWS = [
  { id: 1, client_name: 'Sophie M.', rating: 5, comment: 'Intervention rapide et très professionnelle. Jean a réglé la fuite en moins d\'une heure. Je recommande vivement !', date: 'Il y a 2 jours' },
  { id: 2, client_name: 'Marc T.', rating: 5, comment: 'Excellent artisan, ponctuel et efficace. Le prix est honnête par rapport à la qualité du travail.', date: 'Il y a 1 semaine' },
  { id: 3, client_name: 'Amina B.', rating: 4, comment: 'Bon travail sur l\'installation du chauffe-eau. Quelques minutes de retard mais prévenu à l\'avance.', date: 'Il y a 2 semaines' },
  { id: 4, client_name: 'Pierre L.', rating: 5, comment: 'Parfait ! Débouchage rapide, propre et pas de dégâts. Merci Jean !', date: 'Il y a 1 mois' },
]

const RATING_DIST = [
  { stars: 5, pct: 78 },
  { stars: 4, pct: 15 },
  { stars: 3, pct: 5 },
  { stars: 2, pct: 1 },
  { stars: 1, pct: 1 },
]

export default function ArtisanProfilePage() {
  const [activeTab, setActiveTab] = useState<'about' | 'reviews' | 'rates'>('about')
  const [showBooking, setShowBooking] = useState(false)
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [bookingDesc, setBookingDesc] = useState('')
  const [bookingAddress, setBookingAddress] = useState('')
  const [bookingSent, setBookingSent] = useState(false)

  const a = DEMO_ARTISAN

  const handleBooking = () => {
    if (bookingDate && bookingTime && bookingAddress) {
      setBookingSent(true)
      setTimeout(() => {
        setShowBooking(false)
        setBookingSent(false)
      }, 3000)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0D0D12; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
        @keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 60, background: 'rgba(9,9,15,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '0.5px solid #1e1e2a',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
      }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, background: '#C9A84C', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 500, color: '#0D0D12',
            fontFamily: 'Cormorant Garamond, Georgia, serif',
          }}>B</div>
          <span style={{ fontSize: 16, fontWeight: 500, color: '#F0EDE8', letterSpacing: '0.08em' }}>BETI</span>
        </a>
        <a href="/" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: '#666', textDecoration: 'none',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Retour
        </a>
      </nav>

      <div style={{ paddingTop: 60, minHeight: '100vh', background: '#0D0D12' }}>

        {/* Hero profil */}
        <div style={{
          background: '#09090f', borderBottom: '0.5px solid #1e1e2a',
          padding: '48px 32px 40px',
        }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28, flexWrap: 'wrap' }}>

              {/* Avatar */}
              <div style={{
                width: 88, height: 88, borderRadius: '50%',
                background: a.color + '22', border: `2px solid ${a.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 30, fontWeight: 500, color: a.color,
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                flexShrink: 0,
              }}>
                {a.initials}
              </div>

              {/* Infos principales */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                  <h1 style={{
                    fontFamily: 'Cormorant Garamond, Georgia, serif',
                    fontSize: 32, fontWeight: 500, color: '#F0EDE8',
                  }}>{a.full_name}</h1>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 12px', borderRadius: 20,
                    background: a.is_available ? '#0a2010' : '#1a1010',
                    border: `0.5px solid ${a.is_available ? '#0a3a20' : '#2a1010'}`,
                    fontSize: 11, fontWeight: 500,
                    color: a.is_available ? '#4ade80' : '#666',
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: a.is_available ? '#4ade80' : '#444' }} />
                    {a.is_available ? 'Disponible' : 'Occupé'}
                  </div>
                </div>

                <div style={{ fontSize: 13, color: '#C9A84C', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 12 }}>
                  {a.category.toUpperCase()} · {a.location_city}
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StarRating rating={a.rating_avg} size={13} />
                      <span style={{ fontSize: 16, fontWeight: 500, color: '#F0EDE8' }}>{a.rating_avg}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{a.rating_count} avis</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 500, color: '#F0EDE8' }}>{a.total_missions}</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>Missions</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 500, color: '#F0EDE8' }}>{a.years_experience} ans</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>Expérience</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 500, color: '#F0EDE8' }}>{a.intervention_radius_km} km</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>Rayon</div>
                  </div>
                </div>
              </div>

              {/* Prix + CTA */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ marginBottom: 16 }}>
                  <span style={{
                    fontFamily: 'Cormorant Garamond, Georgia, serif',
                    fontSize: 36, fontWeight: 500, color: '#C9A84C',
                  }}>{a.hourly_rate} €</span>
                  <span style={{ fontSize: 13, color: '#555' }}>/heure</span>
                </div>
                <button
                  onClick={() => setShowBooking(true)}
                  style={{
                    padding: '14px 28px', background: '#C9A84C',
                    border: 'none', borderRadius: 12,
                    color: '#0D0D12', fontSize: 15, fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Réserver maintenant
                </button>
              </div>
            </div>

            {/* Badge certifié */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              marginTop: 20, padding: '7px 14px', borderRadius: 8,
              background: '#1a1508', border: '0.5px solid #2a2010',
            }}>
              <div style={{
                width: 18, height: 18, background: '#C9A84C', borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 500, color: '#0D0D12',
                fontFamily: 'Cormorant Garamond, Georgia, serif',
              }}>B</div>
              <span style={{ fontSize: 11, color: '#C9A84C', letterSpacing: '0.06em', fontWeight: 500 }}>
                ARTISAN BETI CERTIFIÉ
              </span>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px' }}>

          {/* Onglets */}
          <div style={{ display: 'flex', borderBottom: '0.5px solid #2a2a3a', marginBottom: 32 }}>
            {(['about', 'reviews', 'rates'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '12px 24px', background: 'transparent', border: 'none',
                borderBottom: `2px solid ${activeTab === tab ? '#C9A84C' : 'transparent'}`,
                color: activeTab === tab ? '#C9A84C' : '#555',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
              }}>
                {{ about: 'À propos', reviews: `Avis (${a.rating_count})`, rates: 'Tarifs' }[tab]}
              </button>
            ))}
          </div>

          {/* Onglet À propos */}
          {activeTab === 'about' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 500, color: '#F0EDE8', marginBottom: 12 }}>Présentation</h3>
                <p style={{ fontSize: 14, color: '#666', lineHeight: 1.8, fontWeight: 300 }}>{a.bio}</p>

                <h3 style={{ fontSize: 16, fontWeight: 500, color: '#F0EDE8', margin: '24px 0 12px' }}>Spécialités</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {a.subcategories.map(s => (
                    <span key={s} style={{
                      padding: '5px 12px', borderRadius: 20,
                      background: '#1a1508', border: '0.5px solid #2a2010',
                      fontSize: 12, color: '#C9A84C',
                    }}>{s}</span>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 16, fontWeight: 500, color: '#F0EDE8', marginBottom: 16 }}>Répartition des avis</h3>
                {RATING_DIST.map(r => (
                  <div key={r.stars} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#555', width: 12, textAlign: 'right' }}>{r.stars}</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#C9A84C">
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                    </svg>
                    <div style={{ flex: 1, height: 5, background: '#1e1e2a', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${r.pct}%`, height: '100%', background: '#C9A84C', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#555', width: 32 }}>{r.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Onglet Avis */}
          {activeTab === 'reviews' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {DEMO_REVIEWS.map(r => (
                <div key={r.id} style={{
                  background: '#161620', border: '0.5px solid #2a2a3a',
                  borderRadius: 14, padding: '20px 24px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: '#2a2a3a', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 13, color: '#888',
                      }}>
                        {r.client_name[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#F0EDE8' }}>{r.client_name}</div>
                        <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{r.date}</div>
                      </div>
                    </div>
                    <StarRating rating={r.rating} size={12} />
                  </div>
                  <p style={{ fontSize: 13, color: '#888', lineHeight: 1.7, fontWeight: 300 }}>{r.comment}</p>
                </div>
              ))}
            </div>
          )}

          {/* Onglet Tarifs */}
          {activeTab === 'rates' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {[
                { service: 'Tarif horaire', price: `${a.hourly_rate} €/h`, desc: 'Pour toute intervention standard' },
                { service: 'Déplacement', price: 'Gratuit', desc: 'Dans un rayon de 20 km' },
                { service: 'Urgence nuit', price: '+50%', desc: 'Entre 20h et 8h' },
                { service: 'Devis', price: 'Gratuit', desc: 'Estimation avant intervention' },
              ].map(t => (
                <div key={t.service} style={{
                  background: '#161620', border: '0.5px solid #2a2a3a',
                  borderRadius: 14, padding: '20px',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 500, color: '#C9A84C', marginBottom: 6,
                    fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
                    {t.price}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#F0EDE8', marginBottom: 6 }}>{t.service}</div>
                  <div style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>{t.desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal réservation */}
      {showBooking && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, zIndex: 200, animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{
            background: '#161620', border: '0.5px solid #2a2a3a',
            borderRadius: 20, padding: '36px', maxWidth: 480, width: '100%',
            animation: 'slideUp 0.3s ease',
          }}>
            {bookingSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <h3 style={{
                  fontFamily: 'Cormorant Garamond, Georgia, serif',
                  fontSize: 24, color: '#F0EDE8', marginBottom: 10,
                }}>Demande envoyée !</h3>
                <p style={{ fontSize: 13, color: '#555' }}>
                  {a.full_name} va vous répondre dans les plus brefs délais.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                  <h2 style={{
                    fontFamily: 'Cormorant Garamond, Georgia, serif',
                    fontSize: 24, fontWeight: 500, color: '#F0EDE8',
                  }}>Réserver {a.full_name}</h2>
                  <button onClick={() => setShowBooking(false)} style={{
                    background: 'transparent', border: 'none',
                    color: '#555', cursor: 'pointer', fontSize: 20,
                  }}>✕</button>
                </div>

                {[
                  { label: 'DATE', type: 'date', value: bookingDate, setter: setBookingDate },
                  { label: 'HEURE', type: 'time', value: bookingTime, setter: setBookingTime },
                  { label: 'ADRESSE', type: 'text', value: bookingAddress, setter: setBookingAddress, placeholder: '12 rue de la Paix, Paris' },
                ].map(f => (
                  <div key={f.label} style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 8, fontWeight: 500, letterSpacing: '0.05em' }}>
                      {f.label}
                    </label>
                    <input
                      type={f.type}
                      value={f.value}
                      placeholder={f.placeholder}
                      onChange={e => f.setter(e.target.value)}
                      style={{
                        width: '100%', padding: '13px 16px',
                        background: '#0D0D12', border: '0.5px solid #2a2a3a',
                        borderRadius: 10, color: '#F0EDE8', fontSize: 14,
                        outline: 'none', fontFamily: 'DM Sans, sans-serif',
                      }}
                    />
                  </div>
                ))}

                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 8, fontWeight: 500, letterSpacing: '0.05em' }}>
                    DESCRIPTION (optionnel)
                  </label>
                  <textarea
                    value={bookingDesc}
                    onChange={e => setBookingDesc(e.target.value)}
                    placeholder="Décrivez votre problème..."
                    rows={3}
                    style={{
                      width: '100%', padding: '13px 16px',
                      background: '#0D0D12', border: '0.5px solid #2a2a3a',
                      borderRadius: 10, color: '#F0EDE8', fontSize: 14,
                      outline: 'none', fontFamily: 'DM Sans, sans-serif',
                      resize: 'none',
                    }}
                  />
                </div>

                <button onClick={handleBooking} style={{
                  width: '100%', padding: '14px',
                  background: '#C9A84C', border: 'none', borderRadius: 10,
                  color: '#0D0D12', fontSize: 15, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                }}>
                  Envoyer la demande
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
