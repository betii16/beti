'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AddressPicker } from '@/components/AddressPicker'

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

const DEMO_ARTISAN = {
  id: '1', full_name: 'Karim Benali', initials: 'KB', category: 'Plombier',
  color: '#3b82f6', bio: 'Plombier professionnel depuis 10 ans, spécialisé en rénovation et dépannage d\'urgence. Intervention rapide, devis gratuit.',
  years_experience: 10, hourly_rate: 3800, intervention_radius_km: 20,
  location_city: 'Alger', is_available: true, rating_avg: 4.9, rating_count: 84,
  total_missions: 312, subcategories: ['Fuite d\'eau', 'Installation', 'Débouchage', 'Chauffe-eau', 'Urgence'],
}

const DEMO_REVIEWS = [
  { id: 1, client_name: 'Sofiane M.', rating: 5, comment: 'Intervention rapide et très professionnelle. Karim a réglé la fuite en moins d\'une heure.', date: 'Il y a 2 jours' },
  { id: 2, client_name: 'Amina B.', rating: 5, comment: 'Excellent artisan, ponctuel et efficace. Le prix est honnête.', date: 'Il y a 1 semaine' },
  { id: 3, client_name: 'Riad L.', rating: 4, comment: 'Bon travail sur le chauffe-eau. Quelques minutes de retard mais prévenu à l\'avance.', date: 'Il y a 2 semaines' },
]

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

