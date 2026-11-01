'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { toE164 } from '@/lib/countryCodes'
import { CountryPicker } from '@/components/CountryPicker'
import { LogoMark } from '@/components/Logo'
import OtpInput, { withTimeout as race, authErrorKey } from '@/components/OtpInput'

export default function LoginPage() {
  const router = useRouter()
  const { t, isAr } = useLang()

  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [cc, setCc] = useState('+213')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [info, setInfo] = useState('')

  // Repli email/mot de passe (comptes existants, admin)
  const [emailMode, setEmailMode] = useState(false)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')

  const fullPhone = toE164(cc, phone)

  // Compte à rebours avant de pouvoir renvoyer un code
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown(c => c - 1), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  // Retour à la page d'origine : uniquement un chemin interne (jamais un autre site).
  const safeNext = () => {
    const n = new URLSearchParams(window.location.search).get('next') || ''
    return n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/\\') && !n.startsWith('/auth/') ? n : ''
  }

  const redirectByRole = async () => {
    try {
      const { data: { user } } = await race(supabase.auth.getUser())
      if (!user) { setErr(t('auth.errLogin')); return }
      const next = safeNext()
      if (next) { router.push(next); router.refresh(); return }
      try {
        const { data: p } = await race(supabase.from('profiles').select('role').eq('id', user.id).single())
        if (p?.role === 'artisan') router.push('/artisan-dashboard')
        else if (p?.role === 'admin') router.push('/admin')
        else router.push('/mon-espace')
      } catch { router.push('/mon-espace') }
      router.refresh()
    } catch (e) { setErr(t(`auth.${authErrorKey(e)}`)) }
  }

  const sendCode = async () => {
    if (phone.replace(/\D/g, '').length < 6) { setErr(t('auth.errInvalidPhone')); return }
    if (loading) return
    const resend = step === 'code'
    setLoading(true); setErr(''); setInfo('')
    const send = (channel: 'whatsapp' | 'sms') => race(supabase.auth.signInWithOtp({ phone: fullPhone, options: { shouldCreateUser: false, channel } }))
    const noAcct = /not found|no user|sign.?ups? not allowed|shouldCreateUser/i
    try {
      let { error } = await send('whatsapp')
      let viaSms = false
      // WhatsApp indisponible : repli SMS (sauf compte inexistant / limite de débit)
      if (error && !noAcct.test(error.message) && !/rate limit|too many|security purposes/i.test(error.message)) {
        const r = await send('sms')
        if (!r.error) { error = null; viaSms = true } else error = r.error
      }
      if (error) {
        setErr(noAcct.test(error.message) ? t('auth.errNoAccount') : t(`auth.${authErrorKey(error)}`))
        setLoading(false); return
      }
      setStep('code'); setCode(''); setCooldown(30); setLoading(false)
      setInfo(viaSms ? t('auth.smsFallback') : resend ? t('auth.codeResent') : '')
    } catch (e) { setErr(t(`auth.${authErrorKey(e)}`)); setLoading(false) }
  }

  const verifyCode = async (v?: string) => {
    const token = (v ?? code).trim()
    if (loading) return
    if (token.replace(/\D/g, '').length < 6) { setErr(t('auth.errCodeShort')); return }
    setLoading(true); setErr('')
    try {
      const { error } = await race(supabase.auth.verifyOtp({ phone: fullPhone, token, type: 'sms' }))
      if (error) { setErr(t(`auth.${authErrorKey(error)}`)); setCode(''); setLoading(false); return }
      await redirectByRole()
      setLoading(false)
    } catch (e) { setErr(t(`auth.${authErrorKey(e)}`)); setLoading(false) }
  }

  const loginEmail = async () => {
    if (!email || !pw) return
    setLoading(true); setErr('')
    try {
      const { error } = await race(supabase.auth.signInWithPassword({ email, password: pw }))
      if (error) {
        const m = error.message
        setErr(m.includes('Invalid login') || m.includes('credentials') ? t('auth.errCredentials')
          : m.includes('Email not confirmed') ? t('auth.errConfirmEmail') : t(`auth.${authErrorKey(error)}`))
        setLoading(false); return
      }
      await redirectByRole()
      setLoading(false)
    } catch (e) { setErr(t(`auth.${authErrorKey(e)}`)); setLoading(false) }
  }

  return (
    <div className="auth-scope" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', direction: isAr ? 'rtl' : 'ltr' }}>
      <style>{AUTH_CSS}</style>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <a href="/" aria-label="BETI — accueil" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, minHeight: 44 }}>
            <div style={{ width: 38, height: 38, background: 'var(--accent)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 0 var(--accent-ink)' }}><LogoMark size={20} variant="white" /></div>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)', letterSpacing: '0.08em' }}>BETI</span>
          </a>
        </div>

        {/* zIndex > overlay (40) : l'animation transform crée un stacking context qui
            piégerait sinon le dropdown pays sous l'overlay de fermeture */}
        <div className="anim-scale-in card" style={{ padding: 'clamp(26px, 6vw, 40px) clamp(20px, 5vw, 34px)', position: 'relative', zIndex: 41 }}>

          {/* ── Repli email ── */}
          {emailMode ? (
            <>
              <h1 style={{ fontSize: 'clamp(22px, 6vw, 26px)', fontWeight: 800, color: 'var(--tx)', marginBottom: 8, textAlign: 'center', lineHeight: 1.2 }}>{t('auth.emailLoginTitle')}</h1>
              <p style={{ fontSize: 13.5, color: 'var(--tx2)', marginBottom: 24, textAlign: 'center', lineHeight: 1.5 }}>{t('auth.emailLoginSub')}</p>
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="login-email" style={LBL}>{t('auth.email')}</label>
                <input id="login-email" type="email" autoComplete="email" inputMode="email" className="field" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label htmlFor="login-pw" style={LBL}>{t('auth.password')}</label>
                <input id="login-pw" type="password" autoComplete="current-password" className="field" placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && loginEmail()} />
              </div>
              {err && <Err msg={err} />}
              <button onClick={loginEmail} disabled={loading || !email || !pw} className="btn-primary btn-block btn-lg">{loading ? t('auth.connecting') : t('auth.connect')}</button>
              {(!email || !pw) && !loading && <p className="field-hint" role="status">{t('cxu.hintEmail')}</p>}
              <button onClick={() => { setEmailMode(false); setErr('') }} style={LINK}>{t('auth.backToPhone')}</button>
            </>
          ) : step === 'phone' ? (
            <>
              <h1 style={{ fontSize: 'clamp(24px, 6.5vw, 28px)', fontWeight: 800, color: 'var(--tx)', marginBottom: 8, textAlign: 'center', lineHeight: 1.2 }}>{t('auth.loginTitle')}</h1>
              <p style={{ fontSize: 13.5, color: 'var(--tx2)', marginBottom: 28, textAlign: 'center', lineHeight: 1.5 }}>{t('auth.loginSub')} <span style={{ color: 'var(--success)', fontWeight: 700 }}>WhatsApp</span></p>

              <label htmlFor="login-phone" style={LBL}>{t('auth.phoneLabel')}</label>
              <div style={{ display: 'flex', marginBottom: 20 }}>
                <CountryPicker value={cc} onChange={setCc} />
                <input id="login-phone" type="tel" autoComplete="tel-national" inputMode="tel" className="field" placeholder="555 12 34 56" value={phone} onChange={e => { setPhone(e.target.value); setErr('') }} onKeyDown={e => e.key === 'Enter' && sendCode()}
                  style={{ flex: 1, minWidth: 0, borderStartStartRadius: 0, borderEndStartRadius: 0, fontSize: 15, padding: '15px 16px' }} />
              </div>

              {err && <Err msg={err} />}
              <button onClick={sendCode} disabled={loading || phone.length < 6} className="btn-primary btn-block btn-lg">{loading ? t('auth.sending') : t('auth.receiveCode')}</button>
              {phone.length < 6 && !loading && <p className="field-hint" role="status">{t('cxu.hintPhone')}</p>}

              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--tx2)', marginTop: 20 }}>{t('auth.noAccount')} <a href="/auth/signup" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700, display: 'inline-block', padding: '12px 2px' }}>{t('auth.register')}</a></p>
              <button onClick={() => { setEmailMode(true); setErr('') }} style={{ ...LINK, marginTop: 4 }}>{t('auth.loginByEmail')}</button>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 'clamp(22px, 6vw, 26px)', fontWeight: 800, color: 'var(--tx)', marginBottom: 8, textAlign: 'center', lineHeight: 1.2 }}>{t('auth.codeTitle')}</h1>
              <p style={{ fontSize: 13.5, color: 'var(--tx2)', marginBottom: 24, textAlign: 'center', lineHeight: 1.5 }}>{t('auth.codeSentOn')} <span style={{ color: 'var(--success)', fontWeight: 700 }}>WhatsApp</span> {t('auth.codeTo')} <span style={{ color: 'var(--tx)', fontWeight: 700 }} dir="ltr">{cc} {phone}</span></p>
              <OtpInput value={code} onChange={v => { setCode(v); setErr(''); setInfo('') }} onComplete={v => !loading && verifyCode(v)} />
              {err && <div style={{ marginTop: 16 }}><Err msg={err} /></div>}
              {!err && info && <p role="status" style={{ marginTop: 14, fontSize: 13, lineHeight: 1.5, textAlign: 'center', color: 'var(--tx2)', fontWeight: 600 }}>{info}</p>}
              <button onClick={() => verifyCode()} disabled={loading || code.length < 6} className="btn-primary btn-block btn-lg" style={{ marginTop: 20 }}>{loading ? t('auth.verifying') : t('auth.validate')}</button>
              {code.length < 6 && !loading && <p className="field-hint" role="status">{t('cxu.hintCode')}</p>}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 14 }}>
                <button onClick={() => { setStep('phone'); setCode(''); setErr('') }} style={{ ...LINK, marginTop: 0, width: 'auto' }}>{t('auth.changeNumber')}</button>
                <button onClick={sendCode} disabled={loading || cooldown > 0} style={{ ...LINK, marginTop: 0, width: 'auto', color: cooldown > 0 ? 'var(--tx2)' : 'var(--accent)', fontWeight: 700, cursor: cooldown > 0 ? 'default' : 'pointer' }}>
                  {cooldown > 0 ? `${t('auth.resendIn')} ${cooldown}s` : t('auth.resend')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Focus clavier visible (le design system n'en fournit pas encore pour les boutons/liens).
const AUTH_CSS = `.auth-scope :is(a,button,[role=radio]):focus-visible{outline:2px solid var(--accent);outline-offset:2px}`
const LBL: React.CSSProperties = { fontSize: 12, color: 'var(--tx2)', display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.02em' }
const LINK: React.CSSProperties = { width: '100%', minHeight: 44, padding: '10px 12px', marginTop: 12, background: 'transparent', border: 'none', borderRadius: 'var(--r-btn)', color: 'var(--tx2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
function Err({ msg }: { msg: string }) {
  return <div role="alert" className="anim-scale-in" style={{ padding: '11px 15px', borderRadius: 'var(--r-field)', marginBottom: 16, background: 'color-mix(in srgb, var(--danger) 9%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', fontSize: 13, lineHeight: 1.5, color: 'var(--danger)', fontWeight: 600 }}>{msg}</div>
}
