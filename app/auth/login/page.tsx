'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { safeNext } from '@/lib/safeNext'
import { toE164 } from '@/lib/countryCodes'
import { EMAIL_OTP_LENGTH, NO_ACCOUNT_RE, normalizeEmail, isValidEmail, suggestEmail } from '@/lib/emailAuth'
import { CountryPicker } from '@/components/CountryPicker'
import { LogoMark } from '@/components/Logo'
import OtpInput, { withTimeout as race, authErrorKey } from '@/components/OtpInput'
import { logError } from '@/lib/logError'

type Mode = 'email' | 'phone' | 'password'
const MODE_KEY = 'beti-login-mode'

export default function LoginPage() {
  const router = useRouter()
  const { t, isAr } = useLang()

  // Clients : code reçu par e-mail (gratuit). Artisans : code téléphone (numéro vérifié).
  // Le dernier mode utilisé est retenu : un compte existant retrouve son mode.
  const [mode, setMode] = useState<Mode>('email')
  const [step, setStep] = useState<'enter' | 'code'>('enter')
  const [cc, setCc] = useState('+213')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [info, setInfo] = useState('')

  const fullPhone = toE164(cc, phone)
  const cleanEmail = normalizeEmail(email)
  const emailOk = isValidEmail(cleanEmail)
  const suggestion = emailOk ? suggestEmail(cleanEmail) : null
  const codeLen = mode === 'email' ? EMAIL_OTP_LENGTH : 6

  useEffect(() => {
    try {
      const m = localStorage.getItem(MODE_KEY)
      if (m === 'phone') setMode('phone')
    } catch { /* stockage indisponible : mode par défaut */ }
  }, [])

  // Compte à rebours avant de pouvoir renvoyer un code
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown(c => c - 1), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  const remember = (m: 'email' | 'phone') => { try { localStorage.setItem(MODE_KEY, m) } catch { /* ignoré */ } }

  const switchMode = (m: Mode) => {
    if (m === mode) return
    setMode(m); setStep('enter'); setCode(''); setErr(''); setInfo('')
    if (m !== 'password') remember(m)
  }

  const getNext = () => safeNext(new URLSearchParams(window.location.search).get('next'))

  const redirectByRole = async () => {
    try {
      const { data: { user } } = await race(supabase.auth.getUser())
      if (!user) { setErr(t('auth.errLogin')); return }
      const next = getNext()
      if (next) { router.push(next); router.refresh(); return }
      try {
        const { data: p } = await race(supabase.from('profiles').select('role').eq('id', user.id).single())
        if (p?.role === 'artisan') router.push('/artisan-dashboard')
        else if (p?.role === 'admin') router.push('/admin')
        else router.push('/mon-espace')
      } catch (e) { logError('login.roleLookup', e); router.push('/mon-espace') } // repli volontaire : /mon-espace redirige selon le rôle
      router.refresh()
    } catch (e) { setErr(t(`auth.${authErrorKey(e)}`)) }
  }

  // ── Téléphone (artisans) ──
  const sendPhoneCode = async () => {
    if (phone.replace(/\D/g, '').length < 6) { setErr(t('auth.errInvalidPhone')); return }
    if (loading) return
    const resend = step === 'code'
    setLoading(true); setErr(''); setInfo('')
    const send = (channel: 'whatsapp' | 'sms') => race(supabase.auth.signInWithOtp({ phone: fullPhone, options: { shouldCreateUser: false, channel } }))
    try {
      let { error } = await send('whatsapp')
      let viaSms = false
      // WhatsApp indisponible : repli SMS (sauf compte inexistant / limite de débit)
      if (error && !NO_ACCOUNT_RE.test(error.message) && !/rate limit|too many|security purposes/i.test(error.message)) {
        const r = await send('sms')
        if (!r.error) { error = null; viaSms = true } else error = r.error
      }
      if (error) {
        setErr(NO_ACCOUNT_RE.test(error.message) ? t('auth.errNoAccount') : t(`auth.${authErrorKey(error)}`))
        setLoading(false); return
      }
      setStep('code'); setCode(''); setCooldown(30); setLoading(false)
      setInfo(viaSms ? t('auth.smsFallback') : resend ? t('auth.codeResent') : '')
    } catch (e) { setErr(t(`auth.${authErrorKey(e)}`)); setLoading(false) }
  }

  const verifyPhoneCode = async (v?: string) => {
    const token = (v ?? code).trim()
    if (loading) return
    if (token.replace(/\D/g, '').length < codeLen) { setErr(t('auth.errCodeShort')); return }
    setLoading(true); setErr('')
    try {
      const { error } = await race(supabase.auth.verifyOtp({ phone: fullPhone, token, type: 'sms' }))
      if (error) { setErr(t(`auth.${authErrorKey(error)}`)); setCode(''); setLoading(false); return }
      remember('phone')
      await redirectByRole()
      setLoading(false)
    } catch (e) { setErr(t(`auth.${authErrorKey(e)}`)); setLoading(false) }
  }

  // ── E-mail (clients) ──
  const sendEmailCode = async () => {
    if (!emailOk) { setErr(t('cxm.errEmailInvalid')); return }
    if (loading) return
    const resend = step === 'code'
    setLoading(true); setErr(''); setInfo('')
    try {
      const { error } = await race(supabase.auth.signInWithOtp({ email: cleanEmail, options: { shouldCreateUser: false } }))
      if (error) {
        setErr(NO_ACCOUNT_RE.test(error.message) ? t('cxm.errNoAccountEmail') : t(`auth.${authErrorKey(error)}`))
        setLoading(false); return
      }
      setEmail(cleanEmail)
      setStep('code'); setCode(''); setCooldown(30); setLoading(false)
      setInfo(resend ? t('auth.codeResent') : '')
    } catch (e) { logError('login.emailSend', e); setErr(t(`auth.${authErrorKey(e)}`)); setLoading(false) }
  }

  const verifyEmailCode = async (v?: string) => {
    const token = (v ?? code).trim()
    if (loading) return
    if (token.replace(/\D/g, '').length < EMAIL_OTP_LENGTH) { setErr(t('auth.errCodeShort')); return }
    setLoading(true); setErr('')
    try {
      const { error } = await race(supabase.auth.verifyOtp({ email: cleanEmail, token, type: 'email' }))
      if (error) { setErr(t(`auth.${authErrorKey(error)}`)); setCode(''); setLoading(false); return }
      remember('email')
      await redirectByRole()
      setLoading(false)
    } catch (e) { logError('login.emailVerify', e); setErr(t(`auth.${authErrorKey(e)}`)); setLoading(false) }
  }

  // ── Mot de passe (comptes existants, admin) ──
  const loginPassword = async () => {
    if (!email || !pw || loading) return
    setLoading(true); setErr('')
    try {
      const { error } = await race(supabase.auth.signInWithPassword({ email: email.trim(), password: pw }))
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

  const isEmail = mode === 'email'
  const sendCode = isEmail ? sendEmailCode : sendPhoneCode
  const verify = isEmail ? verifyEmailCode : verifyPhoneCode
  const resendBtn = (
    <button onClick={sendCode} disabled={loading || cooldown > 0} style={{ ...LINK, marginTop: 0, width: 'auto', color: cooldown > 0 ? 'var(--tx2)' : 'var(--accent)', fontWeight: 700, cursor: cooldown > 0 ? 'default' : 'pointer' }}>
      {cooldown > 0 ? `${t('auth.resendIn')} ${cooldown}s` : t('auth.resend')}
    </button>
  )

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

          {/* ── Mot de passe (repli) ── */}
          {mode === 'password' ? (
            <>
              <h1 style={H1}>{t('cxm.pwTitle')}</h1>
              <p style={SUB}>{t('cxm.pwSub')}</p>
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="login-email" style={LBL}>{t('auth.email')}</label>
                <input id="login-email" type="email" dir="ltr" autoComplete="email" inputMode="email" className="field" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label htmlFor="login-pw" style={LBL}>{t('auth.password')}</label>
                <input id="login-pw" type="password" dir="ltr" autoComplete="current-password" className="field" placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && loginPassword()} />
              </div>
              {err && <Err msg={err} />}
              <button onClick={loginPassword} disabled={loading || !email || !pw} className="btn-primary btn-block btn-lg">{loading ? t('auth.connecting') : t('auth.connect')}</button>
              {(!email || !pw) && !loading && <p className="field-hint" role="status">{t('cxu.hintEmail')}</p>}
              <button onClick={() => switchMode('email')} style={LINK}>{t('cxm.backToCode')}</button>
            </>
          ) : step === 'enter' ? (
            <>
              <h1 style={{ ...H1, fontSize: 'clamp(24px, 6.5vw, 28px)' }}>{t('auth.loginTitle')}</h1>
              <div role="tablist" aria-label={t('cxm.tabsLabel')} className="auth-tabs" style={{ marginBottom: 22 }}>
                <button type="button" role="tab" id="tab-email" aria-selected={isEmail} onClick={() => switchMode('email')}>{t('cxm.tabEmail')}</button>
                <button type="button" role="tab" id="tab-phone" aria-selected={!isEmail} onClick={() => switchMode('phone')}>{t('cxm.tabPhone')}</button>
              </div>

              {isEmail ? (
                <div role="tabpanel" aria-labelledby="tab-email">
                  <p style={{ ...SUB, marginBottom: 22 }}>{t('cxm.loginEmailSub')}</p>
                  <label htmlFor="login-mail" style={LBL}>{t('cxm.emailLabel')}</label>
                  <input id="login-mail" type="email" dir="ltr" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} className="field" placeholder={t('cxm.emailPh')}
                    value={email} onChange={e => { setEmail(e.target.value); setErr('') }} onKeyDown={e => e.key === 'Enter' && sendEmailCode()} style={{ marginBottom: 6 }} />
                  {suggestion && <Suggest t={t} suggestion={suggestion} onUse={() => setEmail(suggestion)} />}
                  <div style={{ height: 14 }} />
                  {err && <Err msg={err} />}
                  <button onClick={sendEmailCode} disabled={loading || !emailOk} className="btn-primary btn-block btn-lg">{loading ? t('auth.sending') : t('cxm.sendEmailCode')}</button>
                  {!emailOk && !loading && <p className="field-hint" role="status">{t('cxm.hintEmail')}</p>}
                </div>
              ) : (
                <div role="tabpanel" aria-labelledby="tab-phone">
                  <p style={{ ...SUB, marginBottom: 22 }}>{t('cxm.loginPhoneSub')} <span style={{ color: 'var(--success)', fontWeight: 700 }}>WhatsApp</span></p>
                  <label htmlFor="login-phone" style={LBL}>{t('auth.phoneLabel')}</label>
                  <div style={{ display: 'flex', marginBottom: 20 }}>
                    <CountryPicker value={cc} onChange={setCc} />
                    <input id="login-phone" type="tel" autoComplete="tel-national" inputMode="tel" className="field" placeholder="555 12 34 56" value={phone} onChange={e => { setPhone(e.target.value); setErr('') }} onKeyDown={e => e.key === 'Enter' && sendPhoneCode()}
                      style={{ flex: 1, minWidth: 0, borderStartStartRadius: 0, borderEndStartRadius: 0, fontSize: 15, padding: '15px 16px' }} />
                  </div>
                  {err && <Err msg={err} />}
                  <button onClick={sendPhoneCode} disabled={loading || phone.length < 6} className="btn-primary btn-block btn-lg">{loading ? t('auth.sending') : t('auth.receiveCode')}</button>
                  {phone.length < 6 && !loading && <p className="field-hint" role="status">{t('cxu.hintPhone')}</p>}
                </div>
              )}

              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--tx2)', marginTop: 20 }}>{t('auth.noAccount')} <a href="/auth/signup" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700, display: 'inline-block', padding: '12px 2px' }}>{t('auth.register')}</a></p>
              <button onClick={() => switchMode('password')} style={{ ...LINK, marginTop: 4 }}>{t('cxm.pwLink')}</button>
            </>
          ) : (
            <>
              <h1 style={{ ...H1, fontSize: 'clamp(22px, 6vw, 26px)' }}>{isEmail ? t('cxm.codeEmailTitle') : t('auth.codeTitle')}</h1>
              <p style={{ ...SUB, marginBottom: 24 }}>
                {isEmail
                  ? <>{t('cxm.codeEmailSent')} <span style={{ color: 'var(--tx)', fontWeight: 700, overflowWrap: 'anywhere' }} dir="ltr">{cleanEmail}</span></>
                  : <>{t('auth.codeSentOn')} <span style={{ color: 'var(--success)', fontWeight: 700 }}>WhatsApp</span> {t('auth.codeTo')} <span style={{ color: 'var(--tx)', fontWeight: 700 }} dir="ltr">{cc} {phone}</span></>}
              </p>
              <OtpInput length={codeLen} value={code} onChange={v => { setCode(v); setErr(''); setInfo('') }} onComplete={v => !loading && verify(v)} />
              {err && <div style={{ marginTop: 16 }}><Err msg={err} /></div>}
              {!err && info && <p role="status" style={{ marginTop: 14, fontSize: 13, lineHeight: 1.5, textAlign: 'center', color: 'var(--tx2)', fontWeight: 600 }}>{info}</p>}
              <button onClick={() => verify()} disabled={loading || code.length < codeLen} className="btn-primary btn-block btn-lg" style={{ marginTop: 20 }}>{loading ? t('auth.verifying') : t('auth.validate')}</button>
              {code.length < codeLen && !loading && <p className="field-hint" role="status">{isEmail ? t('cxm.codeEmailHint') : t('cxu.hintCode')}</p>}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 14 }}>
                <button onClick={() => { setStep('enter'); setCode(''); setErr(''); setInfo('') }} style={{ ...LINK, marginTop: 0, width: 'auto' }}>{isEmail ? t('cxm.changeEmail') : t('auth.changeNumber')}</button>
                {resendBtn}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Focus clavier visible + onglets (aplat accent sous texte blanc = AA, comme .btn-primary).
