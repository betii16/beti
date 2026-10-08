'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { fetchMyPhone } from '@/lib/phones'

const SCOPE_CSS = `.set-scope :is(a,button):focus-visible{outline:2px solid var(--accent);outline-offset:2px}`
const H2: React.CSSProperties = { fontSize: 12, color: 'var(--tx2)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 18 }
const LBL: React.CSSProperties = { fontSize: 12, color: 'var(--tx2)', display: 'block', marginBottom: 8, fontWeight: 700, letterSpacing: '0.02em' }

// Interrupteur accessible (role=switch), zone tactile 44px, couleurs du thème.
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

export default function ParametresPage() {
  const router = useRouter()
  const { t, isAr } = useLang()
  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'profil' | 'securite' | 'notifications'>('profil')
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user); setEmail(user.email || '')
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) { setFullName(data.full_name || ''); setPhone(await fetchMyPhone(user.id, data.phone)) }
    }
    init()
  }, [])

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const TABS = [
    { id: 'profil',        label: t('settings.profile')       },
    { id: 'securite',      label: t('settings.security')      },
    { id: 'notifications', label: t('settings.notifications') },
  ]

  return (
    <div className="set-scope" style={{ minHeight: '100vh', paddingTop: 72, direction: isAr ? 'rtl' : 'ltr' }}>
      {/* (ancien reset global « * { margin:0; padding:0 } » supprimé : il fuyait sur toute l'app) */}
      <style>{SCOPE_CSS}</style>
      <div className="page-pad-m" style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px 48px' }}>
        <div className="section-label">{t('settings.myAccount')}</div>
        <h1 style={{ fontSize: 'clamp(24px, 6vw, 30px)', lineHeight: 1.15, fontWeight: 800, color: 'var(--tx)', marginBottom: 24 }}>{t('settings.title')}</h1>

        <div role="tablist" className="no-scrollbar" style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24, overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id as any)}
              style={{ padding: '12px 18px', minHeight: 46, marginBottom: -1, whiteSpace: 'nowrap', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`, color: activeTab === tab.id ? 'var(--accent)' : 'var(--tx2)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'profil' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={H2}>{t('settings.avatar')}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div aria-hidden style={{ width: 64, height: 64, flexShrink: 0, borderRadius: '50%', background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>
                  {(fullName || email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', marginBottom: 4 }}>{fullName || t('settings.myProfile')}</div>
                  <div style={{ fontSize: 13, color: 'var(--tx2)', overflowWrap: 'anywhere' }}>{email}</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '24px' }}>
              <h2 style={H2}>{t('settings.personalInfo')}</h2>
              {[
                { id: 'set-name',  label: t('settings.fullName'), value: fullName, setter: setFullName, placeholder: 'Karim Benali', type: 'text', ac: 'name' },
                { id: 'set-phone', label: t('settings.phone'),    value: phone,    setter: setPhone,    placeholder: '0555 123 456', type: 'tel', ac: 'tel' },
              ].map(f => (
                <div key={f.id} style={{ marginBottom: 16 }}>
                  <label htmlFor={f.id} style={LBL}>{f.label}</label>
                  <input id={f.id} type={f.type} autoComplete={f.ac} value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder} className="field"/>
                </div>
              ))}
              <div style={{ marginBottom: 20 }}>
                <label htmlFor="set-email" style={LBL}>{t('settings.email')}</label>
                <input id="set-email" type="email" value={email} disabled className="field" style={{ color: 'var(--tx2)', background: 'var(--bg3)', cursor: 'not-allowed' }}/>
              </div>
              <button onClick={saveProfile} disabled={saving} aria-live="polite" className={saved ? 'btn-success btn-block' : 'btn-primary btn-block'} style={{ minHeight: 46 }}>
                {saving ? t('settings.saving') : saved ? t('settings.saved') : t('settings.save')}
              </button>
            </div>

            <div className="card" style={{ padding: '8px 24px' }}>
              <h2 style={{ ...H2, margin: '16px 0 4px' }}>{t('settings.legalSection')}</h2>
              {[
                { l: t('home.footerLegal'),   h: '/mentions' },
                { l: t('home.footerCgu'),     h: '/cgu' },
                { l: t('home.footerPrivacy'), h: '/confidentialite' },
                { l: t('nav.help'),           h: '/aide' },
              ].map((item, i, arr) => (
                <Link key={item.h} href={item.h}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48, padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', textDecoration: 'none' }}>
                  <span style={{ fontSize: 14, color: 'var(--tx)' }}>{item.l}</span>
                  <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tx2)" strokeWidth="2" style={{ transform: isAr ? 'rotate(180deg)' : 'none', flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
                </Link>
              ))}
            </div>

            <div className="card" style={{ borderColor: 'color-mix(in srgb, var(--danger) 35%, var(--border))', padding: '24px' }}>
              <h2 style={{ ...H2, color: 'var(--danger)', marginBottom: 12 }}>{t('settings.dangerZone')}</h2>
              <p style={{ fontSize: 14, color: 'var(--tx2)', marginBottom: 16, lineHeight: 1.6 }}>
                {t('settings.deleteAccDesc')}
              </p>
              <button onClick={async () => {
                if (!confirm(t('settings.deleteAccConfirm'))) return
                const { data: { session } } = await supabase.auth.getSession()
                const res = await fetch('/api/account/delete', { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token || ''}` } }).catch(() => null)
                if (!res || !res.ok) { alert(t('common.errGeneric')); return }
                await supabase.auth.signOut(); router.push('/')
              }}
                className="btn-ghost btn-sm" style={{ color: 'var(--danger)', borderColor: 'color-mix(in srgb, var(--danger) 55%, transparent)', minHeight: 44 }}>
                {t('settings.deleteAcc')}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'securite' && (
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={H2}>{t('settings.changePass')}</h2>
            {email && <p style={{ fontSize: 14, color: 'var(--tx2)', marginBottom: 20, lineHeight: 1.6 }}>
              {t('settings.passwordResetSub')} <strong style={{ color: 'var(--tx)', overflowWrap: 'anywhere' }}>{email}</strong>
            </p>}
            {resetSent && (
              <div role="status" style={{ background: 'color-mix(in srgb, var(--success) 11%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 32%, transparent)', borderRadius: 'var(--r-field)', padding: '11px 14px', marginBottom: 16, fontSize: 14, color: 'var(--tx)', fontWeight: 600 }}>{t('settings.resetSent')}</div>
            )}
            {email ? (
              <button onClick={async () => {
                const { error } = await supabase.auth.resetPasswordForEmail(email)
                if (error) { alert(error.message); return }
                setResetSent(true)
              }}
                className="btn-primary btn-sm" style={{ minHeight: 44 }}>
                {t('settings.changePass')}
              </button>
            ) : (
              <p style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.6 }}>
                {isAr ? 'حسابك مرتبط برقم هاتفك ويتم الدخول عبر رمز واتساب، لا توجد كلمة مرور لتغييرها.' : 'Ton compte est lié à ton numéro de téléphone et se connecte par code WhatsApp : il n’y a pas de mot de passe à changer.'}
              </p>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={H2}>{t('settings.notifTitle')}</h2>
            {[
              { label: t('settings.notifAccepted'),    desc: t('settings.notifAcceptedSub'),    on: true  },
              { label: t('settings.notifRefused'),     desc: t('settings.notifRefusedSub'),     on: true  },
              { label: t('settings.notifCompleted'),   desc: t('settings.notifCompletedSub'),   on: true  },
              { label: t('settings.notifNewArtisans'), desc: t('settings.notifNewArtisansSub'), on: false },
              { label: t('settings.notifOffers'),      desc: t('settings.notifOffersSub'),      on: false },
            ].map(n => <NotifToggle key={n.label} label={n.label} desc={n.desc} defaultOn={n.on}/>)}
          </div>
        )}
      </div>
    </div>
  )
}

function NotifToggle({ label, desc, defaultOn }: { label: string; desc: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.45 }}>{desc}</div>
      </div>
      <Switch on={on} onChange={setOn} label={label} />
    </div>
  )
}
