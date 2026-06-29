'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'

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

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user); setEmail(user.email || '')
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) { setFullName(data.full_name || ''); setPhone(data.phone || '') }
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
    <div style={{ minHeight: '100vh', fontFamily: 'Nexa, sans-serif', paddingTop: 72, direction: isAr ? 'rtl' : 'ltr' }}>
      <style suppressHydrationWarning>{`* { box-sizing: border-box; margin: 0; padding: 0; } ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #5A3DF044; border-radius: 2px; }`}</style>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: 8, fontSize: 10, color: 'var(--accent)', letterSpacing: '0.12em', fontWeight: 800 }}>{t('settings.myAccount')}</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--tx)', marginBottom: 32 }}>{t('settings.title')}</h1>

        <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', marginBottom: 32 }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              style={{ padding: '12px 24px', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`, color: activeTab === tab.id ? 'var(--accent)' : 'var(--tx3)', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'profil' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 16 }}>{t('settings.avatar')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>
                  {(fullName || email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', marginBottom: 4 }}>{fullName || t('settings.myProfile')}</div>
                  <div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300 }}>{email}</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '24px' }}>
              <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 20 }}>{t('settings.personalInfo')}</div>
              {[
                { label: t('settings.fullName'), value: fullName, setter: setFullName, placeholder: 'Karim Benali', type: 'text' },
                { label: t('settings.phone'),    value: phone,    setter: setPhone,    placeholder: '0555 123 456', type: 'tel' },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 8, fontWeight: 800, letterSpacing: '0.06em' }}>{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder} className="field"/>
                </div>
              ))}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 8, fontWeight: 800, letterSpacing: '0.06em' }}>{t('settings.email')}</label>
                <input type="email" value={email} disabled className="field" style={{ color: 'var(--tx3)', cursor: 'not-allowed' }}/>
              </div>
              <button onClick={saveProfile} disabled={saving} className={saved ? 'btn-success btn-block' : 'btn-primary btn-block'}>
                {saving ? t('settings.saving') : saved ? t('settings.saved') : t('settings.save')}
              </button>
            </div>

            <div className="card" style={{ padding: '8px 24px' }}>
              <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 800, letterSpacing: '0.06em', margin: '16px 0 4px' }}>{t('settings.legalSection')}</div>
              {[
                { l: t('home.footerLegal'),   h: '/mentions' },
                { l: t('home.footerCgu'),     h: '/cgu' },
                { l: t('home.footerPrivacy'), h: '/confidentialite' },
                { l: t('nav.help'),           h: '/aide' },
              ].map((item, i, arr) => (
                <div key={item.h} onClick={() => router.push(item.h)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none', cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, fontWeight: 300, color: 'var(--tx2)' }}>{item.l}</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth="2" style={{ transform: isAr ? 'rotate(180deg)' : 'none', flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
                </div>
              ))}
            </div>

            <div className="card" style={{ borderColor: '#ef444433', padding: '24px' }}>
              <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 12 }}>{t('settings.dangerZone')}</div>
              <p style={{ fontSize: 13, color: 'var(--tx3)', fontWeight: 300, marginBottom: 16, lineHeight: 1.6 }}>
                {t('settings.deleteAccDesc')}
              </p>
              <button onClick={async () => { if (confirm(t('settings.deleteAccConfirm'))) { await supabase.auth.signOut(); router.push('/') } }}
                className="btn-ghost btn-sm" style={{ color: '#ef4444', borderColor: '#ef4444' }}>
                {t('settings.deleteAcc')}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'securite' && (
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 20 }}>{t('settings.changePass')}</div>
            <p style={{ fontSize: 13, color: 'var(--tx3)', fontWeight: 300, marginBottom: 20, lineHeight: 1.6 }}>
              {t('settings.passwordResetSub')} <strong style={{ color: 'var(--tx)' }}>{email}</strong>
            </p>
            <button onClick={async () => { await supabase.auth.resetPasswordForEmail(email); alert(t('settings.resetSent')) }}
              className="btn-primary btn-sm">
              {t('settings.changePass')}
            </button>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 20 }}>
              {t('settings.notifTitle')}
            </div>
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '0.5px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>{desc}</div>
      </div>
      <div onClick={() => setOn(!on)} style={{ width: 40, height: 22, borderRadius: 11, background: on ? '#0a3020' : 'var(--bg3)', border: `0.5px solid ${on ? '#10b981' : 'var(--border)'}`, cursor: 'pointer', position: 'relative', transition: 'all 0.3s', flexShrink: 0 }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: on ? '#10b981' : 'var(--tx3)', position: 'absolute', top: 2, left: on ? 20 : 2, transition: 'all 0.3s' }}/>
      </div>
    </div>
  )
}
