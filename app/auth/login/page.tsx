'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { COUNTRY_CODES, toE164 } from '@/lib/countryCodes'

const race = <T,>(p: PromiseLike<T>, ms = 15000): Promise<T> =>
  Promise.race([Promise.resolve(p), new Promise<T>((_, r) => setTimeout(() => r(new Error('Délai dépassé')), ms))])

export default function LoginPage() {
  const router = useRouter()
  const { isAr } = useLang()

  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [cc, setCc] = useState('+213')
  const [showCc, setShowCc] = useState(false)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  // Repli email/mot de passe (comptes existants, admin)
  const [emailMode, setEmailMode] = useState(false)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')

  const sel = COUNTRY_CODES.find(x => x.c === cc) || COUNTRY_CODES[0]
  const fullPhone = toE164(cc, phone)

  const redirectByRole = async () => {
    try {
      const { data: { user } } = await race(supabase.auth.getUser())
      if (!user) { setErr('Connexion échouée'); return }
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
    if (phone.replace(/\D/g, '').length < 6) { setErr('Numéro invalide'); return }
    setLoading(true); setErr('')
    try {
      const { error } = await race(supabase.auth.signInWithOtp({ phone: fullPhone, options: { shouldCreateUser: false } }))
      if (error) {
        const m = error.message
        setErr(/not found|no user|sign.?ups? not allowed|shouldCreateUser/i.test(m)
          ? "Aucun compte avec ce numéro. Inscrivez-vous d'abord."
          : 'Envoi du code impossible : ' + m)
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
      if (error) { setErr(/expired|invalid|incorrect/i.test(error.message) ? 'Code incorrect ou expiré' : error.message); setLoading(false); return }
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
        setErr(m.includes('Invalid login') || m.includes('credentials') ? 'Email ou mot de passe incorrect'
          : m.includes('Email not confirmed') ? "Confirmez votre email d'abord" : 'Erreur : ' + m)
        setLoading(false); return
      }
      await redirectByRole()
      setLoading(false)
    } catch (e: any) { setErr(e.message); setLoading(false) }
  }

  const I: React.CSSProperties = { width: '100%', padding: '13px 16px', background: 'var(--bg3,#0e0e18)', border: '1px solid var(--border,#1c1c30)', borderRadius: 10, color: 'var(--tx,#e0dfe5)', fontSize: 14, outline: 'none', fontFamily: 'Nexa,sans-serif', fontWeight: 300 }
  const BTN = (active: boolean): React.CSSProperties => ({ width: '100%', padding: 14, border: 'none', borderRadius: 10, background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--border)', color: active ? '#fff' : 'var(--tx3)', fontSize: 14, fontWeight: 700, cursor: active && !loading ? 'pointer' : 'not-allowed', fontFamily: 'Nexa,sans-serif', marginTop: 4 })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, direction: isAr ? 'rtl' : 'ltr' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div className="anim-float" style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', boxShadow: '0 6px 20px rgba(99,102,241,0.35)' }}>B</div>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)', letterSpacing: '0.08em' }}>BETI</span>
          </a>
        </div>

        <div className="anim-scale-in" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: '36px 32px', boxShadow: 'var(--card-shadow)' }}>

          {/* ── Repli email ── */}
          {emailMode ? (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>Connexion par email</h1>
              <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 24 }}>Pour les comptes créés avec une adresse email</p>
              <div style={{ marginBottom: 14 }}>
                <label style={LBL}>EMAIL</label>
                <input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} style={I} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={LBL}>MOT DE PASSE</label>
                <input type="password" placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && loginEmail()} style={I} />
              </div>
              {err && <Err msg={err} />}
              <button onClick={loginEmail} disabled={loading || !email || !pw} style={BTN(!!(email && pw))}>{loading ? 'Connexion...' : 'Se connecter'}</button>
              <button onClick={() => { setEmailMode(false); setErr('') }} style={LINK}>← Connexion par téléphone</button>
            </>
          ) : step === 'phone' ? (
            <>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>Connexion</h1>
              <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 28 }}>Entrez votre numéro, on vous envoie un code</p>

              <label style={LBL}>NUMÉRO DE TÉLÉPHONE</label>
              <div style={{ display: 'flex', position: 'relative', marginBottom: 20 }}>
                <button type="button" onClick={() => setShowCc(!showCc)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '13px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRight: 'none', borderRadius: '10px 0 0 10px', cursor: 'pointer', color: 'var(--tx)', fontFamily: 'Nexa,sans-serif', flexShrink: 0, minWidth: 96 }}>
                  <span style={{ fontSize: 18 }}>{sel.f}</span>
                  <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{cc}</span>
                </button>
                {showCc && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', maxHeight: 220, overflowY: 'auto', width: 260, marginTop: 4 }}>
                    {COUNTRY_CODES.map(c => (
                      <div key={c.c + c.n} onClick={() => { setCc(c.c); setShowCc(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '0.5px solid var(--border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <span style={{ fontSize: 18 }}>{c.f}</span>
                        <span style={{ fontSize: 13, color: 'var(--tx)', flex: 1 }}>{c.n}</span>
                        <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{c.c}</span>
                      </div>
                    ))}
                  </div>
                )}
                <input type="tel" placeholder="555 12 34 56" value={phone} onChange={e => { setPhone(e.target.value); setErr('') }} onKeyDown={e => e.key === 'Enter' && sendCode()} style={{ ...I, borderRadius: '0 10px 10px 0' }} />
              </div>

              {err && <Err msg={err} />}
              <button onClick={sendCode} disabled={loading || phone.length < 6} style={BTN(phone.length >= 6)}>{loading ? 'Envoi...' : 'Recevoir le code'}</button>

              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--tx2)', marginTop: 20 }}>Pas de compte ? <a href="/auth/signup" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 700 }}>S'inscrire</a></p>
              <button onClick={() => { setEmailMode(true); setErr('') }} style={{ ...LINK, marginTop: 4 }}>Se connecter par email</button>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>Code de vérification</h1>
              <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 24 }}>Code envoyé au <span style={{ color: 'var(--tx)', fontWeight: 700 }}>{cc} {phone}</span></p>
              <input type="tel" inputMode="numeric" autoFocus placeholder="––––––" value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr('') }} onKeyDown={e => e.key === 'Enter' && verifyCode()}
                style={{ ...I, textAlign: 'center', fontSize: 28, fontWeight: 800, letterSpacing: '0.4em', padding: '16px' }} />
              {err && <div style={{ marginTop: 16 }}><Err msg={err} /></div>}
              <button onClick={verifyCode} disabled={loading || code.length < 4} style={BTN(code.length >= 4)}>{loading ? 'Vérification...' : 'Valider'}</button>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                <button onClick={() => { setStep('phone'); setCode(''); setErr('') }} style={{ ...LINK, marginTop: 0, width: 'auto', textAlign: 'left' }}>← Changer de numéro</button>
                <button onClick={sendCode} disabled={loading} style={{ ...LINK, marginTop: 0, width: 'auto', textAlign: 'right', color: '#6366f1' }}>Renvoyer le code</button>
              </div>
            </>
          )}
        </div>
      </div>
      {showCc && <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowCc(false)} />}
    </div>
  )
}

const LBL: React.CSSProperties = { fontSize: 11, color: 'var(--tx2)', display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.04em' }
const LINK: React.CSSProperties = { width: '100%', padding: 10, marginTop: 12, background: 'transparent', border: 'none', color: 'var(--tx2)', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa,sans-serif' }
function Err({ msg }: { msg: string }) {
  return <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#ef444412', border: '1px solid #ef444422', fontSize: 13, color: '#ef4444' }}>{msg}</div>
}
