'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/LangContext'
import { Mail, MessageCircle, Map, CheckCircle2 } from 'lucide-react'

export default function AidePage() {
  const router = useRouter()
  const { t, isAr } = useLang()
  const [open, setOpen] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const FAQ = [
    { q: t('help.faq1q'), a: t('help.faq1a') },
    { q: t('help.faq2q'), a: t('help.faq2a') },
    { q: t('help.faq3q'), a: t('help.faq3a') },
    { q: t('help.faq4q'), a: t('help.faq4a') },
    { q: t('help.faq5q'), a: t('help.faq5a') },
    { q: t('help.faq6q'), a: t('help.faq6a') },
    { q: t('help.faq7q'), a: t('help.faq7a') },
  ]

  const contactCards = [
    { Icon: Mail,          title: 'Email',              val: 'support@beti.dz',  sub: t('help.emailResponseTime') },
    { Icon: MessageCircle, title: 'WhatsApp',           val: '+213 555 000 000', sub: t('help.whatsappHours') },
    { Icon: Map,           title: t('help.mapTitle'),   val: t('help.mapVal'),   sub: t('help.mapSub'), href: '/map' },
  ]

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Nexa, sans-serif', paddingTop: 72, direction: isAr ? 'rtl' : 'ltr' }}>
      <style suppressHydrationWarning>{`* { box-sizing: border-box; margin: 0; padding: 0; } ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #C9A84C44; border-radius: 2px; }`}</style>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ marginBottom: 8, fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800 }}>{t('help.center')}</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--tx)', marginBottom: 12 }}>{t('help.title')}</h1>
        <p style={{ fontSize: 14, color: 'var(--tx2)', fontWeight: 300, marginBottom: 48, lineHeight: 1.7 }}>
          {t('help.subtitle')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 48 }}>
          {contactCards.map(c => (
            <div key={c.title}
              style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 14, padding: '20px', cursor: c.href ? 'pointer' : 'default' }}
              onClick={() => c.href && router.push(c.href)}>
              <div style={{ marginBottom: 10, color: '#6366f1' }}><c.Icon size={24}/></div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)', marginBottom: 4 }}>{c.title}</div>
              <div style={{ fontSize: 13, color: '#C9A84C', fontWeight: 300, marginBottom: 4 }}>{c.val}</div>
              <div style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 300 }}>{c.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 20 }}>{t('help.faq')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 56 }}>
          {FAQ.map((item, i) => (
            <div key={i} style={{ background: 'var(--bg2)', border: `0.5px solid ${open === i ? '#C9A84C44' : 'var(--border)'}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s' }}>
              <div onClick={() => setOpen(open === i ? null : i)} style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)' }}>{item.q}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tx2)" strokeWidth="2" style={{ transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, marginInlineStart: 12 }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
              {open === i && (
                <div style={{ padding: '0 20px 16px', fontSize: 13, color: 'var(--tx2)', fontWeight: 300, lineHeight: 1.7, borderTop: '0.5px solid var(--border)' }}>
                  <div style={{ paddingTop: 14 }}>{item.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 16, padding: '32px' }}>
          <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 8 }}>{t('help.contact')}</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--tx)', marginBottom: 24 }}>{t('help.sendMessage')}</h2>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', color: '#10b981' }}><CheckCircle2 size={48}/></div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>{t('help.sent')}</div>
              <div style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 300 }}>{t('help.sentSub')}</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                {[
                  { label: t('help.name'),  value: name,  setter: setName,  placeholder: t('help.namePh') },
                  { label: t('help.email'), value: email, setter: setEmail, placeholder: 'votre@email.com' },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 8, fontWeight: 800, letterSpacing: '0.06em' }}>{f.label}</label>
                    <input type="text" value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder}
                      style={{ width: '100%', padding: '12px 14px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 10, color: 'var(--tx)', fontSize: 13, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}/>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 8, fontWeight: 800, letterSpacing: '0.06em' }}>{t('help.message')}</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={t('help.messagePh')} rows={5}
                  style={{ width: '100%', padding: '12px 14px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 10, color: 'var(--tx)', fontSize: 13, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300, resize: 'vertical' }}/>
              </div>
              <button onClick={() => { if (name && email && message) setSent(true) }}
                style={{ width: '100%', padding: '13px', background: name && email && message ? '#C9A84C' : 'var(--bg3)', border: 'none', borderRadius: 10, color: name && email && message ? '#fff' : 'var(--tx3)', fontSize: 13, fontWeight: 800, cursor: name && email && message ? 'pointer' : 'not-allowed', fontFamily: 'Nexa, sans-serif' }}>
                {t('help.send')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
