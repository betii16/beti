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
    <div style={{ minHeight: '100vh', background: '#0b0b12', fontFamily: 'Nexa, sans-serif', paddingTop: 72, direction: isAr ? 'rtl' : 'ltr' }}>
      <style suppressHydrationWarning>{`* { box-sizing: border-box; margin: 0; padding: 0; } ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #6366f144; border-radius: 2px; }`}</style>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: 8, fontSize: 10, color: '#6366f1', letterSpacing: '0.12em', fontWeight: 800 }}>{t('settings.myAccount')}</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e0dfe5', marginBottom: 32 }}>{t('settings.title')}</h1>

        <div style={{ display: 'flex', borderBottom: '0.5px solid #1c1c30', marginBottom: 32 }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              style={{ padding: '12px 24px', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? '#6366f1' : 'transparent'}`, color: activeTab === tab.id ? '#6366f1' : '#4a4a65', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'profil' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: '#13131e', border: '0.5px solid #1c1c30', borderRadius: 16, padding: '24px' }}>
              <div style={{ fontSize: 11, color: '#8585a0', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 16 }}>{t('settings.avatar')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#6366f122', border: '2px solid #6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#6366f1' }}>
                  {(fullName || email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#e0dfe5', marginBottom: 4 }}>{fullName || (isAr ? 'ملفي الشخصي' : 'Mon profil')}</div>
                  <div style={{ fontSize: 12, color: '#4a4a65', fontWeight: 300 }}>{email}</div>
                </div>
              </div>
            </div>

            <div style={{ background: '#13131e', border: '0.5px solid #1c1c30', borderRadius: 16, padding: '24px' }}>
              <div style={{ fontSize: 11, color: '#8585a0', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 20 }}>{t('settings.personalInfo')}</div>
              {[
                { label: t('settings.fullName'), value: fullName, setter: setFullName, placeholder: 'Karim Benali', type: 'text' },
                { label: t('settings.phone'),    value: phone,    setter: setPhone,    placeholder: '0555 123 456', type: 'tel' },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: '#8585a0', display: 'block', marginBottom: 8, fontWeight: 800, letterSpacing: '0.06em' }}>{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder}
                    style={{ width: '100%', padding: '12px 16px', background: '#0b0b12', border: '0.5px solid #1c1c30', borderRadius: 10, color: '#e0dfe5', fontSize: 13, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}/>
                </div>
              ))}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: '#8585a0', display: 'block', marginBottom: 8, fontWeight: 800, letterSpacing: '0.06em' }}>{t('settings.email')}</label>
                <input type="email" value={email} disabled style={{ width: '100%', padding: '12px 16px', background: '#0a0a12', border: '0.5px solid #1c1c30', borderRadius: 10, color: '#4a4a65', fontSize: 13, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300, cursor: 'not-allowed' }}/>
              </div>
              <button onClick={saveProfile} disabled={saving}
                style={{ width: '100%', padding: '13px', background: saved ? '#10b98112' : '#6366f1', border: saved ? '0.5px solid #10b98144' : 'none', borderRadius: 10, color: saved ? '#10b981' : '#0b0b12', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.3s' }}>
                {saving ? t('settings.saving') : saved ? t('settings.saved') : t('settings.save')}
              </button>
            </div>

            <div style={{ background: '#1a0505', border: '0.5px solid #ef444420', borderRadius: 16, padding: '24px' }}>
              <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 12 }}>{t('settings.dangerZone')}</div>
              <p style={{ fontSize: 13, color: '#8585a0', fontWeight: 300, marginBottom: 16, lineHeight: 1.6 }}>
                {isAr ? 'حذف حسابك نهائي. ستُمحى جميع بياناتك.' : 'La suppression de votre compte est définitive. Toutes vos données seront effacées.'}
              </p>
              <button onClick={async () => { if (confirm(isAr ? 'هل أنت متأكد؟' : 'Êtes-vous sûr?')) { await supabase.auth.signOut(); router.push('/') } }}
                style={{ padding: '10px 20px', background: 'transparent', border: '0.5px solid #ef4444', borderRadius: 10, color: '#ef4444', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                {t('settings.deleteAcc')}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'securite' && (
          <div style={{ background: '#13131e', border: '0.5px solid #1c1c30', borderRadius: 16, padding: '24px' }}>
            <div style={{ fontSize: 11, color: '#8585a0', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 20 }}>{isAr ? 'كلمة المرور' : 'MOT DE PASSE'}</div>
            <p style={{ fontSize: 13, color: '#4a4a65', fontWeight: 300, marginBottom: 20, lineHeight: 1.6 }}>
              {isAr ? 'سيتم إرسال بريد إعادة التعيين إلى' : 'Un email de réinitialisation sera envoyé à'} <strong style={{ color: '#e0dfe5' }}>{email}</strong>
            </p>
            <button onClick={async () => { await supabase.auth.resetPasswordForEmail(email); alert(isAr ? 'تم الإرسال!' : 'Email envoyé !') }}
              style={{ padding: '12px 24px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 10, color: '#0b0b12', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
              {t('settings.changePass')}
            </button>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div style={{ background: '#13131e', border: '0.5px solid #1c1c30', borderRadius: 16, padding: '24px' }}>
            <div style={{ fontSize: 11, color: '#8585a0', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 20 }}>
              {isAr ? 'تفضيلات الإشعارات' : 'PRÉFÉRENCES DE NOTIFICATIONS'}
            </div>
            {[
              { label: isAr ? 'حجز مقبول' : 'Réservation acceptée',  desc: isAr ? 'عندما يقبل حرفي طلبك' : 'Quand un artisan accepte votre demande', on: true },
              { label: isAr ? 'حجز مرفوض' : 'Réservation refusée',   desc: isAr ? 'عندما يرفض حرفي طلبك' : 'Quand un artisan refuse votre demande',  on: true },
              { label: isAr ? 'مهمة مكتملة' : 'Mission terminée',    desc: isAr ? 'عند اكتمال المهمة' : 'Quand une mission est terminée',            on: true },
              { label: isAr ? 'حرفيون جدد' : 'Nouveaux artisans',    desc: isAr ? 'حرفيون متاحون بالقرب' : 'Artisans disponibles près de vous',       on: false },
              { label: isAr ? 'عروض BETI' : 'Offres BETI',           desc: isAr ? 'عروض وأخبار BETI' : 'Promotions et actualités BETI',               on: false },
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '0.5px solid #1c1c30' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#e0dfe5', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 11, color: '#4a4a65', fontWeight: 300 }}>{desc}</div>
      </div>
      <div onClick={() => setOn(!on)} style={{ width: 40, height: 22, borderRadius: 11, background: on ? '#0a3020' : '#1a1a2a', border: `0.5px solid ${on ? '#10b981' : '#1c1c30'}`, cursor: 'pointer', position: 'relative', transition: 'all 0.3s', flexShrink: 0 }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: on ? '#10b981' : '#4a4a65', position: 'absolute', top: 2, left: on ? 20 : 2, transition: 'all 0.3s' }}/>
      </div>
    </div>
  )
}
