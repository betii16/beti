'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { User, Lock, Bell, LogOut } from 'lucide-react'

export default function Parametres() {
  const router = useRouter()
  const { t, isAr } = useLang()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'profil' | 'securite' | 'notifications'>('profil')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingProfil, setSavingProfil] = useState(false)
  const [profilOk, setProfilOk] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingSecurite, setSavingSecurite] = useState(false)
  const [securiteOk, setSecuriteOk] = useState(false)
  const [passwordError, setPasswordError] = useState(false)

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
    setProfilOk(true)
    setSavingProfil(false)
    setTimeout(() => setProfilOk(false), 3000)
  }

  const saveSecurite = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      setPasswordError(true)
      setTimeout(() => setPasswordError(false), 3000)
      return
    }
    setSavingSecurite(true)
    if (newEmail !== user.email) await supabase.auth.updateUser({ email: newEmail })
    if (newPassword) await supabase.auth.updateUser({ password: newPassword })
    setSecuriteOk(true)
    setSavingSecurite(false)
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setSecuriteOk(false), 3000)
  }

  const saveNotifs = async () => {
    setSavingNotifs(true)
    await supabase.from('profiles').update({ notif_email: notifEmail, notif_sms: notifSms }).eq('id', user.id)
    setSavingNotifs(false)
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg)', border: '0.5px solid var(--border)',
    borderRadius: 10, padding: '12px 14px', color: 'var(--tx)', fontSize: 13,
    fontFamily: 'Nexa, sans-serif', fontWeight: 300, outline: 'none',
  } as React.CSSProperties

  const labelStyle = { fontSize: 12, color: 'var(--tx3)', fontWeight: 300, marginBottom: 8, display: 'block' } as React.CSSProperties

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <div onClick={() => onChange(!value)}
      style={{ width: 44, height: 24, borderRadius: 12, background: value ? '#0a3020' : 'var(--bg3)', border: `0.5px solid ${value ? '#10b981' : 'var(--border)'}`, cursor: 'pointer', position: 'relative', transition: 'all 0.3s', flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', background: value ? '#10b981' : 'var(--tx3)', position: 'absolute', top: 2, left: value ? 22 : 3, transition: 'all 0.3s', boxShadow: value ? '0 0 8px #10b98188' : 'none' }}/>
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: 'var(--tx3)', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>{t('common.loading')}</div>
    </div>
  )

  const sections = [
    { id: 'profil',        Icon: User, label: t('settings.profile')       },
    { id: 'securite',      Icon: Lock, label: t('settings.security')      },
    { id: 'notifications', Icon: Bell, label: t('settings.notifications') },
  ]

  return (
    <div style={{ paddingTop: 64, minHeight: '100vh', fontFamily: 'Nexa, sans-serif', direction: isAr ? 'rtl' : 'ltr' }}>

      <div style={{ background: 'var(--bg)', borderBottom: '0.5px solid var(--border)', padding: '32px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 6 }}>{t('settings.myAccount')}</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--tx)' }}>{t('settings.title')}</h1>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 40px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28, alignItems: 'start' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id as any)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: activeSection === s.id ? 'var(--bg3)' : 'transparent', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', textAlign: isAr ? 'right' : 'left', transition: 'background 0.15s' }}>
              <s.Icon size={16} color={activeSection === s.id ? 'var(--tx)' : 'var(--tx3)'}/>
              <span style={{ fontSize: 13, color: activeSection === s.id ? 'var(--tx)' : 'var(--tx3)', fontWeight: activeSection === s.id ? 800 : 300 }}>{s.label}</span>
            </button>
          ))}

          <div style={{ height: '0.5px', background: 'var(--border)', margin: '8px 0' }}/>

          <button onClick={handleSignOut}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'transparent', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', textAlign: isAr ? 'right' : 'left' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#ef444410')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <LogOut size={16} color="#ef4444"/>
            <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 300 }}>{t('settings.logout')}</span>
          </button>
        </div>

        <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 16, padding: '28px' }}>

          {activeSection === 'profil' && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 24 }}>{t('settings.personalInfo')}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1.5px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>
                  {(user.email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)' }}>{fullName || user.email}</div>
                  <div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300 }}>{t('settings.clientAccount')}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>{t('settings.fullName')}</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('settings.fullNamePh')} style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>{t('settings.phone')}</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('settings.phonePh')} style={inputStyle}/>
                </div>
              </div>

              {profilOk && (
                <div style={{ background: '#10b98112', border: '0.5px solid #10b98144', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#10b981', fontWeight: 300 }}>{t('settings.saved')} ✓</div>
              )}

              <button onClick={saveProfil} disabled={savingProfil}
                style={{ padding: '11px 28px', background: 'var(--gradient)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                {savingProfil ? t('settings.saving') : t('settings.save')}
              </button>
            </div>
          )}

          {activeSection === 'securite' && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 24 }}>{t('settings.securityTitle')}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>{t('settings.emailAddress')}</label>
                  <input value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" style={inputStyle}/>
                </div>
                <div style={{ height: '0.5px', background: 'var(--border)' }}/>
                <div>
                  <label style={labelStyle}>{t('settings.newPassword')}</label>
                  <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder={t('settings.newPasswordPh')} style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>{t('settings.confirmPassword')}</label>
                  <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder={t('settings.confirmPasswordPh')} style={inputStyle}/>
                </div>
              </div>

              {passwordError && (
                <div style={{ background: '#ef444410', border: '0.5px solid #ef444444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ef4444', fontWeight: 300 }}>{t('settings.passwordMismatch')}</div>
              )}
              {securiteOk && (
                <div style={{ background: '#10b98112', border: '0.5px solid #10b98144', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#10b981', fontWeight: 300 }}>{t('settings.updated')} ✓</div>
              )}

              <button onClick={saveSecurite} disabled={savingSecurite}
                style={{ padding: '11px 28px', background: 'var(--gradient)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                {savingSecurite ? t('settings.updating') : t('settings.update')}
              </button>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 24 }}>{t('settings.notifTitle')}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {[
                  { label: t('settings.notifEmail'), sub: t('settings.notifEmailSub'), value: notifEmail, set: setNotifEmail },
                  { label: t('settings.notifSms'),   sub: t('settings.notifSmsSub'),   value: notifSms,   set: setNotifSms   },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg)', borderRadius: 12, border: '0.5px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)', marginBottom: 3 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300 }}>{item.sub}</div>
                    </div>
                    <Toggle value={item.value} onChange={item.set}/>
                  </div>
                ))}
              </div>

              <button onClick={saveNotifs} disabled={savingNotifs}
                style={{ marginTop: 24, padding: '11px 28px', background: 'var(--gradient)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                {savingNotifs ? t('settings.saving') : t('settings.save')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }
}