const TIME_SLOTS = [
  { label: 'Matin',      times: ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30'] },
  { label: 'Après-midi', times: ['14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30'] },
  { label: 'Soir',       times: ['18:00','18:30','19:00','19:30'] },
]


export default function ArtisanProfilePage() {
  const [activeTab, setActiveTab] = useState<'about'|'reviews'|'rates'>('about')
  const [showBooking, setShowBooking] = useState(false)
  const [bookingStep, setBookingStep] = useState<1|2|3>(1)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState('')
  const [bookingAddress, setBookingAddress] = useState('')
  const [bookingDesc, setBookingDesc] = useState('')
  const [bookingSent, setBookingSent] = useState(false)
  const [calMonth, setCalMonth] = useState(new Date())

  const a = DEMO_ARTISAN

  const handleBooking = () => {
    if (selectedDate && selectedTime && bookingAddress) {
      setBookingSent(true)
      setTimeout(() => { setShowBooking(false); setBookingSent(false); setBookingStep(1) }, 3000)
    }
  }

  const formatDate = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const canNext = bookingStep === 1 ? (selectedDate !== null && selectedTime !== '') : bookingStep === 2 ? bookingAddress !== '' : true

  return (
    <>
      <style suppressHydrationWarning>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0D0D12; font-family: 'Nexa', sans-serif; -webkit-font-smoothing: antialiased; }
        @keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>

      <div style={{ paddingTop: 52, minHeight: '100vh', background: '#0D0D12' }}>

        {/* Hero */}
        <div style={{ background: '#09090f', borderBottom: '0.5px solid #1e1e2a', padding: '48px 32px 40px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28, flexWrap: 'wrap' }}>

              {/* Avatar */}
              <div style={{ width: 88, height: 88, borderRadius: '50%', background: a.color+'22', border: `2px solid ${a.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800, color: a.color, flexShrink: 0 }}>
                {a.initials}
              </div>

              {/* Infos */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                  <h1 style={{ fontSize: 32, fontWeight: 800, color: '#F0EDE8', fontFamily: 'Nexa, sans-serif' }}>{a.full_name}</h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: a.is_available ? '#0a2010' : '#1a1010', border: `0.5px solid ${a.is_available ? '#0a3a20' : '#2a1010'}`, fontSize: 11, fontWeight: 800, color: a.is_available ? '#4ade80' : '#666' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: a.is_available ? '#4ade80' : '#444' }}/>
                    {a.is_available ? 'Disponible' : 'Occupé'}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#C9A84C', letterSpacing: '0.06em', fontWeight: 800, marginBottom: 12 }}>
                  {a.category.toUpperCase()} · {a.location_city}
                </div>
                <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                  {[
                    { val: <><StarRating rating={a.rating_avg} size={13}/><span style={{marginLeft:6}}>{a.rating_avg}</span></>, label: `${a.rating_count} avis` },
                    { val: a.total_missions, label: 'Missions' },
                    { val: `${a.years_experience} ans`, label: 'Expérience' },
                    { val: `${a.intervention_radius_km} km`, label: 'Rayon' },
                  ].map((s, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', display: 'flex', alignItems: 'center' }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prix + CTA */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: '#C9A84C', fontFamily: 'Nexa, sans-serif' }}>{a.hourly_rate.toLocaleString('fr-DZ')} DA</span>
                  <span style={{ fontSize: 13, color: '#555' }}>/heure</span>
                </div>
                <button onClick={() => { setShowBooking(true); setBookingStep(1) }}
                  style={{ padding: '14px 28px', background: '#C9A84C', border: 'none', borderRadius: 12, color: '#0D0D12', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                  Réserver maintenant
                </button>
              </div>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 20, padding: '7px 14px', borderRadius: 8, background: '#1a1508', border: '0.5px solid #2a2010' }}>
              <div style={{ width: 18, height: 18, background: '#C9A84C', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#0D0D12' }}>B</div>
              <span style={{ fontSize: 11, color: '#C9A84C', letterSpacing: '0.06em', fontWeight: 800 }}>ARTISAN BETI CERTIFIÉ</span>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px' }}>
          <div style={{ display: 'flex', borderBottom: '0.5px solid #2a2a3a', marginBottom: 32 }}>
            {(['about','reviews','rates'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: '12px 24px', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab ? '#C9A84C' : 'transparent'}`, color: activeTab === tab ? '#C9A84C' : '#555', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s' }}>
                {{ about: 'À propos', reviews: `Avis (${a.rating_count})`, rates: 'Tarifs' }[tab]}
              </button>
            ))}
          </div>

          {activeTab === 'about' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F0EDE8', marginBottom: 12 }}>Présentation</h3>
                <p style={{ fontSize: 14, color: '#666', lineHeight: 1.8, fontWeight: 300 }}>{a.bio}</p>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F0EDE8', margin: '24px 0 12px' }}>Spécialités</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {a.subcategories.map(s => <span key={s} style={{ padding: '5px 12px', borderRadius: 20, background: '#1a1508', border: '0.5px solid #2a2010', fontSize: 12, color: '#C9A84C' }}>{s}</span>)}
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F0EDE8', marginBottom: 16 }}>Répartition des avis</h3>
                {[{s:5,p:78},{s:4,p:15},{s:3,p:5},{s:2,p:1},{s:1,p:1}].map(r => (
                  <div key={r.s} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#555', width: 12, textAlign: 'right' }}>{r.s}</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#C9A84C"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                    <div style={{ flex: 1, height: 5, background: '#1e1e2a', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${r.p}%`, height: '100%', background: '#C9A84C', borderRadius: 3 }}/>
                    </div>
                    <span style={{ fontSize: 11, color: '#555', width: 32 }}>{r.p}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {DEMO_REVIEWS.map(r => (
                <div key={r.id} style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#888', fontWeight: 800 }}>{r.client_name[0]}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#F0EDE8' }}>{r.client_name}</div>
                        <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{r.date}</div>
                      </div>
                    </div>
                    <StarRating rating={r.rating} size={12}/>
                  </div>
                  <p style={{ fontSize: 13, color: '#888', lineHeight: 1.7, fontWeight: 300 }}>{r.comment}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'rates' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { service: 'Tarif horaire', price: `${a.hourly_rate.toLocaleString('fr-DZ')} DA/h`, desc: 'Pour toute intervention standard' },
                { service: 'Déplacement',   price: 'Gratuit', desc: `Dans un rayon de ${a.intervention_radius_km} km` },
                { service: 'Urgence nuit',  price: '+50%',    desc: 'Entre 20h et 8h' },
                { service: 'Devis',         price: 'Gratuit', desc: 'Estimation avant intervention' },
              ].map(t => (
                <div key={t.service} style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '20px' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#C9A84C', marginBottom: 6 }}>{t.price}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8', marginBottom: 6 }}>{t.service}</div>
                  <div style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>{t.desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL RÉSERVATION ── */}
      {showBooking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 200, animation: 'fadeIn 0.2s ease' }}>
          <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 24, maxWidth: 520, width: '100%', animation: 'slideUp 0.3s ease', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>

            {bookingSent ? (
              <div style={{ textAlign: 'center', padding: '60px 40px' }}>
                <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: '#F0EDE8', marginBottom: 10, fontFamily: 'Nexa, sans-serif' }}>Demande envoyée !</h3>
                <p style={{ fontSize: 14, color: '#555', fontWeight: 300, lineHeight: 1.7 }}>
                  {a.full_name} va vous répondre dans les plus brefs délais.<br/>
                  {selectedDate && selectedTime && <span style={{ color: '#C9A84C', fontWeight: 800 }}>{formatDate(selectedDate)} à {selectedTime}</span>}
                </p>
              </div>
            ) : (
              <>
                {/* Header modal */}
                <div style={{ padding: '24px 28px', borderBottom: '0.5px solid #1e1e2a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.1em', marginBottom: 4 }}>
                      ÉTAPE {bookingStep}/3
                    </div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F0EDE8', fontFamily: 'Nexa, sans-serif' }}>
                      {bookingStep === 1 ? 'Choisir une date' : bookingStep === 2 ? 'Votre adresse' : 'Confirmer'}
                    </h2>
                  </div>
                  <button onClick={() => setShowBooking(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#2a2a3a', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>

                {/* Progress bar */}
                <div style={{ height: 2, background: '#1e1e2a' }}>
                  <div style={{ height: '100%', background: '#C9A84C', width: `${(bookingStep/3)*100}%`, transition: 'width 0.3s ease' }}/>
                </div>

                <div style={{ padding: '28px' }}>

                  {/* ── ÉTAPE 1 : Calendrier + Heure ── */}
                  {bookingStep === 1 && (
                    <div>
                      {/* Calendrier */}
                      <BookingCalendar
                        selectedDate={selectedDate}
                        onSelect={d => { setSelectedDate(d); setSelectedTime('') }}
                        month={calMonth}
                        onPrevMonth={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth()-1, 1))}
                        onNextMonth={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth()+1, 1))}
                      />

                      {/* Créneaux horaires */}
                      {selectedDate && (
                        <div style={{ marginTop: 24, animation: 'fadeIn 0.3s ease' }}>
                          <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 14 }}>
                            CRÉNEAUX DISPONIBLES — {formatDate(selectedDate).toUpperCase()}
                          </div>
                          {TIME_SLOTS.map(group => (
                            <div key={group.label} style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 10, color: '#555', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 8 }}>{group.label}</div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {group.times.map(t => (
                                  <button key={t} onClick={() => setSelectedTime(t)}
                                    style={{
                                      padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                      background: selectedTime === t ? '#C9A84C' : '#0D0D12',
                                      color: selectedTime === t ? '#0D0D12' : '#888',
                                      fontSize: 13, fontWeight: selectedTime === t ? 800 : 300,
                                      fontFamily: 'Nexa, sans-serif', transition: 'all 0.15s',
                                      boxShadow: selectedTime === t ? '0 0 12px #C9A84C44' : 'none',
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

                  {/* ── ÉTAPE 2 : Adresse ── */}
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

                  {/* ── ÉTAPE 3 : Confirmation ── */}
                  {bookingStep === 3 && (
                    <div>
                      <div style={{ background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
                        {[
                          { icon: '🔧', label: 'Artisan', val: a.full_name },
                          { icon: '📅', label: 'Date',    val: selectedDate ? formatDate(selectedDate) : '' },
                          { icon: '🕐', label: 'Heure',   val: selectedTime },
                          { icon: '📍', label: 'Adresse', val: bookingAddress },
                          { icon: '💰', label: 'Tarif',   val: `${a.hourly_rate.toLocaleString('fr-DZ')} DA/h · Paiement en cash` },
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
  selectedDate: Date | null
  onSelect: (d: Date) => void
  month: Date
  onPrevMonth: () => void
  onNextMonth: () => void
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
