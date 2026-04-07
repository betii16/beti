'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Parametres() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'profil' | 'securite' | 'notifications'>('profil')

  // Profil
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingProfil, setSavingProfil] = useState(false)
  const [profilMsg, setProfilMsg] = useState('')

  // Sécurité
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingSecurite, setSavingSecurite] = useState(false)
  const [securiteMsg, setSecuriteMsg] = useState('')

  // Préférences notifs
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifSms, setNotifSms] = useState(false)
  const [savingNotifs, setSavingNotifs] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)
      setNewEmail(user.email || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, notif_email, notif_sms')
        .eq('id', user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name || '')
        setPhone(profile.phone || '')
        setNotifEmail(profile.notif_email ?? true)
        setNotifSms(profile.notif_sms ?? false)
      }
      setLoading(false)
    }
    init()
  }, [])

  const saveProfil = async () => {
    setSavingProfil(true)
    await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id)
    setProfilMsg('Profil mis à jour ✓')
    setSavingProfil(false)
    setTimeout(() => setProfilMsg(''), 3000)
  }

  const saveSecurite = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      setSecuriteMsg('Les mots de passe ne correspondent pas')
      return
    }
    setSavingSecurite(true)
    if (newEmail !== user.email) await supabase.auth.updateUser({ email: newEmail })
    if (newPassword) await supabase.auth.updateUser({ password: newPassword })
    setSecuriteMsg('Informations mises à jour ✓')
    setSavingSecurite(false)
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setSecuriteMsg(''), 3000)
  }

  const saveNotifs = async () => {
    setSavingNotifs(true)
    await supabase.from('profiles').update({ notif_email: notifEmail, notif_sms: notifSms }).eq('id', user.id)
    setSavingNotifs(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const inputStyle = {
    width: '100%', background: '#0D0D12', border: '0.5px solid #2a2a3a',
    borderRadius: 10, padding: '12px 14px', color: '#F0EDE8', fontSize: 13,
    fontFamily: 'Nexa, sans-serif', fontWeight: 300, outline: 'none',
  } as React.CSSProperties

  const labelStyle = { fontSize: 12, color: '#555', fontWeight: 300, marginBottom: 8, display: 'block' } as React.CSSProperties

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <div onClick={() => onChange(!value)}
      style={{ width: 44, height: 24, borderRadius: 12, background: value ? '#0a3020' : '#1a1a2a', border: `0.5px solid ${value ? '#4ade80' : '#2a2a3a'}`, cursor: 'pointer', position: 'relative', transition: 'all 0.3s', flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', background: value ? '#4ade80' : '#555', position: 'absolute', top: 2, left: value ? 22 : 3, transition: 'all 0.3s', boxShadow: value ? '0 0 8px #4ade8088' : 'none' }}/>
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: '#555', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>Chargement...</div>
    </div>
  )

  const sections = [
    { id: 'profil',        icon: '👤', label: 'Profil'        },
    { id: 'securite',      icon: '🔒', label: 'Sécurité'      },
    { id: 'notifications', icon: '🔔', label: 'Notifications' },
  ]

  return (
    <div style={{ paddingTop: 64, minHeight: '100vh', background: '#0D0D12', fontFamily: 'Nexa, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#09090f', borderBottom: '0.5px solid #1e1e2a', padding: '32px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 6 }}>MON COMPTE</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8' }}>Paramètres</h1>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 40px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28, alignItems: 'start' }}>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id as any)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: activeSection === s.id ? '#1e1e2a' : 'transparent', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', textAlign: 'left', transition: 'background 0.15s' }}>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
              <span style={{ fontSize: 13, color: activeSection === s.id ? '#F0EDE8' : '#555', fontWeight: activeSection === s.id ? 800 : 300 }}>{s.label}</span>
            </button>
          ))}

          <div style={{ height: '0.5px', background: '#1e1e2a', margin: '8px 0' }}/>

          <button onClick={handleSignOut}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'transparent', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1a0a0a')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span style={{ fontSize: 16 }}>🚪</span>
            <span style={{ fontSize: 13, color: '#f87171', fontWeight: 300 }}>Déconnexion</span>
          </button>
        </div>

        {/* Contenu */}
        <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 16, padding: '28px' }}>

          {/* Profil */}
          {activeSection === 'profil' && (
            <div>
              <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 24 }}>INFORMATIONS PERSONNELLES</div>

              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#C9A84C22', border: '1.5px solid #C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#C9A84C' }}>
                  {(user.email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8' }}>{fullName || user.email}</div>
                  <div style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>Compte client</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>Nom complet</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Votre nom" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Téléphone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+213 XX XX XX XX" style={inputStyle}/>
                </div>
              </div>

              {profilMsg && (
                <div style={{ background: '#0a2010', border: '0.5px solid #4ade8044', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#4ade80', fontWeight: 300 }}>{profilMsg}</div>
              )}

              <button onClick={saveProfil} disabled={savingProfil}
                style={{ padding: '11px 28px', background: '#C9A84C', border: 'none', borderRadius: 10, color: '#0D0D12', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                {savingProfil ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          )}

          {/* Sécurité */}
          {activeSection === 'securite' && (
            <div>
              <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 24 }}>SÉCURITÉ DU COMPTE</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>Adresse email</label>
                  <input value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" style={inputStyle}/>
                </div>
                <div style={{ height: '0.5px', background: '#1e1e2a' }}/>
                <div>
                  <label style={labelStyle}>Nouveau mot de passe</label>
                  <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="Laisser vide pour ne pas changer" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Confirmer le mot de passe</label>
                  <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder="Répéter le mot de passe" style={inputStyle}/>
                </div>
              </div>

              {securiteMsg && (
                <div style={{ background: securiteMsg.includes('✓') ? '#0a2010' : '#1a0a0a', border: `0.5px solid ${securiteMsg.includes('✓') ? '#4ade8044' : '#f8717144'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: securiteMsg.includes('✓') ? '#4ade80' : '#f87171', fontWeight: 300 }}>{securiteMsg}</div>
              )}

              <button onClick={saveSecurite} disabled={savingSecurite}
                style={{ padding: '11px 28px', background: '#C9A84C', border: 'none', borderRadius: 10, color: '#0D0D12', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                {savingSecurite ? 'Sauvegarde...' : 'Mettre à jour'}
              </button>
            </div>
          )}

          {/* Notifications */}
          {activeSection === 'notifications' && (
            <div>
              <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 24 }}>PRÉFÉRENCES DE NOTIFICATIONS</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {[
                  { label: 'Notifications par email', sub: 'Recevez les mises à jour sur vos réservations', value: notifEmail, set: setNotifEmail },
                  { label: 'Notifications par SMS', sub: 'Alertes urgentes sur votre téléphone', value: notifSms, set: setNotifSms },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#0D0D12', borderRadius: 12, border: '0.5px solid #1e1e2a' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#F0EDE8', marginBottom: 3 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>{item.sub}</div>
                    </div>
                    <Toggle value={item.value} onChange={item.set}/>
                  </div>
                ))}
              </div>

              <button onClick={saveNotifs} disabled={savingNotifs}
                style={{ marginTop: 24, padding: '11px 28px', background: '#C9A84C', border: 'none', borderRadius: 10, color: '#0D0D12', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                {savingNotifs ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


