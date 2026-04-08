'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'

export default function SignupPage() {
  const router = useRouter()
  const { t, isAr } = useLang()
  const [step, setStep] = useState(1)
  const [role, setRole] = useState<'client' | 'artisan' | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [attempts, setAttempts] = useState(0)

  // Sécurité : rate limiting côté client
  const checkRateLimit = () => {
    try {
      const key = 'beti_signup_attempts'
      const stored = JSON.parse(localStorage.getItem(key) || '{"count":0,"ts":0}')
      const now = Date.now()
      // Reset après 15 min
      if (now - stored.ts > 15 * 60 * 1000) { stored.count = 0; stored.ts = now }
      if (stored.count >= 5) return false
      stored.count++
      stored.ts = now
      localStorage.setItem(key, JSON.stringify(stored))
      return true
    } catch { return true }
  }

  // Vérification téléphone unique (international)
  const checkPhoneUnique = async (phoneVal: string) => {
    const cleaned = phoneVal.replace(/[\s\-\(\)]/g, '')
    if (!cleaned || cleaned.length < 8) return
    setPhoneError('')
    const { data } = await supabase.from('profiles').select('id').eq('phone', cleaned).limit(1)
    if (data && data.length > 0) setPhoneError(isAr ? 'هذا الرقم مستخدم بالفعل' : 'Ce numéro est déjà associé à un compte')
  }

  // Vérification email unique
  const checkEmailUnique = async (emailVal: string) => {
    if (!emailVal || !emailVal.includes('@')) return
    setEmailError('')
    // Supabase auth gère l'unicité, mais on vérifie aussi dans profiles
    const { data } = await supabase.from('profiles').select('id')
      .or(`phone.eq.placeholder_${emailVal}`)  // dummy query to not expose emails
    // L'unicité sera vérifiée au signUp par Supabase Auth
  }

  // Nettoyage du numéro
  const cleanPhone = (val: string) => val.replace(/[\s\-\(\)]/g, '')

  // Force du mot de passe
  const passwordStrength = () => {
    let s = 0
    if (password.length >= 6) s++
    if (password.length >= 10) s++
    if (/[A-Z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (/[^A-Za-z0-9]/.test(password)) s++
    return s
  }

  const handleSignup = async () => {
    if (!role) return
    if (phoneError || emailError) return
    if (!checkRateLimit()) {
      setError(isAr ? 'محاولات كثيرة. حاول مرة أخرى بعد 15 دقيقة' : 'Trop de tentatives. Réessayez dans 15 minutes.')
      return
    }
    setLoading(true)
    setError('')

    const cleanedPhone = cleanPhone(phone)

    // Vérification finale unicité téléphone
    if (cleanedPhone) {
      const { data: phoneCheck } = await supabase.from('profiles').select('id').eq('phone', cleanedPhone).limit(1)
      if (phoneCheck && phoneCheck.length > 0) {
        setError(isAr ? 'هذا الرقم مرتبط بحساب آخر' : 'Ce numéro de téléphone est déjà associé à un compte')
        setLoading(false)
        return
      }
    }

    // 1. Créer le compte auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role, phone: cleanedPhone } }
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError(isAr ? 'هذا البريد الإلكتروني مسجل بالفعل' : 'Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.')
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    const userId = signUpData.user?.id
    if (!userId) {
      setError(isAr ? 'خطأ أثناء إنشاء الحساب' : 'Erreur lors de la création du compte')
      setLoading(false)
      return
    }

    // 2. Créer le profil avec le bon rôle
    await supabase.from('profiles').upsert({
      id: userId,
      full_name: fullName,
      phone: cleanedPhone,
      role: role,
    }, { onConflict: 'id' })

    // 3. Si artisan, créer la ligne artisans
    if (role === 'artisan') {
      await supabase.from('artisans').upsert({
        id: userId,
        category: 'plomberie',
        hourly_rate: 0,
        is_available: false,
        rating_avg: 0,
        rating_count: 0,
        total_missions: 0,
      }, { onConflict: 'id' })
    }

    setSuccess(true)
    setTimeout(() => router.push(role === 'artisan' ? '/artisan-dashboard/profil' : '/mon-espace'), 2000)
    setLoading(false)
  }

  if (success) return (
    <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Nexa, sans-serif' }}>
      <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 20, padding: '48px 36px', maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#F0EDE8', marginBottom: 12 }}>{t('auth.created')}</h2>
        <p style={{ fontSize: 13, color: '#555', lineHeight: 1.7, marginBottom: 28 }}>
          {isAr ? `مرحباً في BETI` : 'Bienvenue sur BETI'} <strong style={{ color: '#C9A84C' }}>{fullName}</strong>
        </p>
        <div style={{ height: 3, background: '#1a1a2a', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#C9A84C', borderRadius: 2, animation: 'load 2s linear forwards' }}/>
        </div>
        <style suppressHydrationWarning>{`@keyframes load { from{width:0} to{width:100%} }`}</style>
      </div>
    </div>
  )

  return (
    <>
      <style suppressHydrationWarning>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #0D0D12; font-family: Nexa, sans-serif; }`}</style>
      <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', direction: isAr ? 'rtl' : 'ltr' }}>
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)', backgroundSize: '64px 64px' }}/>
        <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, background: '#C9A84C', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#0D0D12' }}>B</div>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#F0EDE8', letterSpacing: '0.08em' }}>BETI</span>
            </a>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 32, justifyContent: 'center' }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 3, width: 48, borderRadius: 2, background: i <= step ? '#C9A84C' : '#2a2a3a', transition: 'background 0.3s' }}/>)}
          </div>

          <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 20, padding: '40px 36px' }}>

            {step === 1 && (
              <>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8', marginBottom: 8 }}>{t('auth.welcome')}</h1>
                <p style={{ fontSize: 13, color: '#555', marginBottom: 32, fontWeight: 300 }}>{t('auth.youAre')}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                  {[
                    { value: 'client',  icon: '👤', title: t('auth.client'),  desc: t('auth.clientDesc') },
                    { value: 'artisan', icon: '🔧', title: t('auth.artisan'), desc: t('auth.artisanDesc') },
                  ].map(opt => (
                    <div key={opt.value} onClick={() => setRole(opt.value as any)}
                      style={{ padding: '18px 20px', borderRadius: 12, cursor: 'pointer', border: `0.5px solid ${role === opt.value ? '#C9A84C' : '#2a2a3a'}`, background: role === opt.value ? '#1a1508' : '#0D0D12', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontSize: 28 }}>{opt.icon}</span>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', marginBottom: 4 }}>{opt.title}</div>
                        <div style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>{opt.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => role && setStep(2)}
                  style={{ width: '100%', padding: '14px', background: role ? '#C9A84C' : '#1a1a2a', border: 'none', borderRadius: 10, color: role ? '#0D0D12' : '#444', fontSize: 14, fontWeight: 800, cursor: role ? 'pointer' : 'not-allowed', fontFamily: 'Nexa, sans-serif' }}>
                  {t('auth.continue')}
                </button>
                <p style={{ textAlign: 'center', fontSize: 13, color: '#555', marginTop: 24 }}>
                  {t('auth.alreadyAccount')}{' '}
                  <a href="/auth/login" style={{ color: '#C9A84C', textDecoration: 'none', fontWeight: 800 }}>{t('auth.signIn')}</a>
                </p>
              </>
            )}

            {step === 2 && (
              <>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8', marginBottom: 8 }}>{t('auth.yourInfo')}</h1>
                <p style={{ fontSize: 13, color: '#555', marginBottom: 32, fontWeight: 300 }}>{t('auth.createAccount')}</p>
                {[
                  { label: t('auth.fullName'), type: 'text',     placeholder: 'Karim Benali',      value: fullName,  setter: setFullName },
                  { label: t('auth.email'),    type: 'email',    placeholder: 'votre@email.com',   value: email,     setter: setEmail },
                  { label: t('auth.password'), type: 'password', placeholder: isAr ? 'الحد الأدنى 6 أحرف' : 'Min. 6 caractères', value: password, setter: setPassword },
                ].map(f => (
                  <div key={f.label} style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 8, fontWeight: 800, letterSpacing: '0.06em' }}>{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder} value={f.value} onChange={e => f.setter(e.target.value)}
                      style={{ width: '100%', padding: '13px 16px', background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#F0EDE8', fontSize: 14, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}/>
                  </div>
                ))}
                {/* Téléphone — obligatoire, unique, international */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 8, fontWeight: 800, letterSpacing: '0.06em' }}>
                    {isAr ? 'رقم الهاتف' : 'TÉLÉPHONE'} <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input type="tel" placeholder={isAr ? 'مثال: +213 555 123 456' : '+213 555 12 34 56'} value={phone}
                    onChange={e => { setPhone(e.target.value); setPhoneError('') }}
                    onBlur={() => checkPhoneUnique(phone)}
                    style={{ width: '100%', padding: '13px 16px', background: '#0D0D12', border: `0.5px solid ${phoneError ? '#f87171' : '#2a2a3a'}`, borderRadius: 10, color: '#F0EDE8', fontSize: 14, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}/>
                  {phoneError && <p style={{ fontSize: 11, color: '#f87171', marginTop: 6, fontWeight: 300 }}>{phoneError}</p>}
                  <p style={{ fontSize: 10, color: '#444', marginTop: 6, fontWeight: 300 }}>{isAr ? 'حساب واحد لكل رقم · أي دولة' : 'Un seul compte par numéro · Tous pays acceptés'}</p>
                </div>
                {/* Indicateur force mot de passe */}
                {password.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= passwordStrength() ? (passwordStrength() <= 2 ? '#f87171' : passwordStrength() <= 3 ? '#f59e0b' : '#4ade80') : '#1e1e2a', transition: 'all 0.3s' }}/>
                      ))}
                    </div>
                    <span style={{ fontSize: 10, color: passwordStrength() <= 2 ? '#f87171' : passwordStrength() <= 3 ? '#f59e0b' : '#4ade80', fontWeight: 300 }}>
                      {passwordStrength() <= 2 ? (isAr ? 'ضعيف' : 'Faible') : passwordStrength() <= 3 ? (isAr ? 'متوسط' : 'Moyen') : (isAr ? 'قوي' : 'Fort')}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button onClick={() => setStep(1)} style={{ flex: 1, padding: '13px', background: 'transparent', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#666', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>{t('booking.back')}</button>
                  <button onClick={() => fullName && email && password.length >= 6 && phone.length >= 9 && !phoneError && setStep(3)}
                    style={{ flex: 2, padding: '13px', background: fullName && email && password.length >= 6 && phone.length >= 9 && !phoneError ? '#C9A84C' : '#1a1a2a', border: 'none', borderRadius: 10, color: fullName && email && password.length >= 6 && phone.length >= 9 && !phoneError ? '#0D0D12' : '#444', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                    {t('auth.continue')}
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8', marginBottom: 8 }}>{t('auth.confirmation')}</h1>
                <p style={{ fontSize: 13, color: '#555', marginBottom: 28, fontWeight: 300 }}>{t('auth.verify')}</p>
                <div style={{ background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 12, padding: '20px', marginBottom: 24 }}>
                  {[
                    { label: isAr ? 'الدور' : 'Rôle',  value: role === 'client' ? `👤 ${t('auth.client')}` : `🔧 ${t('auth.artisan')}` },
                    { label: isAr ? 'الاسم' : 'Nom',   value: fullName },
                    { label: isAr ? 'البريد' : 'Email', value: email },
                    { label: isAr ? 'الهاتف' : 'Téléphone', value: phone },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #1e1e2a' }}>
                      <span style={{ fontSize: 12, color: '#555' }}>{item.label}</span>
                      <span style={{ fontSize: 13, color: '#F0EDE8', fontWeight: 800 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
                {error && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#1a0a0a', border: '0.5px solid #2a1010', fontSize: 13, color: '#f87171' }}>{error}</div>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep(2)} style={{ flex: 1, padding: '13px', background: 'transparent', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#666', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>{t('booking.back')}</button>
                  <button onClick={handleSignup} disabled={loading}
                    style={{ flex: 2, padding: '13px', background: loading ? '#a08030' : '#C9A84C', border: 'none', borderRadius: 10, color: '#0D0D12', fontSize: 13, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                    {loading ? t('auth.creating') : t('auth.create')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
