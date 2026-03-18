'use client'

// app/onboarding/page.tsx
// Tunnel d'onboarding artisan — 5 étapes après inscription

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ArtisanZonePicker } from '@/components/ArtisanZonePicker'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CATEGORIES = [
  { id: 'plomberie',    icon: '⚙',  label: 'Plomberie',    color: '#3b82f6' },
  { id: 'electricite',  icon: '⚡',  label: 'Électricité',  color: '#f59e0b' },
  { id: 'menage',       icon: '✦',  label: 'Ménage',        color: '#10b981' },
  { id: 'demenagement', icon: '◈',  label: 'Déménagement',  color: '#8b5cf6' },
  { id: 'jardinage',    icon: '❧',  label: 'Jardinage',     color: '#22c55e' },
  { id: 'peinture',     icon: '◉',  label: 'Peinture',      color: '#ef4444' },
  { id: 'serrurerie',   icon: '⌘',  label: 'Serrurerie',    color: '#f97316' },
  { id: 'informatique', icon: '⬡',  label: 'Informatique',  color: '#6366f1' },
  { id: 'coiffure',     icon: '✂',  label: 'Coiffure',      color: '#ec4899' },
  { id: 'autre',        icon: '✳',  label: 'Autre',         color: '#a78bfa' },
]

