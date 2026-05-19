'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'

const COUNTRIES = [
  { code: '+213', flag: '🇩🇿', name: 'Algérie' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
  { code: '+212', flag: '🇲🇦', name: 'Maroc' },
  { code: '+216', flag: '🇹🇳', name: 'Tunisie' },
  { code: '+218', flag: '🇱🇾', name: 'Libye' },
  { code: '+20',  flag: '🇪🇬', name: 'Égypte' },
  { code: '+966', flag: '🇸🇦', name: 'Arabie Saoudite' },
  { code: '+971', flag: '🇦🇪', name: 'EAU' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: '+90',  flag: '🇹🇷', name: 'Turquie' },
  { code: '+49',  flag: '🇩🇪', name: 'Allemagne' },
  { code: '+44',  flag: '🇬🇧', name: 'Royaume-Uni' },
  { code: '+1',   flag: '🇺🇸', name: 'États-Unis' },
  { code: '+39',  flag: '🇮🇹', name: 'Italie' },
  { code: '+34',  flag: '🇪🇸', name: 'Espagne' },
  { code: '+32',  flag: '🇧🇪', name: 'Belgique' },
  { code: '+41',  flag: '🇨🇭', name: 'Suisse' },
  { code: '+1',   flag: '🇨🇦', name: 'Canada' },
]

export default function SignupPage() {
  const router = useRouter()
  const { t, isAr } = useLang()
  const [dark, setDark] = useState(true)
  const [step, setStep] = useState(1)
  const [role, setRole] = useState<'client' | 'artisan' | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+213')
  const [showCountries, setShowCountries] = useState(false)
  const [phoneError, setPhoneError] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('beti-theme')
    if (saved === 'light') setDark(false)
  }, [])

  const bg = dark ? '#0b0b12' : '#f5f5f7'
  const bg2 = dark ? '#13131e' : '#ffffff'
  const bg3 = dark ? '#0e0e18' : '#f0f0f3'
  const tx = dark ? '#e0dfe5' : '#111827'
  const tx2 = dark ? '#8585a0' : '#6b7280'
  const tx3 = dark ? '#4a4a65' : '#9ca3af'
  const brd = dark ? '#1c1c30' : '#e5e7eb'

  const checkRateLimit = () => {
    try {
      const key = 'beti_signup_attempts'
      const stored = JSON.parse(localStorage.getItem(key) || '{"count":0,"ts":0}')
      const now = Date.now()
      if (now - stored.ts > 15 * 60 * 1000) { stored.count = 0; stored.ts = now }
      if (stored.count >= 5) return false
      stored.count++; stored.ts = now
      localStorage.setItem(key, JSON.stringify(stored))
      return true
    } catch { return true }
  }

  const fullPhone = `${countryCode}${phone.replace(/[\s\-\(\)]/g, '')}`

  const checkPhoneUnique = async () => {
    if (!phone || phone.length < 6) return
    setPhoneError('')
    const { data } = await supabase.from('profiles').select('id').eq('phone', fullPhone).limit(1)
    if (data && data.length > 0) setPhoneError(isAr ? 'هذا الرقم مستخدم بالفعل' : 'Ce numéro est déjà associé à un compte')
  }

  const passwordStrength = () => {
    let s = 0
    if (password.length >= 6) s++
    if (password.length >= 10) s++
    if (/[A-Z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (/[^A-Za-z0-9]/.test(password)) s++
    return s
  }

  const canContinue = fullName && email && password.length >= 6 && phone.length >= 6 && !phoneError

  const handleSignup = async () => {
    if (!role || phoneError) return
    if (!checkRateLimit()) { setError(isAr ? 'محاولات كثيرة. انتظر 15 دقيقة' : 'Trop de tentatives. Réessayez dans 15 minutes.'); return }
    setLoading(true); setError('')

    const { data: phoneCheck } = await supabase.from('profiles').select('id').eq('phone', fullPhone).limit(1)
    if (phoneCheck && phoneCheck.length > 0) { setError(isAr ? 'هذا الرقم مرتبط بحساب آخر' : 'Ce numéro est déjà associé à un compte'); setLoading(false); return }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, role, phone: fullPhone } } })
    if (signUpError) {
      setError(signUpError.message.includes('already registered') ? (isAr ? 'هذا البريد مسجل بالفعل' : 'Cet email est déjà utilisé') : signUpError.message)
      setLoading(false); return
    }

    const userId = signUpData.user?.id
    if (!userId) { setError('Erreur création compte'); setLoading(false); return }

    await supabase.from('profiles').upsert({ id: userId, full_name: fullName, phone: fullPhone, role }, { onConflict: 'id' })
    if (role === 'artisan') await supabase.from('artisans').upsert({ id: userId, category: 'plomberie', hourly_rate: 0, is_available: false, rating_avg: 0, rating_count: 0, total_missions: 0 }, { onConflict: 'id' })

    setSuccess(true)
    setTimeout(() => router.push(role === 'artisan' ? '/artisan-dashboard/profil' : '/mon-espace'), 2000)
    setLoading(false)
  }

  const selectedCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0]

  if (success) return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', animation: 'fadeUp 0.6s ease' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#10b98118', border: '2px solid #10b98133', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: tx, marginBottom: 8, fontFamily: 'Nexa, sans-serif' }}>{isAr ? 'تم إنشاء حسابك' : 'Compte créé'}</div>
        <div style={{ fontSize: 13, color: tx2, fontWeight: 300 }}>{isAr ? 'جارٍ التوجيه...' : 'Redirection en cours...'}</div>
      </div>
      <style suppressHydrationWarning>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )

  return (
    <>
      <style suppressHydrationWarning>{`
        *{box-sizing:border-box;margin:0;padding:0}body{background:${bg};font-family:Nexa,system-ui,sans-serif}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .sinput{width:100%;padding:13px 16px;background:${bg3};border:1px solid ${brd};border-radius:10px;color:${tx};font-size:14px;outline:none;font-family:Nexa,sans-serif;font-weight:300;transition:border-color 0.2s}
        .sinput:focus{border-color:#6366f1}
        .sbtn{width:100%;padding:14px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:Nexa,sans-serif;transition:all 0.2s}
      `}</style>

      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, direction: isAr ? 'rtl' : 'ltr' }}>
        <div style={{ width: '100%', maxWidth: 440, position: 'relative', animation: 'fadeUp 0.5s ease' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff' }}>B</div>
              <span style={{ fontSize: 20, fontWeight: 800, color: tx, letterSpacing: '0.08em' }}>BETI</span>
            </a>
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 28, justifyContent: 'center' }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: 3, width: 48, borderRadius: 2, background: i <= step ? '#6366f1' : brd, transition: 'background 0.3s' }}/>)}
          </div>

          <div style={{ background: bg2, border: `1px solid ${brd}`, borderRadius: 18, padding: '36px 32px', boxShadow: dark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)' }}>

            {/* Step 1: Rôle */}
            {step === 1 && (
              <>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: tx, marginBottom: 8 }}>{t('auth.welcome')}</h1>
                <p style={{ fontSize: 13, color: tx2, marginBottom: 28, fontWeight: 300 }}>{t('auth.youAre')}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  {[
                    { value: 'client', title: t('auth.client'), desc: t('auth.clientDesc') },
                    { value: 'artisan', title: t('auth.artisan'), desc: t('auth.artisanDesc') },
                  ].map(opt => (
                    <div key={opt.value} onClick={() => setRole(opt.value as any)}
                      style={{ padding: '16px 18px', borderRadius: 12, cursor: 'pointer', border: `1px solid ${role === opt.value ? '#6366f1' : brd}`, background: role === opt.value ? '#6366f10d' : bg3, transition: 'all 0.2s' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: tx, marginBottom: 3 }}>{opt.title}</div>
                      <div style={{ fontSize: 12, color: tx2, fontWeight: 300 }}>{opt.desc}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => role && setStep(2)} className="sbtn"
                  style={{ background: role ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : brd, color: role ? '#fff' : tx3 }}>
                  {t('auth.continue')}
                </button>
                <p style={{ textAlign: 'center', fontSize: 13, color: tx2, marginTop: 20 }}>
                  {t('auth.alreadyAccount')}{' '}
                  <a href="/auth/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 700 }}>{t('auth.signIn')}</a>
                </p>
              </>
            )}

            {/* Step 2: Info */}
            {step === 2 && (
              <>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: tx, marginBottom: 8 }}>{t('auth.yourInfo')}</h1>
                <p style={{ fontSize: 13, color: tx2, marginBottom: 28, fontWeight: 300 }}>{t('auth.createAccount')}</p>

                {[
                  { label: t('auth.fullName'), type: 'text', placeholder: 'Karim Benali', value: fullName, setter: setFullName },
                  { label: t('auth.email'), type: 'email', placeholder: 'votre@email.com', value: email, setter: setEmail },
                  { label: t('auth.password'), type: 'password', placeholder: 'Min. 6 caractères', value: password, setter: setPassword },
                ].map(f => (
                  <div key={f.label} style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, color: tx2, display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.06em' }}>{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder} value={f.value} onChange={e => f.setter(e.target.value)} className="sinput"/>
                  </div>
                ))}

                {/* Password strength */}
                {password.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= passwordStrength() ? (passwordStrength() <= 2 ? '#ef4444' : passwordStrength() <= 3 ? '#f59e0b' : '#10b981') : brd, transition: 'all 0.3s' }}/>
                      ))}
                    </div>
                    <span style={{ fontSize: 10, color: passwordStrength() <= 2 ? '#ef4444' : passwordStrength() <= 3 ? '#f59e0b' : '#10b981', fontWeight: 300 }}>
                      {passwordStrength() <= 2 ? 'Faible' : passwordStrength() <= 3 ? 'Moyen' : 'Fort'}
                    </span>
                  </div>
                )}

                {/* Phone with country selector */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: tx2, display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.06em' }}>
                    {isAr ? 'رقم الهاتف' : 'TÉLÉPHONE'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
                    {/* Country selector */}
                    <button onClick={() => setShowCountries(!showCountries)} type="button"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '13px 12px', background: bg3, border: `1px solid ${brd}`, borderRight: 'none', borderRadius: '10px 0 0 10px', cursor: 'pointer', fontSize: 14, color: tx, fontFamily: 'Nexa, sans-serif', fontWeight: 300, flexShrink: 0, transition: 'border-color 0.2s', minWidth: 100 }}>
                      <span style={{ fontSize: 18 }}>{selectedCountry.flag}</span>
                      <span style={{ fontSize: 13, color: tx2 }}>{countryCode}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={tx3} strokeWidth="2" style={{ transform: showCountries ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6"/></svg>
                    </button>

                    {/* Country dropdown */}
                    {showCountries && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, background: bg2, border: `1px solid ${brd}`, borderRadius: 12, boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.1)', maxHeight: 240, overflowY: 'auto', width: 260, marginTop: 4 }}>
                        {COUNTRIES.map(c => (
                          <div key={c.code + c.name} onClick={() => { setCountryCode(c.code); setShowCountries(false) }}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', transition: 'background 0.15s', borderBottom: `0.5px solid ${brd}` }}
                            onMouseEnter={e => (e.currentTarget.style.background = bg3)}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <span style={{ fontSize: 18 }}>{c.flag}</span>
                            <span style={{ fontSize: 13, color: tx, fontWeight: 300, flex: 1 }}>{c.name}</span>
                            <span style={{ fontSize: 12, color: tx3, fontWeight: 300 }}>{c.code}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Phone input */}
                    <input type="tel" placeholder="555 12 34 56" value={phone}
                      onChange={e => { setPhone(e.target.value); setPhoneError('') }}
                      onBlur={checkPhoneUnique}
                      style={{ flex: 1, padding: '13px 16px', background: bg3, border: `1px solid ${phoneError ? '#ef4444' : brd}`, borderRadius: '0 10px 10px 0', color: tx, fontSize: 14, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300, transition: 'border-color 0.2s' }}/>
                  </div>
                  {phoneError && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 6, fontWeight: 300 }}>{phoneError}</p>}
                  <p style={{ fontSize: 10, color: tx3, marginTop: 6, fontWeight: 300 }}>Un seul compte par numéro</p>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button onClick={() => setStep(1)} className="sbtn" style={{ flex: 1, background: 'transparent', border: `1px solid ${brd}`, color: tx2 }}>{t('booking.back')}</button>
                  <button onClick={() => canContinue && setStep(3)} className="sbtn" style={{ flex: 2, background: canContinue ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : brd, color: canContinue ? '#fff' : tx3 }}>{t('auth.continue')}</button>
                </div>
              </>
            )}

            {/* Step 3: Confirmation */}
            {step === 3 && (
              <>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: tx, marginBottom: 8 }}>{t('auth.confirmation')}</h1>
                <p style={{ fontSize: 13, color: tx2, marginBottom: 24, fontWeight: 300 }}>{t('auth.verify')}</p>

                <div style={{ background: bg3, border: `1px solid ${brd}`, borderRadius: 12, padding: 18, marginBottom: 24 }}>
                  {[
                    { label: 'Rôle', value: role === 'client' ? t('auth.client') : t('auth.artisan') },
                    { label: 'Nom', value: fullName },
                    { label: 'Email', value: email },
                    { label: 'Téléphone', value: `${countryCode} ${phone}` },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `0.5px solid ${brd}` }}>
                      <span style={{ fontSize: 12, color: tx3, fontWeight: 300 }}>{item.label}</span>
                      <span style={{ fontSize: 13, color: tx, fontWeight: 700 }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {error && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#ef444412', border: '1px solid #ef444422', fontSize: 13, color: '#ef4444' }}>{error}</div>}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep(2)} className="sbtn" style={{ flex: 1, background: 'transparent', border: `1px solid ${brd}`, color: tx2 }}>{t('booking.back')}</button>
                  <button onClick={handleSignup} disabled={loading} className="sbtn"
                    style={{ flex: 2, background: loading ? '#6366f188' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', cursor: loading ? 'wait' : 'pointer' }}>
                    {loading ? (isAr ? 'جارٍ...' : 'Création...') : (isAr ? 'إنشاء حسابي' : 'Créer mon compte')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showCountries && <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowCountries(false)}/>}
    </>
  )
}
