'use client'

// app/onboarding/page.tsx
// Tunnel d'onboarding artisan — 5 étapes après inscription

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { ArtisanZonePicker } from '@/components/ArtisanZonePicker'
import { CategoryIcon } from '@/components/icons'
import { Check, User, Wrench, Wallet, MapPin, PartyPopper, CheckCircle2, Rocket } from 'lucide-react'
import { LogoMark } from '@/components/Logo'



// Libellés traduits au rendu via t('categories.*')
const CATEGORIES = [
  { id: 'plomberie',    color: '#3b82f6' },
  { id: 'electricite',  color: '#f59e0b' },
  { id: 'menage',       color: '#10b981' },
  { id: 'demenagement', color: '#1E6FD6' },
  { id: 'jardinage',    color: '#22c55e' },
  { id: 'peinture',     color: '#ef4444' },
  { id: 'serrurerie',   color: '#f97316' },
  { id: 'informatique', color: '#175CC4' },
  { id: 'coiffure',     color: '#ec4899' },
  { id: 'autre',        color: '#6BA3E6' },
]

const LBL: React.CSSProperties = { fontSize: 12, color: 'var(--tx2)', fontWeight: 700, letterSpacing: '0.02em', display: 'block', marginBottom: 8 }

export default function OnboardingPage() {
  const router = useRouter()
  const { t, isAr } = useLang()
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
      // phone → profiles ; bio → artisans (c'est là que tout le reste la lit)
      await supabase.from('profiles').update({ phone }).eq('id', user.id)
      await supabase.from('artisans').update({ bio }).eq('id', user.id)
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

  const STEPS = [
    { id: 1, label: t('onboarding.stepProfile'),  Icon: User },
    { id: 2, label: t('onboarding.stepCategory'), Icon: Wrench },
    { id: 3, label: t('onboarding.stepRate'),      Icon: Wallet },
    { id: 4, label: t('onboarding.stepZone'),      Icon: MapPin },
    { id: 5, label: t('onboarding.stepDone'),      Icon: PartyPopper },
  ]

  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes checkIn{0%{transform:scale(0) rotate(-45deg)}80%{transform:scale(1.2) rotate(5deg)}100%{transform:scale(1) rotate(0)}}
        .onb-scope :is(a,button,[role=radio]):focus-visible{outline:2px solid var(--accent);outline-offset:2px}
        .onb-step-label{font-size:11px;line-height:1.2;text-align:center;white-space:nowrap}
        @media (max-width:479px){.onb-step-label{display:none}}
      `}</style>

      <div className="onb-scope" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>

        {/* Grille fond */}
        <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(var(--grid-glow) 1px,transparent 1px),linear-gradient(90deg,var(--grid-glow) 1px,transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }}/>

        <div style={{ width: '100%', maxWidth: 560, position: 'relative', direction: isAr ? 'rtl' : 'ltr' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, background: 'var(--accent)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 0 var(--accent-ink)' }}><LogoMark size={19} variant="white" /></div>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx)', letterSpacing: '.1em' }}>BETI</span>
            </div>
          </div>

          {/* Stepper */}
          <ol aria-label={`Étape ${step} sur ${STEPS.length}`} style={{ display: 'flex', alignItems: 'center', marginBottom: 32, listStyle: 'none' }}>
            {STEPS.map((s, i) => (
              <li key={s.id} aria-current={step === s.id ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, transition: 'all 0.3s',
                    background: step > s.id ? 'var(--accent)' : step === s.id ? 'color-mix(in srgb, var(--accent) 10%, var(--bg2))' : 'var(--bg2)',
                    border: step >= s.id ? '1.5px solid var(--accent)' : '1.5px solid var(--border2)',
                    color: step > s.id ? '#fff' : step === s.id ? 'var(--accent)' : 'var(--tx2)',
                  }}>
                    {step > s.id ? <Check size={15}/> : <s.Icon size={15}/>}
                  </div>
                  <span className="onb-step-label" style={{ color: step >= s.id ? 'var(--accent)' : 'var(--tx2)', fontWeight: step === s.id ? 800 : 500 }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div aria-hidden style={{ flex: 1, height: 2, background: step > s.id ? 'var(--accent)' : 'var(--border2)', margin: '0 4px', alignSelf: 'flex-start', marginTop: 17, transition: 'background 0.3s' }}/>
                )}
              </li>
            ))}
          </ol>

          {/* Card */}
          <div className="card" style={{ padding: 'clamp(22px, 6vw, 36px)', animation: 'slideUp 0.3s ease' }}>

            {/* ÉTAPE 1 — Profil */}
            {step === 1 && (
              <>
                <div className="section-label">{t('onboarding.step1Eyebrow')}</div>
                <h2 style={{ fontSize: 'clamp(22px, 6vw, 26px)', lineHeight: 1.2, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>{t('onboarding.step1Title')}</h2>
                <p style={{ fontSize: 14, color: 'var(--tx2)', marginBottom: 28, lineHeight: 1.6 }}>{t('onboarding.step1Desc')}</p>
                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="onb-phone" style={LBL}>{t('onboarding.phoneLabel')}</label>
                  <input id="onb-phone" type="tel" autoComplete="tel" inputMode="tel" placeholder={t('onboarding.phonePh')} value={phone} onChange={e => setPhone(e.target.value)} className="field"
                  />
                </div>
                <div style={{ marginBottom: 28 }}>
                  <label htmlFor="onb-bio" style={LBL}>{t('onboarding.bioLabel')}</label>
                  <textarea id="onb-bio" placeholder={t('onboarding.bioPh')} value={bio} onChange={e => setBio(e.target.value)} rows={4} className="field" style={{ resize: 'none' }}
                  />
                </div>
              </>
            )}

            {/* ÉTAPE 2 — Catégorie */}
            {step === 2 && (
              <>
                <div className="section-label">{t('onboarding.step2Eyebrow')}</div>
                <h2 style={{ fontSize: 'clamp(22px, 6vw, 26px)', lineHeight: 1.2, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>{t('onboarding.step2Title')}</h2>
                <p style={{ fontSize: 14, color: 'var(--tx2)', marginBottom: 24, lineHeight: 1.6 }}>{t('onboarding.step2Desc')}</p>
                <div role="radiogroup" aria-label={t('onboarding.step2Title')} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                  {CATEGORIES.map(cat => {
                    const on = category === cat.id
                    return (
                    <button type="button" role="radio" aria-checked={on} key={cat.id} onClick={() => setCategory(cat.id)}
                      style={{ padding: '12px 14px', minHeight: 56, borderRadius: 'var(--r-field)', cursor: 'pointer', font: 'inherit', textAlign: 'start', border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'color-mix(in srgb, var(--accent) 8%, var(--bg2))' : 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 10, transition: 'border-color .15s, background .15s' }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `color-mix(in srgb, ${cat.color} ${on ? 18 : 10}%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CategoryIcon id={cat.id} size={16} color={cat.color}/></div>
                      <span style={{ fontSize: 13, fontWeight: on ? 800 : 500, color: on ? 'var(--tx)' : 'var(--tx2)', minWidth: 0 }}>{t(`categories.${cat.id}`)}</span>
                      {on && <Check size={15} color="var(--accent)" strokeWidth={2.5} style={{ marginInlineStart: 'auto', flexShrink: 0 }}/>}
                    </button>
                  )})}
                </div>
              </>
            )}

            {/* ÉTAPE 3 — Tarif */}
            {step === 3 && (
              <>
                <div className="section-label">{t('onboarding.step3Eyebrow')}</div>
                <h2 style={{ fontSize: 'clamp(22px, 6vw, 26px)', lineHeight: 1.2, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>{t('onboarding.step3Title')}</h2>
                <p style={{ fontSize: 14, color: 'var(--tx2)', marginBottom: 28, lineHeight: 1.6 }}>{t('onboarding.step3Desc')}</p>

                {/* Slider tarif */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                    <label htmlFor="onb-rate" style={{ ...LBL, marginBottom: 0 }}>{t('onboarding.hourlyLabel')}</label>
                    <div className="num" style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>{hourlyRate.toLocaleString('fr-DZ')} <span style={{ fontSize: 14, color: 'var(--tx2)', fontWeight: 400 }}>DA/h</span></div>
                  </div>
                  <input id="onb-rate" type="range" min={500} max={15000} step={500} value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value))}
                    style={{ width: '100%', minHeight: 32, accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{t('onboarding.priceMin')}</span>
                    <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{t('onboarding.priceMax')}</span>
                  </div>
                </div>

                {/* Référence prix marché */}
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-field)', padding: '14px 16px', marginBottom: 24 }}>
                  <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 800, marginBottom: 10 }}>{t('onboarding.marketPrices')}</div>
                  {[
                    { label: 'Plombier', range: '2 500 — 5 000 DA/h' },
                    { label: 'Électricien', range: '3 000 — 6 000 DA/h' },
                    { label: 'Ménage', range: '1 500 — 3 000 DA/h' },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12.5, color: 'var(--tx2)' }}>{r.label}</span>
                      <span className="num" style={{ fontSize: 12.5, color: 'var(--tx)', fontWeight: 600 }}>{r.range}</span>
                    </div>
                  ))}
                </div>

                {/* Expérience */}
                <div>
                  <div id="onb-exp" style={{ ...LBL, marginBottom: 12 }}>{t('onboarding.expLabel')}</div>
                  <div role="radiogroup" aria-labelledby="onb-exp" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[1, 2, 3, 5, 7, 10, 15, 20].map(y => (
                      <button type="button" role="radio" aria-checked={experience === y} key={y} onClick={() => setExperience(y)}
                        className={experience === y ? 'chip chip-active' : 'chip'} style={{ minHeight: 44 }}
                      >{y} {t('onboarding.yearSuffix')}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ÉTAPE 4 — Zone */}
            {step === 4 && (
              <>
                <div className="section-label">{t('onboarding.step4Eyebrow')}</div>
                <h2 style={{ fontSize: 'clamp(22px, 6vw, 26px)', lineHeight: 1.2, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>{t('onboarding.step4Title')}</h2>
                <p style={{ fontSize: 14, color: 'var(--tx2)', marginBottom: 24, lineHeight: 1.6 }}>{t('onboarding.step4Desc')}</p>
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
                <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center', animation: 'checkIn 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}><PartyPopper size={60} color="var(--success)"/></div>
                <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--tx)', marginBottom: 12 }}>{t('onboarding.successTitle')}</h2>
                <p style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.7, marginBottom: 28 }}>
                  {t('onboarding.successDesc')}
                  <br/><br/>
                  <strong style={{ color: 'var(--accent)' }}>{t('onboarding.earlyBadge')}</strong>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
                  {[
                    { Icon: CheckCircle2, label: t('onboarding.recapProfile') },
                    { Icon: MapPin,       label: t('onboarding.recapZone') },
                    { Icon: Wallet,       label: t('onboarding.recapRate') },
                    { Icon: Wrench,       label: t('onboarding.recapCategory') },
                  ].map(item => (
                    <div key={item.label} style={{ padding: '12px', borderRadius: 'var(--r-field)', background: 'color-mix(in srgb, var(--success) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 28%, transparent)', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'start' }}>
                      <item.Icon size={16} color="var(--success)" style={{ flexShrink: 0 }}/>
                      <span style={{ fontSize: 13, color: 'var(--tx)', fontWeight: 600 }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Boutons navigation */}
            <div style={{ display: 'flex', gap: 10, marginTop: step === 4 ? 20 : 0 }}>
              {step > 1 && step < 5 && (
                <button onClick={() => setStep(s => s - 1)} className="btn-ghost" style={{ flex: 1, minHeight: 46 }}
                >{t('onboarding.back')}</button>
              )}
              <button onClick={saveStep} disabled={saving || (step === 2 && !category)} className="btn-primary" style={{ flex: 2, minHeight: 46 }}
              >
                {saving ? t('onboarding.saving') : step === 5 ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Rocket size={15}/>{t('onboarding.goDashboard')}</span> : step === 4 ? t('onboarding.finish') : t('onboarding.continue')}
              </button>
            </div>

            {step < 5 && (
              <button onClick={() => setStep(s => s + 1)}
                style={{ width: '100%', minHeight: 44, marginTop: 8, background: 'transparent', border: 'none', borderRadius: 'var(--r-btn)', color: 'var(--tx2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >{t('onboarding.skip')}</button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}


