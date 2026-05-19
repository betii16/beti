'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'

export default function LoginPage() {
  const router = useRouter()
  const { t, isAr } = useLang()
  const [dark, setDark] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

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

  const handleLogin = async () => {
    setLoading(true); setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      if (authError.message.includes('Invalid login')) {
        setError(isAr ? 'بريد إلكتروني أو كلمة مرور غير صحيحة' : 'Email ou mot de passe incorrect')
      } else if (authError.message.includes('Email not confirmed')) {
        setError(isAr ? 'يرجى تأكيد بريدك الإلكتروني' : 'Veuillez confirmer votre email')
      } else {
        setError(authError.message)
      }
    } else {
      // Redirect based on role
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role === 'artisan') router.push('/artisan-dashboard')
        else if (profile?.role === 'admin') router.push('/admin')
        else router.push('/mon-espace')
      } else {
        router.push('/')
      }
      router.refresh()
    }
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    if (!forgotEmail) return
    setForgotLoading(true)
    await supabase.auth.resetPasswordForEmail(forgotEmail, { redirectTo: `${window.location.origin}/auth/login` })
    setForgotSent(true)
    setForgotLoading(false)
  }

  return (
    <>
      <style suppressHydrationWarning>{`
        *{box-sizing:border-box;margin:0;padding:0}body{background:${bg};font-family:Nexa,system-ui,sans-serif}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .linput{width:100%;padding:13px 16px;background:${bg3};border:1px solid ${brd};border-radius:10px;color:${tx};font-size:14px;outline:none;font-family:Nexa,sans-serif;font-weight:300;transition:border-color 0.2s}
        .linput:focus{border-color:#6366f1}
      `}</style>

      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, direction: isAr ? 'rtl' : 'ltr' }}>
        <div style={{ width: '100%', maxWidth: 420, position: 'relative', animation: 'fadeUp 0.5s ease' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff' }}>B</div>
              <span style={{ fontSize: 20, fontWeight: 800, color: tx, letterSpacing: '0.08em' }}>BETI</span>
            </a>
          </div>

          <div style={{ background: bg2, border: `1px solid ${brd}`, borderRadius: 18, padding: '36px 32px', boxShadow: dark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)' }}>

            {/* Forgot password modal */}
            {showForgot ? (
              <>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: tx, marginBottom: 8 }}>{isAr ? 'نسيت كلمة المرور' : 'Mot de passe oublié'}</h1>
                <p style={{ fontSize: 13, color: tx2, marginBottom: 24, fontWeight: 300 }}>{isAr ? 'أدخل بريدك لإعادة التعيين' : 'Entrez votre email pour recevoir un lien de réinitialisation'}</p>

                {forgotSent ? (
                  <div style={{ padding: '20px', borderRadius: 12, background: '#10b98112', border: '1px solid #10b98122', textAlign: 'center', marginBottom: 20 }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" style={{ margin: '0 auto 12px', display: 'block' }}><path d="M20 6L9 17l-5-5"/></svg>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>{isAr ? 'تم الإرسال' : 'Email envoyé'}</div>
                    <div style={{ fontSize: 12, color: tx2, fontWeight: 300 }}>{isAr ? 'تحقق من بريدك' : 'Vérifiez votre boîte de réception'}</div>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ fontSize: 11, color: tx2, display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.06em' }}>EMAIL</label>
                      <input type="email" placeholder="votre@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="linput"/>
                    </div>
                    <button onClick={handleForgotPassword} disabled={forgotLoading || !forgotEmail}
                      style={{ width: '100%', padding: 14, border: 'none', borderRadius: 10, background: forgotEmail ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : brd, color: forgotEmail ? '#fff' : tx3, fontSize: 14, fontWeight: 700, cursor: forgotEmail ? 'pointer' : 'not-allowed', fontFamily: 'Nexa, sans-serif', marginBottom: 16 }}>
                      {forgotLoading ? '...' : (isAr ? 'إرسال الرابط' : 'Envoyer le lien')}
                    </button>
                  </>
                )}

                <button onClick={() => { setShowForgot(false); setForgotSent(false) }}
                  style={{ width: '100%', padding: 12, background: 'transparent', border: `1px solid ${brd}`, borderRadius: 10, color: tx2, fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>
                  {isAr ? 'رجوع' : 'Retour à la connexion'}
                </button>
              </>
            ) : (
              <>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: tx, marginBottom: 8 }}>{t('auth.goodBack')}</h1>
                <p style={{ fontSize: 13, color: tx2, marginBottom: 28, fontWeight: 300 }}>{t('auth.connectSub')}</p>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: tx2, display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.06em' }}>{t('auth.email')}</label>
                  <input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} className="linput"/>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, color: tx2, display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.06em' }}>{t('auth.password')}</label>
                  <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="linput"/>
                </div>

                <div style={{ textAlign: 'right', marginBottom: 20 }}>
                  <button onClick={() => { setShowForgot(true); setForgotEmail(email) }}
                    style={{ background: 'transparent', border: 'none', color: '#6366f1', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>
                    {isAr ? 'نسيت كلمة المرور؟' : 'Mot de passe oublié ?'}
                  </button>
                </div>

                {error && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#ef444412', border: '1px solid #ef444422', fontSize: 13, color: '#ef4444' }}>{error}</div>}

                <button onClick={handleLogin} disabled={loading || !email || !password}
                  style={{ width: '100%', padding: 14, background: email && password ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : brd, border: 'none', borderRadius: 10, color: email && password ? '#fff' : tx3, fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s', boxShadow: email && password ? '0 4px 16px #6366f122' : 'none' }}>
                  {loading ? (isAr ? 'جارٍ...' : 'Connexion...') : t('auth.connect')}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                  <div style={{ flex: 1, height: 1, background: brd }}/><span style={{ fontSize: 12, color: tx3 }}>{isAr ? 'أو' : 'ou'}</span><div style={{ flex: 1, height: 1, background: brd }}/>
                </div>

                <p style={{ textAlign: 'center', fontSize: 13, color: tx2 }}>
                  {t('auth.noAccount')}{' '}
                  <a href="/auth/signup" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 700 }}>{t('auth.register')}</a>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
