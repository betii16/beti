'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'

export default function LoginPage() {
  const router = useRouter()
  const { t, isAr } = useLang()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(t('auth.wrongCredentials'))
    } else {
      router.refresh()
      router.push('/')
    }
    setLoading(false)
  }

  return (
    <>
      <style suppressHydrationWarning>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #0D0D12; font-family: 'Nexa', sans-serif; }`}</style>
      <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', direction: isAr ? 'rtl' : 'ltr' }}>
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)', backgroundSize: '64px 64px' }}/>
        <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, background: '#C9A84C', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#0D0D12' }}>B</div>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#F0EDE8', letterSpacing: '0.08em', fontFamily: 'Nexa, sans-serif' }}>BETI</span>
            </a>
          </div>
          <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 20, padding: '40px 36px' }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8', marginBottom: 8 }}>{t('auth.goodBack')}</h1>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 32, fontWeight: 300 }}>{t('auth.connectSub')}</p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 8, fontWeight: 800, letterSpacing: '0.06em' }}>{t('auth.email')}</label>
              <input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '13px 16px', background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#F0EDE8', fontSize: 14, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300, textAlign: isAr ? 'right' : 'left' }}/>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 8, fontWeight: 800, letterSpacing: '0.06em' }}>{t('auth.password')}</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ width: '100%', padding: '13px 16px', background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#F0EDE8', fontSize: 14, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}/>
            </div>

            {error && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#1a0a0a', border: '0.5px solid #2a1010', fontSize: 13, color: '#f87171' }}>{error}</div>}

            <button onClick={handleLogin} disabled={loading}
              style={{ width: '100%', padding: '14px', background: loading ? '#a08030' : '#C9A84C', border: 'none', borderRadius: 10, color: '#0D0D12', fontSize: 14, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'background 0.2s' }}>
              {loading ? t('auth.connecting') : t('auth.connect')}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
              <div style={{ flex: 1, height: '0.5px', background: '#2a2a3a' }}/>
              <span style={{ fontSize: 12, color: '#444' }}>ou</span>
              <div style={{ flex: 1, height: '0.5px', background: '#2a2a3a' }}/>
            </div>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#555' }}>
              {t('auth.noAccount')}{' '}
              <a href="/auth/signup" style={{ color: '#C9A84C', textDecoration: 'none', fontWeight: 800 }}>{t('auth.register')}</a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
