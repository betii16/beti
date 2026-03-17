'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect.')
    } else {
      router.push('/')
    }
    setLoading(false)
  }

  return (
    <>
      <style suppressHydrationWarning>{`
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0D0D12; font-family: 'Nexa', sans-serif; }
`}</style>

      <div style={{
        minHeight: '100vh', background: '#0D0D12',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}>
        {/* Grille décorative */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }} />

        <div style={{
          width: '100%', maxWidth: 420, position: 'relative',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40, background: '#C9A84C', borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 500, color: '#0D0D12',
                fontFamily: 'Cormorant Garamond, Georgia, serif',
              }}>B</div>
              <span style={{ fontSize: 22, fontWeight: 500, color: '#F0EDE8', letterSpacing: '0.08em' }}>BETI</span>
            </a>
          </div>

          {/* Card */}
          <div style={{
            background: '#161620', border: '0.5px solid #2a2a3a',
            borderRadius: 20, padding: '40px 36px',
          }}>
            <h1 style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: 28, fontWeight: 500, color: '#F0EDE8',
              marginBottom: 8,
            }}>Bon retour</h1>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 32, fontWeight: 300 }}>
              Connectez-vous à votre compte BETI
            </p>

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 8, fontWeight: 500 }}>
                EMAIL
              </label>
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  width: '100%', padding: '14px 16px',
                  background: '#0D0D12', border: '0.5px solid #2a2a3a',
                  borderRadius: 10, color: '#F0EDE8', fontSize: 14,
                  outline: 'none', fontFamily: 'DM Sans, sans-serif',
                }}
              />
            </div>

            {/* Mot de passe */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 8, fontWeight: 500 }}>
                MOT DE PASSE
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{
                  width: '100%', padding: '14px 16px',
                  background: '#0D0D12', border: '0.5px solid #2a2a3a',
                  borderRadius: 10, color: '#F0EDE8', fontSize: 14,
                  outline: 'none', fontFamily: 'DM Sans, sans-serif',
                }}
              />
            </div>

            {/* Erreur */}
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                background: '#1a0a0a', border: '0.5px solid #2a1010',
                fontSize: 13, color: '#f87171',
              }}>
                {error}
              </div>
            )}

            {/* Bouton connexion */}
            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? '#a08030' : '#C9A84C',
                border: 'none', borderRadius: 10,
                color: '#0D0D12', fontSize: 15, fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                transition: 'background 0.2s',
              }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
              <div style={{ flex: 1, height: '0.5px', background: '#2a2a3a' }} />
              <span style={{ fontSize: 12, color: '#444' }}>ou</span>
              <div style={{ flex: 1, height: '0.5px', background: '#2a2a3a' }} />
            </div>

            {/* Lien inscription */}
            <p style={{ textAlign: 'center', fontSize: 13, color: '#555' }}>
              Pas encore de compte ?{' '}
              <a href="/auth/signup" style={{ color: '#C9A84C', textDecoration: 'none', fontWeight: 500 }}>
                S'inscrire
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
