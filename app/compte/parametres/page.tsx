'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { User, Lock, Bell, LogOut } from 'lucide-react'

const SCOPE_CSS = `.set-scope :is(a,button):focus-visible{outline:2px solid var(--accent);outline-offset:2px}`
const OK_BOX: React.CSSProperties = { background: 'color-mix(in srgb, var(--success) 11%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 32%, transparent)', borderRadius: 'var(--r-field)', padding: '11px 14px', marginBottom: 16, fontSize: 14, color: 'var(--tx)', fontWeight: 600 }

// Interrupteur accessible (role=switch), zone tactile 44px, couleurs du thème.
// Défini hors du composant (l'ancien Toggle était recréé à chaque rendu).
function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      style={{ flexShrink: 0, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 12, cursor: 'pointer', padding: 0 }}>
      <span style={{ width: 44, height: 26, borderRadius: 13, position: 'relative', background: on ? 'var(--success)' : 'var(--bg3)', border: `1px solid ${on ? 'transparent' : 'var(--border2)'}`, transition: 'background .25s ease' }}>
        <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', position: 'absolute', top: 2, insetInlineStart: on ? 21 : 2, transition: 'inset-inline-start .25s ease' }}/>
      </span>
    </button>
  )
}

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
  const [notifsOk, setNotifsOk] = useState(false)

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
    const { error } = await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id)
    if (error) { alert('Enregistrement impossible : ' + error.message); setSavingProfil(false); return }
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
    const emailChanged = newEmail.trim() !== '' && newEmail !== (user.email || '')
    const { error: emailErr } = emailChanged ? await supabase.auth.updateUser({ email: newEmail.trim() }) : { error: null }
    const { error: pwErr } = newPassword ? await supabase.auth.updateUser({ password: newPassword }) : { error: null }
    const err = emailErr || pwErr
    if (err) { alert('Mise à jour impossible : ' + err.message); setSavingSecurite(false); return }
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
    setNotifsOk(true)
    setTimeout(() => setNotifsOk(false), 3000)
  }

  const labelStyle = { fontSize: 12, color: 'var(--tx2)', fontWeight: 700, letterSpacing: '0.02em', marginBottom: 8, display: 'block' } as React.CSSProperties

  if (loading) return (
    <div role="status" aria-label={t('common.loading')} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 64 }}>
      <div className="loader-ring" />
    </div>
  )

  const sections = [
    { id: 'profil',        Icon: User, label: t('settings.profile')       },
    { id: 'securite',      Icon: Lock, label: t('settings.security')      },
    { id: 'notifications', Icon: Bell, label: t('settings.notifications') },
  ]

  return (
    <div className="set-scope" style={{ paddingTop: 64, minHeight: '100vh', direction: isAr ? 'rtl' : 'ltr' }}>
      <style>{SCOPE_CSS}</style>

      <div className="page-x" style={{ borderBottom: '1px solid var(--border)', padding: '32px 40px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="section-label">{t('settings.myAccount')}</div>
          <h1 style={{ fontSize: 'clamp(24px, 6vw, 30px)', lineHeight: 1.15, fontWeight: 800, color: 'var(--tx)' }}>{t('settings.title')}</h1>
        </div>
      </div>

      <div className="grid-collapse page-pad-m" style={{ maxWidth: 900, margin: '0 auto', padding: '32px 40px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28, alignItems: 'start' }}>

        <nav aria-label={t('settings.title')} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sections.map(s => {
            const on = activeSection === s.id
            return (
            <button key={s.id} aria-current={on ? 'page' : undefined} onClick={() => setActiveSection(s.id as any)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 46, padding: '12px 14px', background: on ? 'color-mix(in srgb, var(--accent) 10%, var(--bg2))' : 'transparent', border: 'none', borderRadius: 'var(--r-btn)', cursor: 'pointer', textAlign: 'start', transition: 'background 0.15s' }}>
              <s.Icon size={17} color={on ? 'var(--accent)' : 'var(--tx2)'} aria-hidden/>
              <span style={{ fontSize: 14, color: on ? 'var(--accent)' : 'var(--tx2)', fontWeight: on ? 700 : 500 }}>{s.label}</span>
            </button>
          )})}

          <div aria-hidden style={{ height: 1, background: 'var(--border)', margin: '8px 0' }}/>

          <button onClick={handleSignOut}
            style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 46, padding: '12px 14px', background: 'transparent', border: 'none', borderRadius: 'var(--r-btn)', cursor: 'pointer', textAlign: 'start' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--danger) 9%, transparent)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <LogOut size={17} color="var(--danger)" aria-hidden/>
            <span style={{ fontSize: 14, color: 'var(--danger)', fontWeight: 600 }}>{t('settings.logout')}</span>
          </button>
        </nav>

        <div className="card" style={{ padding: 'clamp(20px, 5vw, 28px)' }}>

          {activeSection === 'profil' && (
            <div>
              <h2 className="section-label" style={{ marginBottom: 20 }}>{t('settings.personalInfo')}</h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
                <div aria-hidden style={{ width: 60, height: 60, flexShrink: 0, borderRadius: '50%', background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1.5px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>
                  {(fullName || user.email || 'U')[0].toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', overflowWrap: 'anywhere' }}>{fullName || user.email}</div>
                  <div style={{ fontSize: 13, color: 'var(--tx2)' }}>{t('settings.clientAccount')}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div>
                  <label htmlFor="acc-name" style={labelStyle}>{t('settings.fullName')}</label>
                  <input id="acc-name" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('settings.fullNamePh')} className="field"/>
                </div>
                <div>
                  <label htmlFor="acc-phone" style={labelStyle}>{t('settings.phone')}</label>
                  <input id="acc-phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('settings.phonePh')} className="field"/>
                </div>
              </div>

              {profilOk && (
                <div role="status" style={OK_BOX}>{t('settings.saved')} ✓</div>
              )}

              <button onClick={saveProfil} disabled={savingProfil}
                className="btn-primary" style={{ minHeight: 46 }}>
                {savingProfil ? t('settings.saving') : t('settings.save')}
              </button>
            </div>
          )}

          {activeSection === 'securite' && (
            <div>
              <h2 className="section-label" style={{ marginBottom: 20 }}>{t('settings.securityTitle')}</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div>
                  <label htmlFor="acc-email" style={labelStyle}>{t('settings.emailAddress')}</label>
                  <input id="acc-email" autoComplete="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" className="field"/>
                </div>
                <div aria-hidden style={{ height: 1, background: 'var(--border)' }}/>
                <div>
                  <label htmlFor="acc-pw" style={labelStyle}>{t('settings.newPassword')}</label>
                  <input id="acc-pw" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder={t('settings.newPasswordPh')} className="field"/>
                </div>
                <div>
                  <label htmlFor="acc-pw2" style={labelStyle}>{t('settings.confirmPassword')}</label>
                  <input id="acc-pw2" autoComplete="new-password" aria-invalid={passwordError} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder={t('settings.confirmPasswordPh')} className="field"/>
                </div>
              </div>

              {passwordError && (
                <div role="alert" style={{ background: 'color-mix(in srgb, var(--danger) 9%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', borderRadius: 'var(--r-field)', padding: '11px 14px', marginBottom: 16, fontSize: 14, color: 'var(--danger)', fontWeight: 600 }}>{t('settings.passwordMismatch')}</div>
              )}
              {securiteOk && (
                <div role="status" style={OK_BOX}>{t('settings.updated')} ✓</div>
              )}

              <button onClick={saveSecurite} disabled={savingSecurite}
                className="btn-primary" style={{ minHeight: 46 }}>
                {savingSecurite ? t('settings.updating') : t('settings.update')}
              </button>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div>
              <h2 className="section-label" style={{ marginBottom: 20 }}>{t('settings.notifTitle')}</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {[
                  { label: t('settings.notifEmail'), sub: t('settings.notifEmailSub'), value: notifEmail, set: setNotifEmail },
                  { label: t('settings.notifSms'),   sub: t('settings.notifSmsSub'),   value: notifSms,   set: setNotifSms   },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingTop: 12, paddingBottom: 12, paddingInlineStart: 16, paddingInlineEnd: 8, background: 'var(--bg)', borderRadius: 'var(--r-field)', border: '1px solid var(--border)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 3 }}>{item.label}</div>
                      <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.45 }}>{item.sub}</div>
                    </div>
                    <Switch on={item.value} onChange={item.set} label={item.label}/>
                  </div>
                ))}
              </div>

              {notifsOk && <div role="status" style={{ ...OK_BOX, marginTop: 18, marginBottom: 0 }}>{t('settings.saved')} ✓</div>}
              <button onClick={saveNotifs} disabled={savingNotifs}
                className="btn-primary" style={{ marginTop: 20, minHeight: 46 }}>
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
