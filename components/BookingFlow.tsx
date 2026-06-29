'use client'

// components/BookingFlow.tsx
// Flux de réservation guidé en 3 étapes (besoin → quand → adresse + récap).
// Bottom sheet sur mobile, modal centré sur desktop. Réutilisé par l'accueil,
// le profil artisan public et la carte.
//
// - S'il existe déjà une conversation active client↔artisan, on l'ouvre direct.
// - À la confirmation : création du booking (avec vraie date/adresse) puis
//   premier message automatique dans le chat avec le besoin décrit.

import { useState, useEffect, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { X, Zap, CalendarDays, CalendarClock, ChevronLeft, BadgeCheck, CreditCard, Banknote, ShieldCheck } from 'lucide-react'
import { useLang } from '@/lib/LangContext'
import { AddressPicker } from '@/components/AddressPicker'

export type BookingFlowArtisan = {
  id: string
  name: string
  category: string
  hourlyRate: number
  color?: string
}

type When = 'asap' | 'today' | 'tomorrow'

export default function BookingFlow({
  artisan, clientId, defaultAddress = '', onClose,
}: {
  artisan: BookingFlowArtisan
  clientId: string
  defaultAddress?: string
  onClose: () => void
}) {
  const router = useRouter()
  const { t, isAr } = useLang()
  const [step, setStep] = useState(1)
  const [checking, setChecking] = useState(true)

  const [need, setNeed] = useState('')
  const [when, setWhen] = useState<When>('asap')
  const [time, setTime] = useState('')
  const [address, setAddress] = useState(defaultAddress)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [payMethod, setPayMethod] = useState<'card' | 'cash'>('card')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')

  const c = artisan.color || '#5A3DF0'
  const cl = (id: string) => t(`categories.${id}`)

  // Conversation active existante ? → on l'ouvre directement.
  useEffect(() => {
    let alive = true
    const check = async () => {
      const { data } = await supabase
        .from('bookings').select('id')
        .eq('client_id', clientId).eq('artisan_id', artisan.id)
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (!alive) return
      if (data?.id) { router.push(`/chat/${data.id}`); return }
      setChecking(false)
    }
    check()
    return () => { alive = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const scheduledAt = (): string => {
    const d = new Date()
    if (when === 'tomorrow') d.setDate(d.getDate() + 1)
    if (when !== 'asap' && time) {
      const [h, m] = time.split(':').map(Number)
      d.setHours(h || 9, m || 0, 0, 0)
    }
    return d.toISOString()
  }

  const whenLabel = () => {
    const base = when === 'asap' ? t('bflow.asap') : when === 'today' ? t('bflow.today') : t('bflow.tomorrow')
    return when !== 'asap' && time ? `${base} · ${time}` : base
  }

  const submit = async () => {
    if (sending) return
    setSending(true); setErr('')

    // 1. Créer la réservation (notif artisan générée par trigger en base)
    const { data: created, error: insErr } = await supabase.from('bookings').insert({
      client_id: clientId,
      artisan_id: artisan.id,
      category: artisan.category || 'autre',
      title: need.trim().slice(0, 60) || `Demande ${artisan.category || 'service'}`,
      description: need.trim(),
      address: address.trim(),
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      scheduled_at: scheduledAt(),
      status: 'pending',
      price_agreed: artisan.hourlyRate || 0,
      payment_method: payMethod,
    }).select('id').single()

    if (insErr || !created?.id) {
      setErr(insErr?.message || t('bflow.errGeneric')); setSending(false); return
    }

    // 2. Premier message automatique : le chat s'ouvre avec le contexte
    try {
      const { data: prof } = await supabase.from('profiles').select('full_name,role').eq('id', clientId).single()
      await supabase.from('messages').insert({
        booking_id: created.id,
        sender_id: clientId,
        sender_name: prof?.full_name || 'Client',
        sender_role: prof?.role || 'client',
        content: `${need.trim()}\n\n${t('bflow.msgWhen')} : ${whenLabel()}${address.trim() ? `\n${t('bflow.msgAddress')} : ${address.trim()}` : ''}`,
      })
    } catch {}

    router.push(`/chat/${created.id}`)
  }

  const BTN = (active: boolean): CSSProperties => ({
    width: '100%', padding: 15, border: 'none', borderRadius: 14,
    background: active ? 'var(--gradient)' : 'var(--border)',
    color: active ? '#fff' : 'var(--tx3)', fontSize: 14, fontWeight: 800,
    cursor: active && !sending ? 'pointer' : 'not-allowed',
    fontFamily: 'Nexa,sans-serif',
    boxShadow: active ? '0 6px 20px rgba(90, 61, 240,0.35)' : 'none',
  })

  return (
    <div className="bflow-wrap" style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', direction: isAr ? 'rtl' : 'ltr' }}>
      <style>{`
        @keyframes bflowUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes bflowFade { from { opacity: 0; } to { opacity: 1; } }
        .bflow-sheet { width: 100%; border-radius: 26px 26px 0 0; animation: bflowUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
        @media (min-width: 768px) {
          .bflow-wrap { align-items: center !important; }
          .bflow-sheet { max-width: 480px; border-radius: 24px !important; animation: bflowFade 0.25s ease both; }
        }
        @keyframes bstepIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: none; } }
        .bstep { animation: bstepIn 0.3s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', animation: 'bflowFade 0.25s ease both' }}/>

      <div className="bflow-sheet" style={{
        position: 'relative', background: 'var(--bg2)', border: '1px solid var(--border)',
        maxHeight: '90dvh', overflowY: 'auto',
        padding: '14px 22px calc(22px + env(safe-area-inset-bottom))',
      }}>
        {/* Poignée */}
        <div style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--border2)', margin: '0 auto 14px' }}/>

        {/* Header : artisan + fermer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: `linear-gradient(135deg,${c}30,${c}14)`, border: `1.5px solid ${c}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: c, flexShrink: 0 }}>
            {artisan.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artisan.name}</span>
              <BadgeCheck size={14} color="var(--accent)" style={{ flexShrink: 0 }}/>
            </div>
            <div style={{ fontSize: 11.5, color: c, fontWeight: 700 }}>{cl(artisan.category)}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            <X size={15} color="var(--tx2)"/>
          </button>
        </div>

        {/* Progression */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 20 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ flex: 1, height: 3.5, borderRadius: 2, background: i <= step ? 'var(--accent)' : 'var(--border)', transition: 'background 0.35s ease' }}/>
          ))}
        </div>

        {checking ? (
          <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}><div className="loader-ring"/></div>
        ) : (
          <>
            {/* ── Étape 1 : besoin ── */}
            {step === 1 && (
              <div className="bstep" key="s1">
                <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.01em', marginBottom: 4 }}>{t('bflow.step1Title')}</div>
                <div style={{ fontSize: 12.5, color: 'var(--tx2)', fontWeight: 300, marginBottom: 16 }}>{t('bflow.step1Sub')}</div>
                <textarea
                  value={need} onChange={e => setNeed(e.target.value)} autoFocus rows={4}
                  placeholder={t('bflow.step1Ph')}
                  style={{ width: '100%', padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, color: 'var(--tx)', fontSize: 14, outline: 'none', fontFamily: 'Nexa,sans-serif', fontWeight: 300, resize: 'none', lineHeight: 1.6, marginBottom: 18 }}
                />
                <button onClick={() => need.trim().length >= 3 && setStep(2)} disabled={need.trim().length < 3} style={BTN(need.trim().length >= 3)}>{t('bflow.continue')}</button>
              </div>
            )}

            {/* ── Étape 2 : quand ── */}
            {step === 2 && (
              <div className="bstep" key="s2">
                <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.01em', marginBottom: 16 }}>{t('bflow.whenTitle')}</div>
                {([
                  { id: 'asap'     as When, Icon: Zap,           label: t('bflow.asap'),     sub: t('bflow.asapSub') },
                  { id: 'today'    as When, Icon: CalendarClock, label: t('bflow.today'),    sub: t('bflow.todaySub') },
                  { id: 'tomorrow' as When, Icon: CalendarDays,  label: t('bflow.tomorrow'), sub: t('bflow.tomorrowSub') },
                ]).map(o => (
                  <div key={o.id} onClick={() => setWhen(o.id)} className="press" style={{
                    display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', borderRadius: 15, cursor: 'pointer', marginBottom: 9,
                    background: when === o.id ? 'rgba(90, 61, 240,0.08)' : 'var(--bg)',
                    border: `1.5px solid ${when === o.id ? 'var(--accent)' : 'var(--border)'}`,
                    transition: 'all 0.2s ease',
                  }}>
                    <div style={{ width: 38, height: 38, borderRadius: 12, background: when === o.id ? 'var(--gradient)' : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
                      <o.Icon size={17} color={when === o.id ? '#fff' : 'var(--tx2)'} strokeWidth={2}/>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: when === o.id ? 'var(--accent)' : 'var(--tx)' }}>{o.label}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 300 }}>{o.sub}</div>
                    </div>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${when === o.id ? 'var(--accent)' : 'var(--border2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'border-color 0.2s' }}>
                      {when === o.id && <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--accent)' }}/>}
                    </div>
                  </div>
                ))}

                {when !== 'asap' && (
                  <div className="bstep" style={{ margin: '4px 0 6px' }}>
                    <label style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 7 }}>{t('bflow.timeLabel')}</label>
                    <input type="time" value={time} onChange={e => setTime(e.target.value)}
                      style={{ width: '100%', padding: '13px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 13, color: 'var(--tx)', fontSize: 15, outline: 'none', fontFamily: 'Nexa,sans-serif' }}/>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
                  <button onClick={() => setStep(1)} style={{ padding: '15px 18px', borderRadius: 14, background: 'transparent', border: '1px solid var(--border)', color: 'var(--tx2)', cursor: 'pointer', fontFamily: 'Nexa,sans-serif', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={17} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }}/>
                  </button>
                  <button onClick={() => setStep(3)} style={{ ...BTN(true), flex: 1 }}>{t('bflow.continue')}</button>
                </div>
              </div>
            )}

            {/* ── Étape 3 : adresse + récap ── */}
            {step === 3 && (
              <div className="bstep" key="s3">
                <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.01em', marginBottom: 16 }}>{t('bflow.whereTitle')}</div>

                <label style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 7 }}>{t('bflow.addressLabel')}</label>
                <div style={{ marginBottom: 18 }}>
                  <AddressPicker
                    hideConfirm
                    height={190}
                    defaultAddress={address}
                    onChange={loc => { setAddress(loc.address); setCoords({ lat: loc.lat, lng: loc.lng }) }}
                  />
                </div>

                {/* Mode de paiement */}
                <label style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 9 }}>{t('bflow.payTitle')}</label>
                {([
                  { id: 'card' as const, Icon: CreditCard, label: t('bflow.payCard'), desc: t('bflow.payCardDesc'), secure: true },
                  { id: 'cash' as const, Icon: Banknote,   label: t('bflow.payCash'), desc: t('bflow.payCashDesc'), secure: false },
                ]).map(o => (
                  <div key={o.id} onClick={() => setPayMethod(o.id)} className="press" style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 14px', borderRadius: 14, cursor: 'pointer', marginBottom: 9,
                    background: payMethod === o.id ? 'rgba(90, 61, 240,0.08)' : 'var(--bg)',
                    border: `1.5px solid ${payMethod === o.id ? 'var(--accent)' : 'var(--border)'}`, transition: 'all 0.2s ease',
                  }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: payMethod === o.id ? 'var(--gradient)' : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <o.Icon size={16} color={payMethod === o.id ? '#fff' : 'var(--tx2)'} strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13.5, fontWeight: 800, color: payMethod === o.id ? 'var(--accent)' : 'var(--tx)' }}>{o.label}</span>
                        {o.secure && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', borderRadius: 20, background: '#10b98114', fontSize: 9.5, color: '#10b981', fontWeight: 800 }}><ShieldCheck size={10} /> {t('bflow.paySecure')}</span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 400, lineHeight: 1.55 }}>{o.desc}</div>
                    </div>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${payMethod === o.id ? 'var(--accent)' : 'var(--border2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      {payMethod === o.id && <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--accent)' }} />}
                    </div>
                  </div>
                ))}
                <div style={{ height: 8 }} />

                {/* Récap */}
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '15px 17px', marginBottom: 16 }}>
                  <div style={{ fontSize: 10.5, color: 'var(--tx3)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 11 }}>{t('bflow.recap').toUpperCase()}</div>
                  {[
                    [t('bflow.need'), need.trim().slice(0, 70) + (need.trim().length > 70 ? '…' : '')],
                    [t('bflow.when'), whenLabel()],
                    [t('bflow.rate'), artisan.hourlyRate > 0 ? `${artisan.hourlyRate.toLocaleString('fr-DZ')} ${t('common.da')}${t('common.perHour')}` : t('bflow.rateTbd')],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300, flexShrink: 0 }}>{k}</span>
                      <span style={{ fontSize: 12.5, color: 'var(--tx)', fontWeight: 700, textAlign: 'end' }}>{v}</span>
                    </div>
                  ))}
                </div>

                {err && <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, background: '#ef444412', border: '1px solid #ef444422', fontSize: 12, color: '#ef4444' }}>{err}</div>}

                <div style={{ display: 'flex', gap: 9 }}>
                  <button onClick={() => setStep(2)} style={{ padding: '15px 18px', borderRadius: 14, background: 'transparent', border: '1px solid var(--border)', color: 'var(--tx2)', cursor: 'pointer', fontFamily: 'Nexa,sans-serif', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={17} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }}/>
                  </button>
                  <button onClick={submit} disabled={sending} style={{ ...BTN(!sending), flex: 1 }}>{sending ? t('bflow.sending') : t('bflow.submit')}</button>
                </div>

                <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--tx3)', fontWeight: 300, marginTop: 13 }}>{t('bflow.trust')}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