const STEPS = [
  { id: 1, label: 'Profil',      icon: '👤' },
  { id: 2, label: 'Catégorie',   icon: '🔧' },
  { id: 3, label: 'Tarif',       icon: '💰' },
  { id: 4, label: 'Zone',        icon: '📍' },
  { id: 5, label: 'Terminé',     icon: '🎉' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [user, setUser] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  // Form data
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [experience, setExperience] = useState(1)
  const [category, setCategory] = useState('')
  const [hourlyRate, setHourlyRate] = useState(3000)
  const [zoneData, setZoneData] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/login'); return }
      setUser(data.user)
      // Vérifier si déjà onboardé
      const { data: art } = await supabase.from('artisans').select('category, hourly_rate').eq('id', data.user.id).single()
      if (art?.category && art?.hourly_rate) router.push('/artisan-dashboard')
    })
  }, [])

  const saveStep = async () => {
    if (!user) return
    setSaving(true)
    if (step === 1) {
      await supabase.from('profiles').update({ bio, phone }).eq('id', user.id)
    } else if (step === 2) {
      await supabase.from('artisans').update({ category }).eq('id', user.id)
    } else if (step === 3) {
      await supabase.from('artisans').update({ hourly_rate: hourlyRate, years_experience: experience }).eq('id', user.id)
    } else if (step === 4) {
      if (zoneData) {
        await supabase.from('artisans').update({
          intervention_radius_km: zoneData.radius,
          location_city: zoneData.address?.split(',')[0] || '',
          lat: zoneData.lat, lng: zoneData.lng,
          is_available: true,
        }).eq('id', user.id)
      }
    }
    setSaving(false)
    if (step < 5) setStep(s => s + 1)
    else router.push('/artisan-dashboard')
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes checkIn{0%{transform:scale(0) rotate(-45deg)}80%{transform:scale(1.2) rotate(5deg)}100%{transform:scale(1) rotate(0)}}
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0D0D12;font-family:Nexa,sans-serif}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', fontFamily: 'Nexa, sans-serif' }}>

        {/* Grille fond */}
        <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(201,168,76,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.03) 1px,transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }}/>

        <div style={{ width: '100%', maxWidth: 560, position: 'relative' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, background: '#C9A84C', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#0D0D12' }}>B</div>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#F0EDE8', letterSpacing: '.1em' }}>BETI</span>
            </div>
          </div>

          {/* Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, transition: 'all 0.3s',
                    background: step > s.id ? '#C9A84C' : step === s.id ? '#1a1508' : '#161620',
                    border: step >= s.id ? '1.5px solid #C9A84C' : '1.5px solid #2a2a3a',
                    color: step > s.id ? '#0D0D12' : step === s.id ? '#C9A84C' : '#555',
                  }}>
                    {step > s.id ? '✓' : s.icon}
                  </div>
                  <span style={{ fontSize: 10, color: step >= s.id ? '#C9A84C' : '#444', fontWeight: step === s.id ? 800 : 300 }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 1.5, background: step > s.id ? '#C9A84C' : '#2a2a3a', margin: '0 4px', marginBottom: 20, transition: 'background 0.3s' }}/>
                )}
              </div>
            ))}
          </div>

          {/* Card */}
          <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 20, padding: '36px', animation: 'slideUp 0.3s ease' }}>

            {/* ÉTAPE 1 — Profil */}
            {step === 1 && (
              <>
                <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '.1em', fontWeight: 800, marginBottom: 8 }}>ÉTAPE 1 / 4</div>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#F0EDE8', marginBottom: 8 }}>Parlez de vous</h2>
                <p style={{ fontSize: 13, color: '#555', fontWeight: 300, marginBottom: 28, lineHeight: 1.6 }}>Ces informations seront visibles par les clients sur votre profil.</p>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>TÉLÉPHONE</label>
                  <input type="tel" placeholder="0555 12 34 56" value={phone} onChange={e => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '13px 16px', background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#F0EDE8', fontSize: 14, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}
                  />
                </div>
                <div style={{ marginBottom: 28 }}>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>BIO (optionnel)</label>
                  <textarea placeholder="Ex: Plombier professionnel avec 10 ans d'expérience à Alger. Intervention rapide et soignée..." value={bio} onChange={e => setBio(e.target.value)} rows={4}
                    style={{ width: '100%', padding: '13px 16px', background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#F0EDE8', fontSize: 13, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300, resize: 'none', lineHeight: 1.6 }}
                  />
                </div>
              </>
            )}

            {/* ÉTAPE 2 — Catégorie */}
            {step === 2 && (
              <>
                <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '.1em', fontWeight: 800, marginBottom: 8 }}>ÉTAPE 2 / 4</div>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#F0EDE8', marginBottom: 8 }}>Votre métier</h2>
                <p style={{ fontSize: 13, color: '#555', fontWeight: 300, marginBottom: 24, lineHeight: 1.6 }}>Choisissez votre spécialité principale. Vous pourrez en ajouter d'autres plus tard.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {CATEGORIES.map(cat => (
                    <div key={cat.id} onClick={() => setCategory(cat.id)}
                      style={{ padding: '14px 16px', borderRadius: 12, cursor: 'pointer', border: `0.5px solid ${category === cat.id ? cat.color : '#2a2a3a'}`, background: category === cat.id ? cat.color + '12' : '#0D0D12', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s' }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: category === cat.id ? cat.color + '28' : '#1e1e2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{cat.icon}</div>
                      <span style={{ fontSize: 13, fontWeight: category === cat.id ? 800 : 300, color: category === cat.id ? cat.color : '#888' }}>{cat.label}</span>
                      {category === cat.id && <span style={{ marginLeft: 'auto', color: cat.color }}>✓</span>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ÉTAPE 3 — Tarif */}
            {step === 3 && (
              <>
                <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '.1em', fontWeight: 800, marginBottom: 8 }}>ÉTAPE 3 / 4</div>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#F0EDE8', marginBottom: 8 }}>Votre tarif</h2>
                <p style={{ fontSize: 13, color: '#555', fontWeight: 300, marginBottom: 28, lineHeight: 1.6 }}>Fixez votre tarif horaire. Vous pourrez le modifier à tout moment.</p>

                {/* Slider tarif */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em' }}>TARIF HORAIRE</label>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#C9A84C' }}>{hourlyRate.toLocaleString('fr-DZ')} <span style={{ fontSize: 14, color: '#555', fontWeight: 300 }}>DA/h</span></div>
                  </div>
                  <input type="range" min={500} max={15000} step={500} value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#C9A84C', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: '#444' }}>500 DA</span>
                    <span style={{ fontSize: 11, color: '#444' }}>15 000 DA</span>
                  </div>
                </div>

                {/* Référence prix marché */}
                <div style={{ background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
                  <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, marginBottom: 10 }}>PRIX DU MARCHÉ EN ALGÉRIE</div>
                  {[
                    { label: 'Plombier', range: '2 500 — 5 000 DA/h' },
                    { label: 'Électricien', range: '3 000 — 6 000 DA/h' },
                    { label: 'Ménage', range: '1 500 — 3 000 DA/h' },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid #1e1e2a' }}>
                      <span style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>{r.label}</span>
                      <span style={{ fontSize: 12, color: '#888', fontWeight: 300 }}>{r.range}</span>
                    </div>
                  ))}
                </div>

                {/* Expérience */}
                <div>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 12 }}>ANNÉES D'EXPÉRIENCE</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[1, 2, 3, 5, 7, 10, 15, 20].map(y => (
                      <button key={y} onClick={() => setExperience(y)}
                        style={{ padding: '8px 16px', borderRadius: 10, border: `0.5px solid ${experience === y ? '#C9A84C' : '#2a2a3a'}`, background: experience === y ? '#1a1508' : '#0D0D12', color: experience === y ? '#C9A84C' : '#555', fontSize: 13, fontWeight: experience === y ? 800 : 300, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}
                      >{y} an{y > 1 ? 's' : ''}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ÉTAPE 4 — Zone */}
            {step === 4 && (
              <>
                <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '.1em', fontWeight: 800, marginBottom: 8 }}>ÉTAPE 4 / 4</div>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#F0EDE8', marginBottom: 8 }}>Votre zone</h2>
                <p style={{ fontSize: 13, color: '#555', fontWeight: 300, marginBottom: 24, lineHeight: 1.6 }}>Définissez votre adresse et le rayon dans lequel vous intervenez.</p>
                {user && (
                  <ArtisanZonePicker
                    artisanId={user.id}
                    initialRadius={20}
                    onSave={data => setZoneData(data)}
                  />
                )}
              </>
            )}

            {/* ÉTAPE 5 — Terminé */}
            {step === 5 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 64, marginBottom: 20, animation: 'checkIn 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>🎉</div>
                <h2 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8', marginBottom: 12 }}>Profil complété !</h2>
                <p style={{ fontSize: 14, color: '#555', fontWeight: 300, lineHeight: 1.7, marginBottom: 28 }}>
                  Bienvenue sur BETI ! Votre profil est maintenant visible par les clients dans votre zone.
                  <br/><br/>
                  <strong style={{ color: '#C9A84C' }}>Vous faites partie des 100 premiers artisans BETI — accès gratuit à vie !</strong>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                  {[
                    { icon: '✅', label: 'Profil créé' },
                    { icon: '📍', label: 'Zone définie' },
                    { icon: '💰', label: 'Tarif fixé' },
                    { icon: '🔧', label: 'Catégorie choisie' },
                  ].map(item => (
                    <div key={item.label} style={{ padding: '12px', borderRadius: 10, background: '#0a2010', border: '0.5px solid #4ade8044', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{item.icon}</span>
                      <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 300 }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Boutons navigation */}
            <div style={{ display: 'flex', gap: 10, marginTop: step === 4 ? 20 : 0 }}>
              {step > 1 && step < 5 && (
                <button onClick={() => setStep(s => s - 1)}
                  style={{ flex: 1, padding: '13px', background: 'transparent', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#666', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}
                >← Retour</button>
              )}
              <button onClick={saveStep} disabled={saving || (step === 2 && !category)}
                style={{ flex: 2, padding: '13px', background: saving ? '#a08030' : '#C9A84C', border: 'none', borderRadius: 10, color: '#0D0D12', fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s' }}
              >
                {saving ? 'Sauvegarde...' : step === 5 ? '🚀 Accéder au dashboard' : step === 4 ? 'Terminer' : 'Continuer →'}
              </button>
            </div>

            {step < 5 && (
              <button onClick={() => setStep(s => s + 1)}
                style={{ width: '100%', marginTop: 10, background: 'transparent', border: 'none', color: '#444', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}
              >Passer cette étape →</button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
