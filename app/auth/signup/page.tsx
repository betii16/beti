'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { COUNTRY_CODES, toE164 } from '@/lib/countryCodes'

const race = <T,>(p: PromiseLike<T>, ms = 15000): Promise<T> =>
  Promise.race([Promise.resolve(p), new Promise<T>((_, r) => setTimeout(() => r(new Error('Délai dépassé')), ms))])

export default function SignupPage() {
  const router = useRouter()
  const { isAr } = useLang()

  const [step, setStep] = useState(1) // 1 rôle · 2 infos · 3 code
  const [role, setRole] = useState<'client' | 'artisan' | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cc, setCc] = useState('+213')
  const [showCc, setShowCc] = useState(false)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [phoneErr, setPhoneErr] = useState('')

  // Repli email/mot de passe (le flux téléphone nécessite un provider SMS configuré)
  const [emailMode, setEmailMode] = useState(false)
  const [pw, setPw] = useState('')
  const [okMsg, setOkMsg] = useState('')

  const sel = COUNTRY_CODES.find(x => x.c === cc) || COUNTRY_CODES[0]
  const fullPhone = toE164(cc, phone)
  const canSend = Boolean(name.trim() && phone.replace(/\D/g, '').length >= 6 && !phoneErr)

  const checkPhone = async () => {
    if (phone.replace(/\D/g, '').length < 6) return
    setPhoneErr('')
    try {
      const { data } = await race(supabase.from('profiles').select('id').eq('phone', fullPhone).limit(1))
      if (data && data.length > 0) setPhoneErr('Numéro déjà utilisé')
    } catch {}
  }

  const sendCode = async () => {
    if (!canSend || !role) return
    setLoading(true); setErr('')
    try {
      const { error } = await race(supabase.auth.signInWithOtp({
        phone: fullPhone,
        options: { shouldCreateUser: true, data: { full_name: name.trim(), role, phone: fullPhone, email: email.trim() || null } },
      }))
      if (error) {
        const m = error.message
        setErr(/already registered|exists/i.test(m) ? 'Numéro déjà utilisé' : 'Envoi du code impossible : ' + m)
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
      if (error) { setErr(/expired|invalid|incorrect/i.test(error.message) ? 'Code incorrect ou expiré' : error.message); setLoading(false); return }
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
        setErr(/registered|exists/i.test(m) ? 'Email déjà utilisé' : m.includes('valid email') ? 'Email invalide' : m.includes('least 6') ? 'Mot de passe trop court (min. 6)' : 'Erreur : ' + m)
        setLoading(false); return
      }
      if (!data.session) { setOkMsg('Compte créé ! Vérifiez votre email pour le confirmer, puis connectez-vous.'); setLoading(false); return }
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

        <div key={okMsg ? 'ok' : step} className="anim-scale-in" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: '36px 32px', boxShadow: 'var(--card-shadow)' }}>

          {okMsg ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#10b98115', border: '2px solid #10b98133', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>{okMsg}</div>
              <a href="/auth/login" style={{ display: 'inline-block', marginTop: 12, padding: '12px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>Se connecter</a>
            </div>
          ) : (<>

          {/* ── Étape 1 : rôle ── */}
          {step === 1 && (
            <>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>Bienvenue</h1>
              <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 28 }}>Vous êtes...</p>
              {[{ v: 'client', t: 'Client', d: 'Je cherche un artisan' }, { v: 'artisan', t: 'Artisan', d: 'Je propose mes services' }].map(o => (
                <div key={o.v} onClick={() => setRole(o.v as any)} style={{ padding: '16px 18px', borderRadius: 12, cursor: 'pointer', border: `1px solid ${role === o.v ? '#6366f1' : 'var(--border)'}`, background: role === o.v ? '#6366f10d' : 'var(--bg3)', marginBottom: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 2 }}>{o.t}</div>
                  <div style={{ fontSize: 12, color: 'var(--tx2)' }}>{o.d}</div>
                </div>
              ))}
              <button onClick={() => role && setStep(2)} style={BTN(!!role)}>Continuer</button>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--tx2)', marginTop: 20 }}>Déjà un compte ? <a href="/auth/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 700 }}>Connexion</a></p>
            </>
          )}

          {/* ── Étape 2 : infos (téléphone) ── */}
          {step === 2 && !emailMode && (
            <>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>Votre compte</h1>
              <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 24 }}>On vous enverra un code par téléphone</p>

              <div style={{ marginBottom: 14 }}>
                <label style={LBL}>NOM COMPLET</label>
                <input type="text" placeholder="Karim Benali" value={name} onChange={e => setName(e.target.value)} style={I} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={LBL}>NUMÉRO DE TÉLÉPHONE *</label>
                <div style={{ display: 'flex', position: 'relative' }}>
                  <button type="button" onClick={() => setShowCc(!showCc)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '13px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRight: 'none', borderRadius: '10px 0 0 10px', cursor: 'pointer', color: 'var(--tx)', fontFamily: 'Nexa,sans-serif', flexShrink: 0, minWidth: 96 }}>
                    <span style={{ fontSize: 18 }}>{sel.f}</span><span style={{ fontSize: 13, color: 'var(--tx2)' }}>{cc}</span>
                  </button>
                  {showCc && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', maxHeight: 220, overflowY: 'auto', width: 260, marginTop: 4 }}>
                      {COUNTRY_CODES.map(c => (
                        <div key={c.c + c.n} onClick={() => { setCc(c.c); setShowCc(false); setPhoneErr('') }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '0.5px solid var(--border)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <span style={{ fontSize: 18 }}>{c.f}</span><span style={{ fontSize: 13, color: 'var(--tx)', flex: 1 }}>{c.n}</span><span style={{ fontSize: 12, color: 'var(--tx3)' }}>{c.c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <input type="tel" placeholder="555 12 34 56" value={phone} onChange={e => { setPhone(e.target.value); setPhoneErr('') }} onBlur={checkPhone} style={{ ...I, borderRadius: '0 10px 10px 0', borderColor: phoneErr ? '#ef4444' : undefined }} />
                </div>
                {phoneErr && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>{phoneErr}</p>}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={LBL}>EMAIL <span style={{ color: 'var(--tx3)', fontWeight: 300 }}>(facultatif)</span></label>
                <input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} style={I} />
              </div>

              {err && <Err msg={err} />}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: 14, borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--tx2)', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa,sans-serif' }}>Retour</button>
                <button onClick={sendCode} disabled={!canSend || loading} style={{ ...BTN(canSend), flex: 2 }}>{loading ? 'Envoi...' : 'Recevoir le code'}</button>
              </div>
              <button onClick={() => { setEmailMode(true); setErr('') }} style={{ ...LINK, width: '100%', marginTop: 14 }}>Plutôt s'inscrire par email</button>
            </>
          )}

          {/* ── Étape 2 : infos (email — repli) ── */}
          {step === 2 && emailMode && (
            <>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>Inscription par email</h1>
              <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 24 }}>Créez votre compte {role === 'artisan' ? 'artisan' : 'client'}</p>
              <div style={{ marginBottom: 14 }}>
                <label style={LBL}>NOM COMPLET</label>
                <input type="text" placeholder="Karim Benali" value={name} onChange={e => setName(e.target.value)} style={I} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={LBL}>EMAIL</label>
                <input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} style={I} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={LBL}>MOT DE PASSE</label>
                <input type="password" placeholder="Min. 6 caractères" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && signUpEmail()} style={I} />
              </div>
              {err && <Err msg={err} />}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setEmailMode(false); setErr('') }} style={{ flex: 1, padding: 14, borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--tx2)', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa,sans-serif' }}>Retour</button>
                <button onClick={signUpEmail} disabled={loading || !name.trim() || !email || pw.length < 6} style={{ ...BTN(!!(name.trim() && email && pw.length >= 6)), flex: 2 }}>{loading ? 'Création...' : 'Créer mon compte'}</button>
              </div>
            </>
          )}

          {/* ── Étape 3 : code ── */}
          {step === 3 && (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>Code de vérification</h1>
              <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 24 }}>Code envoyé au <span style={{ color: 'var(--tx)', fontWeight: 700 }}>{cc} {phone}</span></p>
              <input type="tel" inputMode="numeric" autoFocus placeholder="––––––" value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr('') }} onKeyDown={e => e.key === 'Enter' && verifyCode()}
                style={{ ...I, textAlign: 'center', fontSize: 28, fontWeight: 800, letterSpacing: '0.4em', padding: '16px' }} />
              {err && <div style={{ marginTop: 16 }}><Err msg={err} /></div>}
              <button onClick={verifyCode} disabled={loading || code.length < 4} style={{ ...BTN(code.length >= 4), marginTop: 16 }}>{loading ? 'Création du compte...' : 'Créer mon compte'}</button>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                <button onClick={() => { setStep(2); setCode(''); setErr('') }} style={LINK}>← Modifier</button>
                <button onClick={sendCode} disabled={loading} style={{ ...LINK, color: '#6366f1', textAlign: 'right' }}>Renvoyer le code</button>
              </div>
            </>
          )}

          </>)}
        </div>
      </div>
      {showCc && <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowCc(false)} />}
    </div>
  )
}

const LBL: React.CSSProperties = { fontSize: 11, color: 'var(--tx2)', display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.04em' }
const LINK: React.CSSProperties = { background: 'transparent', border: 'none', color: 'var(--tx2)', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa,sans-serif' }
function Err({ msg }: { msg: string }) {
  return <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#ef444412', border: '1px solid #ef444422', fontSize: 13, color: '#ef4444' }}>{msg}</div>
}
