'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { toE164 } from '@/lib/countryCodes'
import { CountryPicker } from '@/components/CountryPicker'
import { LogoMark } from '@/components/Logo'
import OtpInput from '@/components/OtpInput'
import { UserRound, Hammer, Check } from 'lucide-react'

const race = <T,>(p: PromiseLike<T>, ms = 15000): Promise<T> =>
  Promise.race([Promise.resolve(p), new Promise<T>((_, r) => setTimeout(() => r(new Error('Délai dépassé')), ms))])

export default function SignupPage() {
  const router = useRouter()
  const { t, isAr } = useLang()

  const [step, setStep] = useState(1) // 1 rôle · 2 infos · 3 code
  const [role, setRole] = useState<'client' | 'artisan' | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cc, setCc] = useState('+213')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [phoneErr, setPhoneErr] = useState('')
  const [cooldown, setCooldown] = useState(0)

  const [okMsg, setOkMsg] = useState('')

  const fullPhone = toE164(cc, phone)
  const canSend = Boolean(name.trim() && phone.replace(/\D/g, '').length >= 6 && !phoneErr)

  // Compte à rebours avant de pouvoir renvoyer un code
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown(c => c - 1), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  const checkPhone = async () => {
    if (phone.replace(/\D/g, '').length < 6) return
    setPhoneErr('')
    try {
      const { data } = await race(supabase.from('profiles').select('id').eq('phone', fullPhone).limit(1))
      if (data && data.length > 0) setPhoneErr(t('auth.phoneUsed'))
    } catch {}
  }

  const sendCode = async () => {
    if (!canSend || !role) return
    setLoading(true); setErr('')
    try {
      const { error } = await race(supabase.auth.signInWithOtp({
        phone: fullPhone,
        options: { shouldCreateUser: true, channel: 'whatsapp', data: { full_name: name.trim(), role, phone: fullPhone, email: email.trim() || null } },
      }))
      if (error) {
        const m = error.message
        setErr(/already registered|exists/i.test(m) ? t('auth.phoneUsed') : t('auth.errSend') + m)
        setLoading(false); return
      }
      setStep(3); setCode(''); setCooldown(30); setLoading(false)
    } catch (e: any) { setErr(e.message); setLoading(false) }
  }

  const verifyCode = async (v?: string) => {
    const token = (v ?? code).trim()
    if (token.replace(/\D/g, '').length < 4 || !role) return
    setLoading(true); setErr('')
    try {
      const { data, error } = await race(supabase.auth.verifyOtp({ phone: fullPhone, token, type: 'sms' }))
      if (error) { setErr(/expired|invalid|incorrect/i.test(error.message) ? t('auth.errCode') : error.message); setLoading(false); return }
      const uid = data.user?.id
      if (uid) {
        try { await race(supabase.from('profiles').upsert({ id: uid, full_name: name.trim(), phone: fullPhone, role }, { onConflict: 'id' })) } catch {}
        if (role === 'artisan') {
          try { await race(supabase.from('artisans').upsert({ id: uid, category: 'plomberie', hourly_rate: 0, is_available: false, rating_avg: 0, rating_count: 0, total_missions: 0 }, { onConflict: 'id' })) } catch {}
        }
      }
      router.push(role === 'artisan' ? '/artisan-dashboard/profil' : '/mon-espace')
      router.refresh()
    } catch (e: any) { setErr(e.message); setLoading(false) }
  }

  return (
    <div className="auth-scope" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', direction: isAr ? 'rtl' : 'ltr' }}>
      <style>{AUTH_CSS}</style>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/" aria-label="BETI — accueil" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, minHeight: 44 }}>
            <div style={{ width: 38, height: 38, background: 'var(--accent)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 0 var(--accent-ink)' }}><LogoMark size={20} variant="white" /></div>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)', letterSpacing: '0.08em' }}>BETI</span>
          </a>
        </div>

        <div role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step} aria-label={`Étape ${step} sur 3`} style={{ display: 'flex', gap: 6, marginBottom: 28, justifyContent: 'center' }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 4, width: 48, borderRadius: 2, background: i <= step ? 'var(--accent)' : 'var(--border2)', transition: 'background 0.4s ease' }} />)}
        </div>

        {/* zIndex > overlay (40) : l'animation transform crée un stacking context qui
            piégerait sinon le dropdown pays sous l'overlay de fermeture */}
        <div key={okMsg ? 'ok' : step} className="anim-scale-in card" style={{ padding: 'clamp(26px, 6vw, 40px) clamp(20px, 5vw, 34px)', position: 'relative', zIndex: 41 }}>

          {okMsg ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'color-mix(in srgb, var(--success) 12%, transparent)', border: '2px solid color-mix(in srgb, var(--success) 30%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                <Check size={26} color="var(--success)" strokeWidth={2.5} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>{okMsg}</div>
              <a href="/auth/login" className="btn-primary btn-lg" style={{ marginTop: 12 }}>{t('auth.signIn')}</a>
            </div>
          ) : (<>

          {/* ── Étape 1 : rôle ── */}
          {step === 1 && (
            <>
              <h1 style={{ fontSize: 'clamp(24px, 6.5vw, 28px)', fontWeight: 800, color: 'var(--tx)', marginBottom: 8, textAlign: 'center', lineHeight: 1.2 }}>{t('auth.welcome2')}</h1>
              <p style={{ fontSize: 13.5, color: 'var(--tx2)', marginBottom: 28, textAlign: 'center', lineHeight: 1.5 }}>{t('auth.youAre2')}</p>
              <div role="radiogroup" aria-label={t('auth.youAre2')}>
              {[{ v: 'client', tt: t('auth.clientT'), d: t('auth.clientD'), Icon: UserRound }, { v: 'artisan', tt: t('auth.artisanT'), d: t('auth.artisanD'), Icon: Hammer }].map(o => {
                const active = role === o.v
                return (
                  <button type="button" role="radio" aria-checked={active} key={o.v} onClick={() => setRole(o.v as any)} className="press" style={{
                    display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'start', font: 'inherit', color: 'inherit', minHeight: 72,
                    padding: '16px 18px', borderRadius: 'var(--r-card)', cursor: 'pointer', marginBottom: 10,
                    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    background: active ? 'color-mix(in srgb, var(--accent) 7%, transparent)' : 'var(--glass-surface-2)',
                    boxShadow: active ? '0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent)' : 'none',
                    transition: 'border-color .2s ease, background .2s ease, box-shadow .25s ease',
                  }}>
                    <div style={{
                      flexShrink: 0, width: 42, height: 42, borderRadius: 11,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: active ? 'var(--gradient)' : 'var(--glass-surface)',
                      border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
                      boxShadow: active ? '0 2px 0 var(--accent-ink)' : 'none',
                      transition: 'background .2s ease, box-shadow .25s ease',
                    }}>
                      <o.Icon size={20} color={active ? '#fff' : 'var(--tx2)'} strokeWidth={1.9} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 2 }}>{o.tt}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--tx2)', lineHeight: 1.45 }}>{o.d}</div>
                    </div>
                    <div style={{
                      flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: active ? 'var(--accent)' : 'transparent',
                      border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border2)'}`,
                      transition: 'background .2s ease, border-color .2s ease',
                    }}>
                      {active && <Check size={12} color="#fff" strokeWidth={3} />}
                    </div>
                  </button>
                )
              })}
              </div>
              <button onClick={() => role && setStep(2)} disabled={!role} className="btn-primary btn-block btn-lg" style={{ marginTop: 4 }}>{t('auth.continueBtn')}</button>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--tx2)', marginTop: 20 }}>{t('auth.alreadyAccount')} <a href="/auth/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700, display: 'inline-block', padding: '12px 2px' }}>{t('auth.signIn')}</a></p>
            </>
          )}

          {/* ── Étape 2 : infos (téléphone) ── */}
          {step === 2 && (
            <>
              <h1 style={{ fontSize: 'clamp(22px, 6vw, 26px)', fontWeight: 800, color: 'var(--tx)', marginBottom: 8, textAlign: 'center', lineHeight: 1.2 }}>{t('auth.accountTitle')}</h1>
              <p style={{ fontSize: 13.5, color: 'var(--tx2)', marginBottom: 24, textAlign: 'center', lineHeight: 1.5 }}>{t('auth.accountSub')} <span style={{ color: 'var(--success)', fontWeight: 700 }}>WhatsApp</span></p>

              <div style={{ marginBottom: 14 }}>
                <label htmlFor="su-name" style={LBL}>{t('auth.fullName')} *</label>
                <input id="su-name" type="text" autoComplete="name" className="field" placeholder="Karim Benali" value={name} onChange={e => setName(e.target.value)} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label htmlFor="su-phone" style={LBL}>{t('auth.phoneLabel')} *</label>
                <div style={{ display: 'flex' }}>
                  <CountryPicker value={cc} onChange={v => { setCc(v); setPhoneErr('') }} />
                  <input id="su-phone" type="tel" autoComplete="tel-national" inputMode="tel" aria-invalid={!!phoneErr} aria-describedby={phoneErr ? 'su-phone-err' : undefined} className="field" placeholder="555 12 34 56" value={phone} onChange={e => { setPhone(e.target.value); setPhoneErr('') }} onBlur={checkPhone}
                    style={{ flex: 1, minWidth: 0, borderStartStartRadius: 0, borderEndStartRadius: 0, fontSize: 15, padding: '15px 16px', borderColor: phoneErr ? 'var(--danger)' : undefined }} />
                </div>
                {phoneErr && <p id="su-phone-err" role="alert" className="anim-scale-in" style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, marginTop: 6 }}>{phoneErr}</p>}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label htmlFor="su-email" style={LBL}>{t('auth.email')} <span style={{ color: 'var(--tx2)', fontWeight: 400 }}>{t('auth.emailOptional')}</span></label>
                <input id="su-email" type="email" autoComplete="email" inputMode="email" className="field" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              {err && <Err msg={err} />}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(1)} className="btn-ghost btn-lg" style={{ flex: 1 }}>{t('auth.back')}</button>
                <button onClick={sendCode} disabled={!canSend || loading} className="btn-primary btn-lg" style={{ flex: 2 }}>{loading ? t('auth.sending') : t('auth.receiveCode')}</button>
              </div>
            </>
          )}

          {/* ── Étape 3 : code ── */}
          {step === 3 && (
            <>
              <h1 style={{ fontSize: 'clamp(22px, 6vw, 26px)', fontWeight: 800, color: 'var(--tx)', marginBottom: 8, textAlign: 'center', lineHeight: 1.2 }}>{t('auth.codeTitle')}</h1>
              <p style={{ fontSize: 13.5, color: 'var(--tx2)', marginBottom: 24, textAlign: 'center', lineHeight: 1.5 }}>{t('auth.codeSentOn')} <span style={{ color: 'var(--success)', fontWeight: 700 }}>WhatsApp</span> {t('auth.codeTo')} <span style={{ color: 'var(--tx)', fontWeight: 700 }} dir="ltr">{cc} {phone}</span></p>
              <OtpInput value={code} onChange={v => { setCode(v); setErr('') }} onComplete={v => !loading && verifyCode(v)} />
              {err && <div style={{ marginTop: 16 }}><Err msg={err} /></div>}
              <button onClick={() => verifyCode()} disabled={loading || code.length < 4} className="btn-primary btn-block btn-lg" style={{ marginTop: 20 }}>{loading ? t('auth.creatingAccount') : t('auth.create')}</button>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 14 }}>
                <button onClick={() => { setStep(2); setCode(''); setErr('') }} style={LINK}>{t('auth.modify')}</button>
                <button onClick={sendCode} disabled={loading || cooldown > 0} style={{ ...LINK, color: cooldown > 0 ? 'var(--tx2)' : 'var(--accent)', fontWeight: 700, cursor: cooldown > 0 ? 'default' : 'pointer' }}>
                  {t('auth.resend')}{cooldown > 0 ? ` (${cooldown}s)` : ''}
                </button>
              </div>
            </>
          )}

          </>)}
        </div>
      </div>
    </div>
  )
}

// Focus clavier visible (le design system n'en fournit pas encore pour les boutons/liens).
const AUTH_CSS = `.auth-scope :is(a,button,[role=radio]):focus-visible{outline:2px solid var(--accent);outline-offset:2px}`
const LBL: React.CSSProperties = { fontSize: 12, color: 'var(--tx2)', display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.02em' }
const LINK: React.CSSProperties = { background: 'transparent', border: 'none', borderRadius: 'var(--r-btn)', color: 'var(--tx2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 44, padding: '10px 12px' }
function Err({ msg }: { msg: string }) {
  return <div role="alert" className="anim-scale-in" style={{ padding: '11px 15px', borderRadius: 'var(--r-field)', marginBottom: 16, background: 'color-mix(in srgb, var(--danger) 9%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', fontSize: 13, lineHeight: 1.5, color: 'var(--danger)', fontWeight: 600 }}>{msg}</div>
}
