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
    <div style={{ minHeight: '100vh', paddingTop: 72, direction: isAr ? 'rtl' : 'ltr' }}>
      <style suppressHydrationWarning>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .faq-q { width: 100%; min-height: 56px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; gap: 12px;
          background: transparent; border: none; cursor: pointer; text-align: start; color: var(--tx); font-size: 15px; font-weight: 700; border-radius: var(--r-card); }
        .faq-q:hover { color: var(--accent); }
        .aide-form { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
        @media (max-width: 767px) { .aide-form { grid-template-columns: 1fr; } .aide-pad { padding: 24px 18px !important; } }
        .contact-card { display: block; text-decoration: none; padding: 20px; }
      `}</style>
      <div className="page-pad-m" style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 72px' }}>

        <div className="section-label">{t('help.center')}</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--tx)', marginBottom: 12, lineHeight: 1.15 }}>{t('help.title')}</h1>
        <p style={{ fontSize: 15.5, color: 'var(--tx2)', marginBottom: 40, lineHeight: 1.7, maxWidth: 560 }}>
          {t('help.subtitle')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 48 }}>
          {contactCards.map(c => {
            const body = (
              <>
                <div style={{ marginBottom: 12, width: 40, height: 40, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}><c.Icon size={20}/></div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', marginBottom: 4 }}>{c.title}</div>
                <div className="num" style={{ fontSize: 13.5, color: 'var(--accent)', fontWeight: 600, marginBottom: 4, direction: 'ltr', unicodeBidi: 'plaintext' }}>{c.val}</div>
                <div style={{ fontSize: 12.5, color: 'var(--tx2)' }}>{c.sub}</div>
              </>
            )
            return c.href
              ? <a key={c.title} href={c.href} onClick={e => { e.preventDefault(); router.push(c.href!) }} className="acard contact-card">{body}</a>
              : <div key={c.title} className="card contact-card">{body}</div>
          })}
        </div>

        <h2 className="section-label" style={{ marginBottom: 16 }}>{t('help.faq')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 56 }}>
          {FAQ.map((item, i) => (
            <div key={i} className="card" style={{ borderColor: open === i ? 'color-mix(in srgb, var(--accent) 45%, var(--border))' : undefined, padding: 0 }}>
              <button className="faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} aria-controls={`faq-${i}`} id={`faq-q-${i}`}>
                <span>{item.q}</span>
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--tx2)', transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              {open === i && (
                <div id={`faq-${i}`} role="region" aria-labelledby={`faq-q-${i}`} style={{ padding: '0 20px 18px', fontSize: 14, color: 'var(--tx2)', lineHeight: 1.7, borderTop: '1px solid var(--border)' }}>
                  <div style={{ paddingTop: 14 }}>{item.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="card aide-pad" style={{ padding: '32px' }}>
          <div className="section-label">{t('help.contact')}</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--tx)', marginBottom: 24 }}>{t('help.sendMessage')}</h2>
          {sent ? (
            <div role="status" style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', color: 'var(--success)' }}><CheckCircle2 size={48}/></div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>{t('help.sent')}</div>
              <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{t('help.sentSub')}</div>
            </div>
          ) : (
            <>
              <div className="aide-form">
                {[
                  { id: 'aide-name',  type: 'text',  auto: 'name',  label: t('help.name'),  value: name,  setter: setName,  placeholder: t('help.namePh') },
                  { id: 'aide-email', type: 'email', auto: 'email', label: t('help.email'), value: email, setter: setEmail, placeholder: 'votre@email.com' },
                ].map(f => (
                  <div key={f.id}>
                    <label htmlFor={f.id} className="field-label">{f.label}</label>
                    <input id={f.id} type={f.type} autoComplete={f.auto} value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder} className="field" style={{ fontSize: 16 }}/>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 20 }}>
                <label htmlFor="aide-msg" className="field-label">{t('help.message')}</label>
                <textarea id="aide-msg" value={message} onChange={e => setMessage(e.target.value)} placeholder={t('help.messagePh')} rows={5} className="field" style={{ fontSize: 16 }}/>
              </div>
              <button onClick={() => { if (name && email && message) setSent(true) }} disabled={!(name && email && message)} className="btn-primary btn-block btn-lg">
                {t('help.send')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
