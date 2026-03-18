'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [role, setRole] = useState<'client' | 'artisan' | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSignup = async () => {
    if (!role) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role }
      }
    })
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => {
        router.push(role === 'artisan' ? '/artisan-dashboard' : '/mon-espace')
      }, 2000)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Nexa, sans-serif' }}>
        <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 20, padding: '48px 36px', maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#F0EDE8', marginBottom: 12 }}>Compte créé !</h2>
          <p style={{ fontSize: 13, color: '#555', lineHeight: 1.7, marginBottom: 28 }}>
            Bienvenue sur BETI <strong style={{ color: '#C9A84C' }}>{fullName}</strong> !<br/>Redirection en cours...
          </p>
          <div style={{ height: 3, background: '#1a1a2a', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#C9A84C', borderRadius: 2, animation: 'load 2s linear forwards' }}/>
          </div>
          <style>{`@keyframes load { from{width:0} to{width:100%} }`}</style>
        </div>
      </div>
    )
  }

  return (
    <>
      <style suppressHydrationWarning>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0D0D12; font-family: Nexa, sans-serif; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)', backgroundSize: '64px 64px' }}/>

        <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, background: '#C9A84C', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#0D0D12' }}>B</div>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#F0EDE8', letterSpacing: '0.08em' }}>BETI</span>
            </a>
          </div>

          {/* Étapes */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 32, justifyContent: 'center' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 3, width: 48, borderRadius: 2, background: i <= step ? '#C9A84C' : '#2a2a3a', transition: 'background 0.3s' }}/>
            ))}
          </div>

          {/* Card */}
          <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 20, padding: '40px 36px' }}>

            {/* Étape 1 — Rôle */}
            {step === 1 && (
              <>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8', marginBottom: 8 }}>Bienvenue sur BETI</h1>
                <p style={{ fontSize: 13, color: '#555', marginBottom: 32, fontWeight: 300 }}>Vous êtes ?</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                  {[
                    { value: 'client',  icon: '👤', title: 'Un client',  desc: "Je cherche un artisan pour un service à domicile" },
                    { value: 'artisan', icon: '🔧', title: 'Un artisan', desc: "Je propose mes services sur la plateforme BETI" },
                  ].map(opt => (
                    <div key={opt.value} onClick={() => setRole(opt.value as 'client' | 'artisan')}
                      style={{ padding: '18px 20px', borderRadius: 12, cursor: 'pointer', border: `0.5px solid ${role === opt.value ? '#C9A84C' : '#2a2a3a'}`, background: role === opt.value ? '#1a1508' : '#0D0D12', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 16 }}
                    >
                      <span style={{ fontSize: 28 }}>{opt.icon}</span>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', marginBottom: 4 }}>{opt.title}</div>
                        <div style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>{opt.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={() => role && setStep(2)}
                  style={{ width: '100%', padding: '14px', background: role ? '#C9A84C' : '#1a1a2a', border: 'none', borderRadius: 10, color: role ? '#0D0D12' : '#444', fontSize: 14, fontWeight: 800, cursor: role ? 'pointer' : 'not-allowed', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s' }}
                >Continuer →</button>

                <p style={{ textAlign: 'center', fontSize: 13, color: '#555', marginTop: 24 }}>
                  Déjà un compte ?{' '}
                  <a href="/auth/login" style={{ color: '#C9A84C', textDecoration: 'none', fontWeight: 800 }}>Se connecter</a>
                </p>
              </>
            )}

            {/* Étape 2 — Infos */}
            {step === 2 && (
              <>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8', marginBottom: 8 }}>Vos informations</h1>
                <p style={{ fontSize: 13, color: '#555', marginBottom: 32, fontWeight: 300 }}>Créez votre compte BETI</p>

                {[
                  { label: 'NOM COMPLET', type: 'text',     placeholder: 'Karim Benali',      value: fullName,  setter: setFullName },
                  { label: 'EMAIL',       type: 'email',    placeholder: 'votre@email.com',   value: email,     setter: setEmail },
                  { label: 'MOT DE PASSE',type: 'password', placeholder: 'Min. 6 caractères', value: password,  setter: setPassword },
                ].map(f => (
                  <div key={f.label} style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 8, fontWeight: 800, letterSpacing: '0.06em' }}>{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder} value={f.value}
                      onChange={e => f.setter(e.target.value)}
                      style={{ width: '100%', padding: '13px 16px', background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#F0EDE8', fontSize: 14, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}
                    />
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button onClick={() => setStep(1)}
                    style={{ flex: 1, padding: '13px', background: 'transparent', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#666', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}
                  >← Retour</button>
                  <button onClick={() => fullName && email && password.length >= 6 && setStep(3)}
                    style={{ flex: 2, padding: '13px', background: fullName && email && password.length >= 6 ? '#C9A84C' : '#1a1a2a', border: 'none', borderRadius: 10, color: fullName && email && password.length >= 6 ? '#0D0D12' : '#444', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}
                  >Continuer →</button>
                </div>
              </>
            )}

            {/* Étape 3 — Confirmation */}
            {step === 3 && (
              <>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8', marginBottom: 8 }}>Confirmation</h1>
                <p style={{ fontSize: 13, color: '#555', marginBottom: 28, fontWeight: 300 }}>Vérifiez vos informations</p>

                <div style={{ background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 12, padding: '20px', marginBottom: 24 }}>
                  {[
                    { label: 'Rôle',  value: role === 'client' ? '👤 Client' : '🔧 Artisan' },
                    { label: 'Nom',   value: fullName },
                    { label: 'Email', value: email },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #1e1e2a' }}>
                      <span style={{ fontSize: 12, color: '#555' }}>{item.label}</span>
                      <span style={{ fontSize: 13, color: '#F0EDE8', fontWeight: 800 }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {error && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#1a0a0a', border: '0.5px solid #2a1010', fontSize: 13, color: '#f87171' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep(2)}
                    style={{ flex: 1, padding: '13px', background: 'transparent', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#666', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}
                  >← Retour</button>
                  <button onClick={handleSignup} disabled={loading}
                    style={{ flex: 2, padding: '13px', background: loading ? '#a08030' : '#C9A84C', border: 'none', borderRadius: 10, color: '#0D0D12', fontSize: 13, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Nexa, sans-serif' }}
                  >{loading ? 'Création...' : 'Créer mon compte'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