const AUTH_CSS = `.auth-scope :is(a,button,[role=radio],[role=tab]):focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:calc(var(--r-btn) + 4px);background:var(--bg3);border:1px solid var(--border)}
.auth-tabs button{min-height:44px;border:0;border-radius:var(--r-btn);background:transparent;color:var(--tx2);font:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:background .2s ease,color .2s ease}
.auth-tabs button[aria-selected=true]{background:var(--accent-fill);color:var(--on-accent)}`
const H1: React.CSSProperties = { fontWeight: 800, color: 'var(--tx)', marginBottom: 8, textAlign: 'center', lineHeight: 1.2, fontSize: 'clamp(22px, 6vw, 26px)' }
const SUB: React.CSSProperties = { fontSize: 13.5, color: 'var(--tx2)', marginBottom: 24, textAlign: 'center', lineHeight: 1.5 }
const LBL: React.CSSProperties = { fontSize: 12, color: 'var(--tx2)', display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.02em' }
const LINK: React.CSSProperties = { width: '100%', minHeight: 44, padding: '10px 12px', marginTop: 12, background: 'transparent', border: 'none', borderRadius: 'var(--r-btn)', color: 'var(--tx2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
function Err({ msg }: { msg: string }) {
  return <div role="alert" className="anim-scale-in" style={{ padding: '11px 15px', borderRadius: 'var(--r-field)', marginBottom: 16, background: 'color-mix(in srgb, var(--danger) 9%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', fontSize: 13, lineHeight: 1.5, color: 'var(--danger)', fontWeight: 600 }}>{msg}</div>
}
// Avertissement doux (ne bloque pas) sur une faute de domaine fréquente.
function Suggest({ t, suggestion, onUse }: { t: (k: string) => string; suggestion: string; onUse: () => void }) {
  return (
    <p role="status" style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--tx2)', margin: '6px 0 0' }}>
      {t('cxm.didYouMean')} <strong dir="ltr" style={{ color: 'var(--tx)', overflowWrap: 'anywhere' }}>{suggestion}</strong> ?{' '}
      <button type="button" onClick={onUse} style={{ background: 'none', border: 'none', padding: '10px 6px', minHeight: 44, color: 'var(--accent)', font: 'inherit', fontWeight: 700, cursor: 'pointer' }}>{t('cxm.useSuggestion')}</button>
    </p>
  )
}
