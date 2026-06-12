'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { toE164 } from '@/lib/countryCodes'
import { CountryPicker } from '@/components/CountryPicker'

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

  // Repli email/mot de passe (le flux téléphone nécessite un provider SMS configuré)
  const [emailMode, setEmailMode] = useState(false)
  const [pw, setPw] = useState('')
  const [okMsg, setOkMsg] = useState('')

  const fullPhone = toE164(cc, phone)
  const canSend = Boolean(name.trim() && phone.replace(/\D/g, '').length >= 6 && !phoneErr)

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
      setStep(3); setLoading(false)
    } catch (e: any) { setErr(e.message); setLoading(false) }
  }

  const verifyCode = async () => {
    if (code.replace(/\D/g, '').length < 4 || !role) return
    setLoading(true); setErr('')
    try {
      const { data, error } = await race(supabase.auth.verifyOtp({ phone: fullPhone, token: code.trim(), type: 'sms' }))
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

  const signUpEmail = async () => {
    if (!name.trim() || !email || pw.length < 6 || !role) return
    setLoading(true); setErr('')
    try {
      const { data, error } = await race(supabase.auth.signUp({ email, password: pw, options: { data: { full_name: name.trim(), role, phone: phone ? fullPhone : null } } }))
      if (error) {
        const m = error.message
        setErr(/registered|exists/i.test(m) ? t('auth.emailUsed') : m.includes('valid email') ? 'Email invalide' : m.includes('least 6') ? t('auth.pwPh') : 'Erreur : ' + m)
        setLoading(false); return
      }
      if (!data.session) { setOkMsg(t('auth.okCreated')); setLoading(false); return }
      const uid = data.user?.id
      if (uid) {
        try { await race(supabase.from('profiles').upsert({ id: uid, full_name: name.trim(), phone: phone ? fullPhone : null, role }, { onConflict: 'id' })) } catch {}
        if (role === 'artisan') { try { await race(supabase.from('artisans').upsert({ id: uid, category: 'plomberie', hourly_rate: 0, is_available: false, rating_avg: 0, rating_count: 0, total_missions: 0 }, { onConflict: 'id' })) } catch {} }
      }
      router.push(role === 'artisan' ? '/artisan-dashboard/profil' : '/mon-espace'); router.refresh()
    } catch (e: any) { setErr(e.message); setLoading(false) }
  }

  const I: React.CSSProperties = { width: '100%', padding: '13px 16px', background: 'var(--bg3,#0e0e18)', border: '1px solid var(--border,#1c1c30)', borderRadius: 10, color: 'var(--tx,#e0dfe5)', fontSize: 14, outline: 'none', fontFamily: 'Nexa,sans-serif', fontWeight: 300 }
  const BTN = (active: boolean): React.CSSProperties => ({ width: '100%', padding: 14, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: active && !loading ? 'pointer' : 'not-allowed', fontFamily: 'Nexa,sans-serif', background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--border)', color: active ? '#fff' : 'var(--tx3)' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, direction: isAr ? 'rtl' : 'ltr' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div className="anim-float" style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', boxShadow: '0 6px 20px rgba(99,102,241,0.35)' }}>B</div>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)', letterSpacing: '0.08em' }}>BETI</span>
          </a>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 28, justifyContent: 'center' }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 3, width: 48, borderRadius: 2, background: i <= step ? '#6366f1' : 'var(--border)', transition: 'background 0.4s ease' }} />)}
        </div>

        {/* zIndex > overlay (40) : l'animation transform crée un stacking context qui
            piégerait sinon le dropdown pays sous l'overlay de fermeture */}
        <div key={okMsg ? 'ok' : step} className="anim-scale-in" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: '36px 32px', boxShadow: 'var(--card-shadow)', position: 'relative', zIndex: 41 }}>

          {okMsg ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#10b98115', border: '2px solid #10b98133', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>{okMsg}</div>
              <a href="/auth/login" style={{ display: 'inline-block', marginTop: 12, padding: '12px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>{t('auth.signIn')}</a>
            </div>
          ) : (<>

          {/* ── Étape 1 : rôle ── */}
          {step === 1 && (
            <>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>{t('auth.welcome2')}</h1>
              <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 28 }}>{t('auth.youAre2')}</p>
              {[{ v: 'client', tt: t('auth.clientT'), d: t('auth.clientD') }, { v: 'artisan', tt: t('auth.artisanT'), d: t('auth.artisanD') }].map(o => (
                <div key={o.v} onClick={() => setRole(o.v as any)} style={{ padding: '16px 18px', borderRadius: 12, cursor: 'pointer', border: `1px solid ${role === o.v ? '#6366f1' : 'var(--border)'}`, background: role === o.v ? '#6366f10d' : 'var(--bg3)', marginBottom: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 2 }}>{o.tt}</div>
                  <div style={{ fontSize: 12, color: 'var(--tx2)' }}>{o.d}</div>
                </div>
              ))}
              <button onClick={() => role && setStep(2)} style={BTN(!!role)}>{t('auth.continueBtn')}</button>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--tx2)', marginTop: 20 }}>{t('auth.alreadyAccount')} <a href="/auth/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 700 }}>{t('auth.signIn')}</a></p>
            </>
          )}

          {/* ── Étape 2 : infos (téléphone) ── */}
          {step === 2 && !emailMode && (
            <>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>{t('auth.accountTitle')}</h1>
              <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 24 }}>{t('auth.accountSub')} <span style={{ color: '#25D366', fontWeight: 700 }}>WhatsApp</span></p>

              <div style={{ marginBottom: 14 }}>
                <label style={LBL}>{t('auth.fullName')}</label>
                <input type="text" placeholder="Karim Benali" value={name} onChange={e => setName(e.target.value)} style={I} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={LBL}>{t('auth.phoneLabel')} *</label>
                <div style={{ display: 'flex' }}>
                  <CountryPicker value={cc} onChange={v => { setCc(v); setPhoneErr('') }} />
                  <input type="tel" placeholder="555 12 34 56" value={phone} onChange={e => { setPhone(e.target.value); setPhoneErr('') }} onBlur={checkPhone} style={{ ...I, borderRadius: '0 10px 10px 0', flex: 1, borderColor: phoneErr ? '#ef4444' : undefined }} />
                </div>
                {phoneErr && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>{phoneErr}</p>}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={LBL}>{t('auth.email')} <span style={{ color: 'var(--tx3)', fontWeight: 300 }}>{t('auth.emailOptional')}</span></label>
                <input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} style={I} />
              </div>

              {err && <Err msg={err} />}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: 14, borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--tx2)', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa,sans-serif' }}>{t('auth.back')}</button>
                <button onClick={sendCode} disabled={!canSend || loading} style={{ ...BTN(canSend), flex: 2 }}>{loading ? t('auth.sending') : t('auth.receiveCode')}</button>
              </div>
              <button onClick={() => { setEmailMode(true); setErr('') }} style={{ ...LINK, width: '100%', marginTop: 14 }}>{t('auth.emailSignupLink')}</button>
            </>
          )}

          {/* ── Étape 2 : infos (email — repli) ── */}
          {step === 2 && emailMode && (
            <>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>{t('auth.emailSignupTitle')}</h1>
              <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 24 }}>{t('auth.createYour')} {role === 'artisan' ? t('auth.artisanT') : t('auth.clientT')}</p>
              <div style={{ marginBottom: 14 }}>
                <label style={LBL}>{t('auth.fullName')}</label>
                <input type="text" placeholder="Karim Benali" value={name} onChange={e => setName(e.target.value)} style={I} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={LBL}>{t('auth.email')}</label>
                <input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} style={I} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={LBL}>{t('auth.password')}</label>
                <input type="password" placeholder={t('auth.pwPh')} value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && signUpEmail()} style={I} />
              </div>
              {err && <Err msg={err} />}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setEmailMode(false); setErr('') }} style={{ flex: 1, padding: 14, borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--tx2)', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa,sans-serif' }}>{t('auth.back')}</button>
                <button onClick={signUpEmail} disabled={loading || !name.trim() || !email || pw.length < 6} style={{ ...BTN(!!(name.trim() && email && pw.length >= 6)), flex: 2 }}>{loading ? t('auth.creating') : t('auth.create')}</button>
              </div>
            </>
          )}

          {/* ── Étape 3 : code ── */}
          {step === 3 && (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>{t('auth.codeTitle')}</h1>
              <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 24 }}>{t('auth.codeSentOn')} <span style={{ color: '#25D366', fontWeight: 700 }}>WhatsApp</span> {t('auth.codeTo')} <span style={{ color: 'var(--tx)', fontWeight: 700 }} dir="ltr">{cc} {phone}</span></p>
              <input type="tel" inputMode="numeric" autoFocus placeholder="––––––" value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr('') }} onKeyDown={e => e.key === 'Enter' && verifyCode()}
                style={{ ...I, textAlign: 'center', fontSize: 28, fontWeight: 800, letterSpacing: '0.4em', padding: '16px' }} />
              {err && <div style={{ marginTop: 16 }}><Err msg={err} /></div>}
              <button onClick={verifyCode} disabled={loading || code.length < 4} style={{ ...BTN(code.length >= 4), marginTop: 16 }}>{loading ? t('auth.creatingAccount') : t('auth.create')}</button>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                <button onClick={() => { setStep(2); setCode(''); setErr('') }} style={LINK}>{t('auth.modify')}</button>
                <button onClick={sendCode} disabled={loading} style={{ ...LINK, color: '#6366f1', textAlign: 'right' }}>{t('auth.resend')}</button>
              </div>
            </>
          )}

          </>)}
        </div>
      </div>
    </div>
  )
}

const LBL: React.CSSProperties = { fontSize: 11, color: 'var(--tx2)', display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.04em' }
const LINK: React.CSSProperties = { background: 'transparent', border: 'none', color: 'var(--tx2)', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa,sans-serif' }
function Err({ msg }: { msg: string }) {
  return <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#ef444412', border: '1px solid #ef444422', fontSize: 13, color: '#ef4444' }}>{msg}</div>
}
