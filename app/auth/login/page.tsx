'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { toE164 } from '@/lib/countryCodes'
import { CountryPicker } from '@/components/CountryPicker'

const race = <T,>(p: PromiseLike<T>, ms = 15000): Promise<T> =>
  Promise.race([Promise.resolve(p), new Promise<T>((_, r) => setTimeout(() => r(new Error('Délai dépassé')), ms))])

export default function LoginPage() {
  const router = useRouter()
  const { t, isAr } = useLang()

  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [cc, setCc] = useState('+213')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  // Repli email/mot de passe (comptes existants, admin)
  const [emailMode, setEmailMode] = useState(false)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')

  const fullPhone = toE164(cc, phone)

  const redirectByRole = async () => {
    try {
      const { data: { user } } = await race(supabase.auth.getUser())
      if (!user) { setErr(t('auth.errLogin')); return }
      try {
        const { data: p } = await race(supabase.from('profiles').select('role').eq('id', user.id).single())
        if (p?.role === 'artisan') router.push('/artisan-dashboard')
        else if (p?.role === 'admin') router.push('/admin')
        else router.push('/mon-espace')
      } catch { router.push('/mon-espace') }
      router.refresh()
    } catch (e: any) { setErr(e.message) }
  }

  const sendCode = async () => {
    if (phone.replace(/\D/g, '').length < 6) { setErr(t('auth.errInvalidPhone')); return }
    setLoading(true); setErr('')
    try {
      const { error } = await race(supabase.auth.signInWithOtp({ phone: fullPhone, options: { shouldCreateUser: false, channel: 'whatsapp' } }))
      if (error) {
        const m = error.message
        setErr(/not found|no user|sign.?ups? not allowed|shouldCreateUser/i.test(m)
          ? t('auth.errNoAccount')
          : t('auth.errSend') + m)
        setLoading(false); return
      }
      setStep('code'); setLoading(false)
    } catch (e: any) { setErr(e.message); setLoading(false) }
  }

  const verifyCode = async () => {
    if (code.replace(/\D/g, '').length < 4) { setErr('Code incomplet'); return }
    setLoading(true); setErr('')
    try {
      const { error } = await race(supabase.auth.verifyOtp({ phone: fullPhone, token: code.trim(), type: 'sms' }))
      if (error) { setErr(/expired|invalid|incorrect/i.test(error.message) ? t('auth.errCode') : error.message); setLoading(false); return }
      await redirectByRole()
      setLoading(false)
    } catch (e: any) { setErr(e.message); setLoading(false) }
  }

  const loginEmail = async () => {
    if (!email || !pw) return
    setLoading(true); setErr('')
    try {
      const { error } = await race(supabase.auth.signInWithPassword({ email, password: pw }))
      if (error) {
        const m = error.message
        setErr(m.includes('Invalid login') || m.includes('credentials') ? t('auth.errCredentials')
          : m.includes('Email not confirmed') ? t('auth.errConfirmEmail') : 'Erreur : ' + m)
        setLoading(false); return
      }
      await redirectByRole()
      setLoading(false)
    } catch (e: any) { setErr(e.message); setLoading(false) }
  }

  const I: React.CSSProperties = { width: '100%', padding: '15px 18px', background: 'var(--bg3,#0e0e18)', border: '1px solid var(--border,#1c1c30)', borderRadius: 16, color: 'var(--tx,#e0dfe5)', fontSize: 15, outline: 'none', fontFamily: 'Nexa,sans-serif', fontWeight: 300 }
  const BTN = (active: boolean): React.CSSProperties => ({ width: '100%', padding: 16, border: 'none', borderRadius: 16, background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--border)', color: active ? '#fff' : 'var(--tx3)', fontSize: 15, fontWeight: 700, cursor: active && !loading ? 'pointer' : 'not-allowed', fontFamily: 'Nexa,sans-serif', marginTop: 4, boxShadow: active ? '0 8px 24px rgba(99,102,241,0.32)' : 'none', transition: 'box-shadow 0.2s, transform 0.1s' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, direction: isAr ? 'rtl' : 'ltr' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div className="anim-float" style={{ width: 38, height: 38, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', boxShadow: '0 6px 20px rgba(99,102,241,0.35)' }}>B</div>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)', letterSpacing: '0.08em' }}>BETI</span>
          </a>
        </div>

        {/* zIndex > overlay (40) : l'animation transform crée un stacking context qui
            piégerait sinon le dropdown pays sous l'overlay de fermeture */}
        <div className="anim-scale-in" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 26, padding: '40px 34px', boxShadow: 'var(--card-shadow)', position: 'relative', zIndex: 41 }}>

          {/* ── Repli email ── */}
          {emailMode ? (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--tx)', marginBottom: 8, textAlign: 'center' }}>{t('auth.emailLoginTitle')}</h1>
              <p style={{ fontSize: 13.5, color: 'var(--tx2)', marginBottom: 24, textAlign: 'center', lineHeight: 1.5 }}>{t('auth.emailLoginSub')}</p>
              <div style={{ marginBottom: 14 }}>
                <label style={LBL}>{t('auth.email')}</label>
                <input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} style={I} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={LBL}>{t('auth.password')}</label>
                <input type="password" placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && loginEmail()} style={I} />
              </div>
              {err && <Err msg={err} />}
              <button onClick={loginEmail} disabled={loading || !email || !pw} style={BTN(!!(email && pw))}>{loading ? t('auth.connecting') : t('auth.connect')}</button>
              <button onClick={() => { setEmailMode(false); setErr('') }} style={LINK}>{t('auth.backToPhone')}</button>
            </>
          ) : step === 'phone' ? (
            <>
              <h1 style={{ fontSize: 27, fontWeight: 800, color: 'var(--tx)', marginBottom: 8, textAlign: 'center' }}>{t('auth.loginTitle')}</h1>
              <p style={{ fontSize: 13.5, color: 'var(--tx2)', marginBottom: 28, textAlign: 'center', lineHeight: 1.5 }}>{t('auth.loginSub')} <span style={{ color: '#25D366', fontWeight: 700 }}>WhatsApp</span></p>

              <label style={LBL}>{t('auth.phoneLabel')}</label>
              <div style={{ display: 'flex', marginBottom: 20 }}>
                <CountryPicker value={cc} onChange={setCc} />
                <input type="tel" placeholder="555 12 34 56" value={phone} onChange={e => { setPhone(e.target.value); setErr('') }} onKeyDown={e => e.key === 'Enter' && sendCode()} style={{ ...I, borderRadius: '0 16px 16px 0', flex: 1 }} />
              </div>

              {err && <Err msg={err} />}
              <button onClick={sendCode} disabled={loading || phone.length < 6} style={BTN(phone.length >= 6)}>{loading ? t('auth.sending') : t('auth.receiveCode')}</button>

              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--tx2)', marginTop: 20 }}>{t('auth.noAccount')} <a href="/auth/signup" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 700 }}>{t('auth.register')}</a></p>
              <button onClick={() => { setEmailMode(true); setErr('') }} style={{ ...LINK, marginTop: 4 }}>{t('auth.loginByEmail')}</button>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--tx)', marginBottom: 8, textAlign: 'center' }}>{t('auth.codeTitle')}</h1>
              <p style={{ fontSize: 13.5, color: 'var(--tx2)', marginBottom: 24, textAlign: 'center', lineHeight: 1.5 }}>{t('auth.codeSentOn')} <span style={{ color: '#25D366', fontWeight: 700 }}>WhatsApp</span> {t('auth.codeTo')} <span style={{ color: 'var(--tx)', fontWeight: 700 }} dir="ltr">{cc} {phone}</span></p>
              <input type="tel" inputMode="numeric" autoFocus placeholder="––––––" value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr('') }} onKeyDown={e => e.key === 'Enter' && verifyCode()}
                style={{ ...I, textAlign: 'center', fontSize: 30, fontWeight: 800, letterSpacing: '0.4em', padding: '18px' }} />
              {err && <div style={{ marginTop: 16 }}><Err msg={err} /></div>}
              <button onClick={verifyCode} disabled={loading || code.length < 4} style={BTN(code.length >= 4)}>{loading ? t('auth.verifying') : t('auth.validate')}</button>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                <button onClick={() => { setStep('phone'); setCode(''); setErr('') }} style={{ ...LINK, marginTop: 0, width: 'auto', textAlign: 'left' }}>{t('auth.changeNumber')}</button>
                <button onClick={sendCode} disabled={loading} style={{ ...LINK, marginTop: 0, width: 'auto', textAlign: 'right', color: '#6366f1' }}>{t('auth.resend')}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const LBL: React.CSSProperties = { fontSize: 11, color: 'var(--tx2)', display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.04em' }
const LINK: React.CSSProperties = { width: '100%', padding: 10, marginTop: 12, background: 'transparent', border: 'none', color: 'var(--tx2)', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa,sans-serif' }
function Err({ msg }: { msg: string }) {
  return <div style={{ padding: '11px 15px', borderRadius: 12, marginBottom: 16, background: '#ef444412', border: '1px solid #ef444422', fontSize: 13, color: '#ef4444' }}>{msg}</div>
}
