'use client'

import { useState } from 'react'
import { useLang } from '@/lib/LangContext'

const FAQ_FR = [
  { q: 'Comment réserver un artisan ?', a: "Choisissez votre service sur la page d'accueil, sélectionnez un artisan disponible, remplissez le formulaire de réservation. L'artisan accepte ou refuse votre demande." },
  { q: 'Comment se passe le paiement ?', a: "BETI fonctionne avec le paiement en cash directement à l'artisan après l'intervention. Aucun paiement en ligne n'est requis." },
  { q: 'Puis-je annuler une réservation ?', a: "Oui, depuis votre espace client tant que l'artisan n'a pas commencé l'intervention." },
  { q: 'Les artisans sont-ils vérifiés ?', a: "Oui, tous les artisans BETI sont certifiés. Identité et compétences vérifiées avant inscription." },
  { q: "Que faire si je ne suis pas satisfait ?", a: "Laissez un avis après chaque mission. En cas de litige, contactez notre support." },
  { q: 'Comment devenir artisan sur BETI ?', a: "Inscrivez-vous en choisissant 'Artisan'. Remplissez votre profil et définissez votre zone d'intervention." },
  { q: "L'application est-elle disponible sur mobile ?", a: "BETI est accessible via votre navigateur mobile. Une app iOS et Android est en cours de développement." },
]

const FAQ_AR = [
  { q: 'كيف أحجز حرفياً؟', a: 'اختر خدمتك من الصفحة الرئيسية، اختر حرفياً متاحاً، واملأ نموذج الحجز. الحرفي يقبل أو يرفض طلبك.' },
  { q: 'كيف يتم الدفع؟', a: 'BETI تعمل بالدفع النقدي مباشرة للحرفي بعد التدخل. لا يلزم أي دفع إلكتروني.' },
  { q: 'هل يمكنني إلغاء حجز؟', a: 'نعم، من مساحتك الشخصية طالما لم يبدأ الحرفي التدخل.' },
  { q: 'هل الحرفيون موثقون؟', a: 'نعم، جميع حرفيي BETI معتمدون. تُتحقق هويتهم وكفاءاتهم قبل التسجيل.' },
  { q: 'ماذا أفعل إذا لم أكن راضياً؟', a: 'اترك تقييماً بعد كل مهمة. في حالة نزاع، تواصل مع دعمنا.' },
  { q: 'كيف أصبح حرفياً على BETI؟', a: "سجّل باختيار 'حرفي'. أكمل ملفك الشخصي وحدد نطاق تدخلك." },
  { q: 'هل التطبيق متاح على الجوال؟', a: 'BETI متاح عبر متصفح جوالك. تطبيق iOS وAndroid قيد التطوير.' },
]

export default function AidePage() {
  const { t, isAr } = useLang()
  const [open, setOpen] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const FAQ = isAr ? FAQ_AR : FAQ_FR

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D12', fontFamily: 'Nexa, sans-serif', paddingTop: 72, direction: isAr ? 'rtl' : 'ltr' }}>
      <style suppressHydrationWarning>{`* { box-sizing: border-box; margin: 0; padding: 0; } ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #C9A84C44; border-radius: 2px; }`}</style>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ marginBottom: 8, fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800 }}>{t('help.center')}</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8', marginBottom: 12 }}>{t('help.title')}</h1>
        <p style={{ fontSize: 14, color: '#555', fontWeight: 300, marginBottom: 48, lineHeight: 1.7 }}>
          {isAr ? 'ابحث عن إجابات للأسئلة الشائعة أو تواصل مع فريقنا مباشرة.' : 'Retrouvez les réponses aux questions fréquentes ou contactez notre équipe directement.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 48 }}>
          {[
            { icon: '📧', title: 'Email',     val: 'support@beti.dz',   sub: isAr ? 'رد خلال 24 ساعة' : 'Réponse sous 24h' },
            { icon: '📱', title: 'WhatsApp',  val: '+213 555 000 000',  sub: isAr ? 'الإثنين-السبت 8ص-8م' : 'Lun–Sam 8h–20h' },
            { icon: '🗺',  title: isAr ? 'الخريطة' : 'Carte', val: isAr ? 'عرض الحرفيين' : 'Voir les artisans', sub: isAr ? 'بالقرب منك' : 'Proches de vous', href: '/map' },
          ].map(c => (
            <div key={c.title} style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '20px', cursor: c.href ? 'pointer' : 'default' }}
              onClick={() => c.href && (window.location.href = c.href)}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{c.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#F0EDE8', marginBottom: 4 }}>{c.title}</div>
              <div style={{ fontSize: 13, color: '#C9A84C', fontWeight: 300, marginBottom: 4 }}>{c.val}</div>
              <div style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>{c.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 20 }}>{t('help.faq')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 56 }}>
          {FAQ.map((item, i) => (
            <div key={i} style={{ background: '#161620', border: `0.5px solid ${open === i ? '#C9A84C44' : '#2a2a3a'}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s' }}>
              <div onClick={() => setOpen(open === i ? null : i)} style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8' }}>{item.q}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" style={{ transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, marginInlineStart: 12 }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
              {open === i && (
                <div style={{ padding: '0 20px 16px', fontSize: 13, color: '#888', fontWeight: 300, lineHeight: 1.7, borderTop: '0.5px solid #1e1e2a' }}>
                  <div style={{ paddingTop: 14 }}>{item.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 16, padding: '32px' }}>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 8 }}>{t('help.contact')}</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#F0EDE8', marginBottom: 24 }}>{t('help.sendMessage')}</h2>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#F0EDE8', marginBottom: 8 }}>{t('help.sent')}</div>
              <div style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>{isAr ? 'سيرد فريقنا خلال 24 ساعة.' : 'Notre équipe vous répondra sous 24h.'}</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                {[
                  { label: t('help.name'),  value: name,    setter: setName,    placeholder: isAr ? 'اسمك' : 'Votre nom' },
                  { label: t('help.email'), value: email,   setter: setEmail,   placeholder: 'votre@email.com' },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 8, fontWeight: 800, letterSpacing: '0.06em' }}>{f.label}</label>
                    <input type="text" value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder}
                      style={{ width: '100%', padding: '12px 14px', background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#F0EDE8', fontSize: 13, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}/>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 8, fontWeight: 800, letterSpacing: '0.06em' }}>{t('help.message')}</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={isAr ? 'صف مشكلتك أو سؤالك...' : 'Décrivez votre problème ou votre question...'} rows={5}
                  style={{ width: '100%', padding: '12px 14px', background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#F0EDE8', fontSize: 13, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300, resize: 'vertical' }}/>
              </div>
              <button onClick={() => { if (name && email && message) setSent(true) }}
                style={{ width: '100%', padding: '13px', background: name && email && message ? '#C9A84C' : '#1a1a2a', border: 'none', borderRadius: 10, color: name && email && message ? '#0D0D12' : '#444', fontSize: 13, fontWeight: 800, cursor: name && email && message ? 'pointer' : 'not-allowed', fontFamily: 'Nexa, sans-serif' }}>
                {t('help.send')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
