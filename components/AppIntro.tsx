'use client'

// components/AppIntro.tsx
// Écran de premier lancement (façon apps natives) : choix de la langue puis
// court carrousel de présentation. Affiché une seule fois (localStorage), ne
// bloque pas le SEO (rendu uniquement côté client après montage). « S'inscrire
// plus tard » referme l'intro sans forcer la création de compte.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/LangContext'
import type { Lang } from '@/lib/translations'
import { LogoMark } from '@/components/Logo'
import { ShieldCheck, CalendarClock, Banknote } from 'lucide-react'

const DONE_KEY = 'beti-intro-done'

const SLIDES = [
  { Icon: ShieldCheck,   tk: 'intro.s1Title', dk: 'intro.s1Desc' },
  { Icon: CalendarClock, tk: 'intro.s2Title', dk: 'intro.s2Desc' },
  { Icon: Banknote,      tk: 'intro.s3Title', dk: 'intro.s3Desc' },
]

export default function AppIntro() {
  const router = useRouter()
  const { t, setLang, isAr } = useLang()
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0) // 0 = langue · 1..3 = slides

  useEffect(() => {
    try { if (!localStorage.getItem(DONE_KEY)) setShow(true) } catch {}
  }, [])

  if (!show) return null

  const finish = () => {
    try { localStorage.setItem(DONE_KEY, '1') } catch {}
    setShow(false)
  }
  const chooseLang = (l: Lang) => { setLang(l); setStep(1) }
  const goSignup = () => { finish(); router.push('/auth/signup') }

  const isLast = step === SLIDES.length
  const slide = step >= 1 ? SLIDES[step - 1] : null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100000, direction: isAr ? 'rtl' : 'ltr',
      background: 'radial-gradient(120% 80% at 50% 0%, #2a1d63 0%, #0b0b12 62%)',
      display: 'flex', flexDirection: 'column',
      paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      <style>{`@keyframes introIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>

      {/* Barre haute : logo + passer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px' }}>
        <LogoMark size={26} variant="white" />
        {step >= 1 && (
          <button onClick={finish} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {t('intro.skip')}
          </button>
        )}
      </div>

      {/* Contenu central */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 30px', textAlign: 'center' }}>
        {step === 0 ? (
          <div key="lang" style={{ width: '100%', maxWidth: 420, animation: 'introIn 0.4s ease both' }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 8 }}>{t('intro.langTitle')}</h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 300, marginBottom: 34 }}>{t('intro.langSub')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => chooseLang('fr')} style={LANG_BTN}>Français</button>
              <button onClick={() => chooseLang('ar')} style={LANG_BTN}>العربية</button>
            </div>
          </div>
        ) : (
          <div key={step} style={{ width: '100%', maxWidth: 420, animation: 'introIn 0.4s ease both' }}>
            <div style={{ width: 96, height: 96, borderRadius: 28, margin: '0 auto 30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #5A3DF0, #7C5CFF)', boxShadow: '0 18px 50px rgba(90,61,240,0.45)' }}>
              {slide && <slide.Icon size={44} color="#fff" strokeWidth={1.8} />}
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 12, lineHeight: 1.2 }}>{slide && t(slide.tk)}</h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', fontWeight: 300, lineHeight: 1.7 }}>{slide && t(slide.dk)}</p>
          </div>
        )}
      </div>

      {/* Contrôles bas */}
      <div style={{ padding: '0 30px 30px' }}>
        {step >= 1 && (
          <div style={{ display: 'flex', gap: 7, justifyContent: 'center', marginBottom: 24 }}>
            {SLIDES.map((_, i) => (
              <div key={i} style={{ height: 7, borderRadius: 4, transition: 'all 0.3s', width: i === step - 1 ? 24 : 7, background: i === step - 1 ? '#7C5CFF' : 'rgba(255,255,255,0.2)' }} />
            ))}
          </div>
        )}

        {step >= 1 && !isLast && (
          <button onClick={() => setStep(s => s + 1)} style={PRIMARY_BTN}>{t('intro.next')}</button>
        )}

        {isLast && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={goSignup} style={PRIMARY_BTN}>{t('intro.start')}</button>
            <button onClick={finish} style={{ ...PRIMARY_BTN, background: 'transparent', boxShadow: 'none', color: 'rgba(255,255,255,0.7)' }}>{t('intro.later')}</button>
          </div>
        )}
      </div>
    </div>
  )
}

const LANG_BTN: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', borderRadius: 16, cursor: 'pointer',
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', fontSize: 16, fontWeight: 700,
}

const PRIMARY_BTN: React.CSSProperties = {
  width: '100%', padding: '16px', borderRadius: 16, border: 'none', cursor: 'pointer',
  background: 'linear-gradient(135deg, #5A3DF0, #7C5CFF)', color: '#fff', fontSize: 15, fontWeight: 700,
  boxShadow: '0 10px 30px rgba(90,61,240,0.4)',
}
