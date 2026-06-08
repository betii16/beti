'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'

export default function LoginPage() {
  const router = useRouter()
  const { t, isAr } = useLang()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [forgot, setForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  const handleLogin = async () => {
    if(!email||!pw)return;setLoading(true); setErr('')
    try{
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
      if (error) {
        if (error.message.includes('Invalid login')||error.message.includes('credentials')) setErr('Email ou mot de passe incorrect')
        else if (error.message.includes('Email not confirmed')) setErr('Confirmez votre email d\'abord (vérifiez votre boîte mail)')
        else setErr(error.message)
        setLoading(false); return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role === 'artisan') router.push('/artisan-dashboard')
        else if (profile?.role === 'admin') router.push('/admin')
        else router.push('/mon-espace')
        router.refresh()
      } else {
        setErr('Impossible de récupérer le profil')
      }
    }catch(e:any){
      setErr('Erreur de connexion: '+e.message)
    }
    setLoading(false)
  }

  const handleForgot = async () => {
    if (!forgotEmail) return; setForgotLoading(true)
    await supabase.auth.resetPasswordForEmail(forgotEmail, { redirectTo: `${window.location.origin}/auth/login` })
    setForgotSent(true); setForgotLoading(false)
  }

  const inp = { width: '100%', padding: '13px 16px', background: 'var(--bg3,#0e0e18)', border: '1px solid var(--border,#1c1c30)', borderRadius: 10, color: 'var(--tx,#e0dfe5)', fontSize: 14, outline: 'none' as const, fontFamily: 'Nexa,sans-serif', fontWeight: 300 as const, transition: 'border-color 0.2s' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff' }}>B</div>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)', letterSpacing: '0.08em' }}>BETI</span>
          </a>
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: '36px 32px', boxShadow: 'var(--card-shadow)' }}>

          {forgot ? (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>Mot de passe oublié</h1>
              <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 24, fontWeight: 300 }}>Entrez votre email pour recevoir un lien de réinitialisation</p>

              {forgotSent ? (
                <div style={{ padding: 20, borderRadius: 12, background: '#10b98112', border: '1px solid #10b98122', textAlign: 'center', marginBottom: 20 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" style={{ margin: '0 auto 12px', display: 'block' }}><path d="M20 6L9 17l-5-5"/></svg>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>Email envoyé</div>
                  <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 300 }}>Vérifiez votre boîte de réception</div>
                </div>
              ) : (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: 'var(--tx2)', display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.06em' }}>EMAIL</label>
                  <input type="email" placeholder="votre@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} style={inp}/>
                  <button onClick={handleForgot} disabled={forgotLoading || !forgotEmail}
                    style={{ width: '100%', padding: 14, border: 'none', borderRadius: 10, background: forgotEmail ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--border)', color: forgotEmail ? '#fff' : 'var(--tx3)', fontSize: 14, fontWeight: 700, cursor: forgotEmail ? 'pointer' : 'not-allowed', fontFamily: 'Nexa,sans-serif', marginTop: 16 }}>
                    {forgotLoading ? '...' : 'Envoyer le lien'}
                  </button>
                </div>
              )}

              <button onClick={() => { setForgot(false); setForgotSent(false) }}
                style={{ width: '100%', padding: 12, background: 'transparent', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--tx2)', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa,sans-serif', fontWeight: 300 }}>
                Retour à la connexion
              </button>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>Connexion</h1>
              <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 28, fontWeight: 300 }}>Connectez-vous à votre compte BETI</p>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: 'var(--tx2)', display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.06em' }}>EMAIL</label>
                <input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} style={inp}/>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, color: 'var(--tx2)', display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.06em' }}>MOT DE PASSE</label>
                <input type="password" placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={inp}/>
              </div>

              <div style={{ textAlign: 'right', marginBottom: 20 }}>
                <button onClick={() => { setForgot(true); setForgotEmail(email) }}
                  style={{ background: 'transparent', border: 'none', color: '#6366f1', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa,sans-serif', fontWeight: 300 }}>
                  Mot de passe oublié ?
                </button>
              </div>

              {err && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#ef444412', border: '1px solid #ef444422', fontSize: 13, color: '#ef4444' }}>{err}</div>}

              <button onClick={handleLogin} disabled={loading || !email || !pw}
                style={{ width: '100%', padding: 14, background: email && pw ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--border)', border: 'none', borderRadius: 10, color: email && pw ? '#fff' : 'var(--tx3)', fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontFamily: 'Nexa,sans-serif', transition: 'all 0.2s', boxShadow: email && pw ? '0 4px 16px #6366f122' : 'none' }}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/><span style={{ fontSize: 12, color: 'var(--tx3)' }}>ou</span><div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
              </div>

              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--tx2)' }}>
                Pas encore de compte ? <a href="/auth/signup" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 700 }}>S'inscrire</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
