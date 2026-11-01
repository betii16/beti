'use client'

// app/artisan-dashboard/abonnement/page.tsx
// Page d'abonnement artisan : choix Basic / Premium, mensuel ou annuel (économie),
// matrice d'avantages, bannière période de lancement gratuite, et SOUMISSION de
// demande de paiement (virement / versement + référence) → statut « en attente »
// jusqu'à validation par un admin. Le paiement carte (Chargily) viendra ensuite.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { Check, Minus, Star, Sparkles, X, Clock, CheckCircle2, CreditCard, Banknote } from 'lucide-react'
import {
  PLAN_LIST, FEATURES, priceFor, yearlySavings, freeMonths,
  isLaunchFree, SUB_FREE_UNTIL, type Plan, type BillingCycle,
} from '@/lib/plans'
import { logError } from '@/lib/logError'
import { getMyLatestSubscription, submitSubscriptionRequest, type Subscription } from '@/lib/subscription'

const da = (n: number) => n.toLocaleString('fr-DZ')
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })

const SCOPE_CSS = `.abo-scope :is(a,button):focus-visible{outline:2px solid var(--accent);outline-offset:2px}`

export default function AbonnementPage() {
  const router = useRouter()
  const { t, isAr } = useLang()
  const [cycle, setCycle] = useState<BillingCycle>('yearly')
  const [chosen, setChosen] = useState<Plan | null>(null)
  const [uid, setUid] = useState<string | null>(null)
  const [latest, setLatest] = useState<Subscription | null>(null)
  const [payMethod, setPayMethod] = useState<'card' | 'cash'>('card')
  const [payRef, setPayRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [err, setErr] = useState('')

  const free = isLaunchFree()
  const freeUntil = fmtDate(SUB_FREE_UNTIL)
  const maxFreeMonths = Math.max(...PLAN_LIST.map(freeMonths))

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUid(user.id)
      setLatest(await getMyLatestSubscription(user.id))
    }
    init()
  }, [])

  const submit = async () => {
    if (!uid || !chosen) return
    setSubmitting(true); setErr('')
    const res = await submitSubscriptionRequest({
      artisanId: uid, plan: chosen.id, cycle, amount: priceFor(chosen, cycle),
      method: payMethod, ref: payRef.trim() || undefined,
    })
    if (!res.ok) { logError('subscription.submit', res.message, { plan: chosen.id, cycle }); setErr(res.message); setSubmitting(false); return }
    setSubmitting(false); setSubmitted(true)
    setLatest(await getMyLatestSubscription(uid))
  }

  const closeModal = () => { setChosen(null); setSubmitted(false); setPayRef(''); setErr(''); setPayMethod('card') }

  // Échap ferme la modale (accessibilité clavier)
  useEffect(() => {
    if (!chosen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chosen])

  return (
    <div className="abo-scope" style={{ minHeight: '100vh', paddingTop: 72, direction: isAr ? 'rtl' : 'ltr' }}>
      <style>{SCOPE_CSS}</style>
      <div className="page-pad-m" style={{ maxWidth: 920, margin: '0 auto', padding: '32px 24px 72px' }}>

        <div className="section-label">{t('sub.pageEyebrow')}</div>
        <h1 style={{ fontSize: 'clamp(26px, 6.5vw, 32px)', lineHeight: 1.15, fontWeight: 800, color: 'var(--tx)', marginBottom: 10 }}>{t('sub.pageTitle')}</h1>
        <p style={{ fontSize: 15, color: 'var(--tx2)', lineHeight: 1.65, marginBottom: 28, maxWidth: 560 }}>
          {t('sub.pageDesc')} <strong style={{ color: 'var(--tx)' }}>{t('sub.noCommission')}</strong> {t('sub.pageDescEnd')}
        </p>

        {/* Statut de l'abonnement courant */}
        {latest && (latest.status === 'pending' || latest.status === 'active' || latest.status === 'rejected') && (
          <div role="status" className="card" style={{ padding: '16px 18px', marginBottom: 16, borderColor: `color-mix(in srgb, ${latest.status === 'rejected' ? 'var(--danger)' : latest.status === 'active' ? 'var(--success)' : 'var(--accent)'} 40%, var(--border))`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div aria-hidden style={{ flexShrink: 0, color: latest.status === 'active' ? 'var(--success)' : latest.status === 'rejected' ? 'var(--danger)' : 'var(--accent)' }}>
              {latest.status === 'active' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
            </div>
            <div style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.6 }}>
              {latest.status === 'pending' && <>{t('sub.yourRequest')} <strong style={{ color: 'var(--tx)' }}>{latest.plan === 'premium' ? 'Premium' : 'Basic'}</strong> {t('sub.pendingStatus')}</>}
              {latest.status === 'active' && <>{t('sub.subscription')} <strong style={{ color: 'var(--tx)' }}>{latest.plan === 'premium' ? 'Premium' : 'Basic'}</strong> {latest.expires_at ? <>{t('sub.activeStatus')} <strong style={{ color: 'var(--success)' }}>{fmtDate(latest.expires_at)}</strong></> : ''}.</>}
              {latest.status === 'rejected' && <>{t('sub.rejectedStatus')}{latest.note ? <> : {latest.note}</> : ''}. {t('sub.rejectedEnd')}</>}
            </div>
          </div>
        )}

        {free && (
          <div className="card" style={{ padding: '16px 18px', marginBottom: 28, borderColor: 'color-mix(in srgb, var(--accent) 40%, var(--border))', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div aria-hidden style={{ color: 'var(--accent)', flexShrink: 0 }}><Sparkles size={20} /></div>
            <div style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--tx)' }}>{t('sub.launchFree')}</strong> — {t('sub.launchFreeDesc')} <strong style={{ color: 'var(--accent)' }}>{freeUntil}</strong>. {t('sub.launchFreeEnd')}
            </div>
          </div>
        )}

        {/* Toggle mensuel / annuel */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
          <div role="group" style={{ display: 'inline-flex', padding: 4, borderRadius: 'var(--r-btn)', background: 'var(--bg2)', border: '1px solid var(--border2)' }}>
            {([['monthly', t('sub.monthly')], ['yearly', t('sub.yearly')]] as const).map(([id, label]) => (
              <button key={id} aria-pressed={cycle === id} onClick={() => setCycle(id)}
                style={{
                  minHeight: 40, padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 700, transition: 'background .2s, color .2s',
                  background: cycle === id ? 'var(--accent)' : 'transparent',
                  color: cycle === id ? '#fff' : 'var(--tx2)',
                }}>
                {label}
              </button>
            ))}
          </div>
          {cycle === 'yearly' && (
            <span style={{ fontSize: 12, fontWeight: 700, color: 'color-mix(in srgb, var(--success) 72%, var(--tx))', background: 'color-mix(in srgb, var(--success) 13%, transparent)', padding: '6px 12px', borderRadius: 'var(--r-pill)' }}>
              {t('sub.upTo')} {maxFreeMonths} {t('sub.monthsFree')}
            </span>
          )}
        </div>

        {/* Cartes des plans */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 16 }}>
          {PLAN_LIST.map(plan => {
            const price = priceFor(plan, cycle)
            const perMonth = cycle === 'yearly' ? Math.round(plan.yearly / 12) : plan.monthly
            const savings = yearlySavings(plan)
            return (
              <div key={plan.id} className="card" style={{
                padding: 'clamp(22px, 5vw, 28px) clamp(18px, 5vw, 26px)', position: 'relative',
                borderColor: plan.highlighted ? 'var(--accent)' : 'var(--border)',
                boxShadow: plan.highlighted ? '0 12px 40px color-mix(in srgb, var(--accent) 18%, transparent)' : undefined,
              }}>
                {plan.highlighted && (
                  <div style={{ position: 'absolute', top: 16, insetInlineEnd: 16, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#fff', background: 'var(--accent)', padding: '5px 11px', borderRadius: 'var(--r-pill)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    <Star size={11} fill="#fff" strokeWidth={0} aria-hidden /> {t('sub.recommended')}
                  </div>
                )}

                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)', marginBottom: 4 }}>{plan.name}</h2>
                <div style={{ fontSize: 13.5, color: 'var(--tx2)', lineHeight: 1.5, marginBottom: 20, minHeight: 40 }}>{plan.tagline}</div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                  <span className="num" style={{ fontSize: 34, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.02em' }}>{da(price)}</span>
                  <span style={{ fontSize: 14, color: 'var(--tx2)' }}>DA / {cycle === 'monthly' ? t('sub.monthly').toLowerCase() : t('sub.yearly').toLowerCase()}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 4, minHeight: 18 }}>
                  {cycle === 'yearly'
                    ? <>{t('sub.perMonthEquiv')} {da(perMonth)} DA/{t('sub.monthly').toLowerCase()} · <span style={{ color: 'color-mix(in srgb, var(--success) 72%, var(--tx))', fontWeight: 700 }}>{t('sub.savings')} {da(savings)} DA</span></>
                    : <>{t('sub.orYearly')} {da(plan.yearly)} DA/{t('sub.yearly').toLowerCase()}</>}
                </div>

                <button
                  onClick={() => { setSubmitted(false); setErr(''); setPayRef(''); setPayMethod('card'); setChosen(plan) }}
                  className={plan.highlighted ? 'btn-primary btn-block' : 'btn-ghost btn-block'}
                  style={{ margin: '22px 0', minHeight: 46, ...(plan.highlighted ? {} : { borderColor: 'var(--accent)', color: 'var(--accent)' }) }}>
                  {t('sub.choosePlan')} {plan.name}
                </button>

                <ul style={{ display: 'flex', flexDirection: 'column', gap: 11, listStyle: 'none' }}>
                  {FEATURES.map((f, i) => {
                    const v = plan.id === 'basic' ? f.basic : f.premium
                    const included = v !== false
                    const detail = typeof v === 'string' ? v : null
                    return (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, opacity: included ? 1 : 0.6 }}>
                        <span aria-hidden style={{ flexShrink: 0, marginTop: 1, color: included ? 'var(--success)' : 'var(--tx2)' }}>
                          {included ? <Check size={15} strokeWidth={3} /> : <Minus size={15} />}
                        </span>
                        <span style={{ fontSize: 14, color: included ? 'var(--tx)' : 'var(--tx2)', lineHeight: 1.45, textDecoration: included ? 'none' : 'line-through' }}>
                          {f.label}{detail && <span style={{ color: 'var(--accent)', fontWeight: 700 }}> · {detail}</span>}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 24, fontSize: 13, color: 'var(--tx2)', lineHeight: 1.7, textAlign: 'center' }}>
          {t('sub.payNote')}
        </div>
      </div>

      {/* Modale : instructions de paiement + soumission */}
      {chosen && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(14,25,34,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div role="dialog" aria-modal="true" aria-label={`${t('sub.modalTitle')} — ${chosen.name}`} onClick={e => e.stopPropagation()} className="card anim-scale-in" style={{ width: '100%', maxWidth: 460, margin: '16px 16px calc(16px + env(safe-area-inset-bottom))', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', padding: '24px 22px', direction: isAr ? 'rtl' : 'ltr' }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--success)', marginBottom: 14 }}><CheckCircle2 size={48} /></div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>{t('sub.successTitle')}</div>
                <p style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.65, marginBottom: 22 }}>
                  {t('sub.yourRequest')} <strong style={{ color: 'var(--tx)' }}>{chosen.name}</strong> {t('sub.successDesc')}
                </p>
                <button onClick={closeModal} autoFocus className="btn-primary btn-block" style={{ minHeight: 46 }}>{t('sub.close')}</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div className="section-label" style={{ marginBottom: 4 }}>{t('sub.modalTitle')}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)' }}>{chosen.name} · {cycle === 'monthly' ? t('sub.monthly') : t('sub.yearly')}</div>
                  </div>
                  <button onClick={closeModal} autoFocus aria-label={t('sub.close')} style={{ width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-btn)', color: 'var(--tx)', cursor: 'pointer', marginTop: -6, marginInlineEnd: -6 }}><X size={20} /></button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '14px 0', borderTop: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)', marginBottom: 16 }}>
                  <span style={{ fontSize: 14, color: 'var(--tx2)' }}>{t('sub.amount')}</span>
                  <span className="num" style={{ fontSize: 19, fontWeight: 800, color: 'var(--tx)' }}>{da(priceFor(chosen, cycle))} DA <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 400 }}>/ {cycle === 'monthly' ? t('sub.monthly').toLowerCase() : t('sub.yearly').toLowerCase()}</span></span>
                </div>

                {/* Mode de paiement : carte (recommandé, bientôt) ou espèces */}
                <div id="abo-method" style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 }}>{t('sub.methodTitle')}</div>
                <div role="radiogroup" aria-labelledby="abo-method" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {([
                    { id: 'card' as const, Icon: CreditCard, label: t('sub.methodCard'), sub: t('sub.methodCardSub'), reco: true },
                    { id: 'cash' as const, Icon: Banknote,   label: t('sub.methodCash'), sub: t('sub.methodCashSub'), reco: false },
                  ]).map(m => (
                    <button key={m.id} type="button" role="radio" aria-checked={payMethod === m.id} onClick={() => { setPayMethod(m.id); setErr('') }}
                      style={{
                        textAlign: 'start', padding: '13px 14px', borderRadius: 'var(--r-field)', cursor: 'pointer', minWidth: 0,
                        background: payMethod === m.id ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'var(--bg3)',
                        border: `1.5px solid ${payMethod === m.id ? 'var(--accent)' : 'var(--border)'}`, transition: 'all 0.15s',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
                        <m.Icon size={16} color={payMethod === m.id ? 'var(--accent)' : 'var(--tx2)'} />
                        <span style={{ fontSize: 14, fontWeight: 800, color: payMethod === m.id ? 'var(--accent)' : 'var(--tx)' }}>{m.label}</span>
                        {m.reco && <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: 'var(--accent)', padding: '2px 7px', borderRadius: 'var(--r-pill)', letterSpacing: '0.03em' }}>{t('sub.recommended')}</span>}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--tx2)', lineHeight: 1.4 }}>{m.sub}</div>
                    </button>
                  ))}
                </div>

                {payMethod === 'card' ? (
                  <>
                    <div style={{ background: 'color-mix(in srgb, var(--accent) 7%, transparent)', border: '0.5px solid color-mix(in srgb, var(--accent) 30%, transparent)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)', marginBottom: 6 }}>{t('sub.cardSoonTitle')}</div>
                      <p style={{ fontSize: 13.5, color: 'var(--tx2)', lineHeight: 1.6 }}>{t('sub.cardSoonDesc')}</p>
                    </div>
                    <button disabled className="btn-primary btn-block" style={{ minHeight: 46 }}>{t('sub.cardBtnSoon')}</button>
                  </>
                ) : (
                  <>
                    <div style={{ background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>{t('sub.howToPay')}</div>
                      <p style={{ fontSize: 14, color: 'var(--tx)', lineHeight: 1.65 }}>{t('sub.cashInstr')}</p>
                    </div>

                    <label htmlFor="abo-ref" style={{ fontSize: 12, color: 'var(--tx2)', display: 'block', marginBottom: 8, fontWeight: 700, letterSpacing: '0.02em' }}>{t('sub.refLabelCash')}</label>
                    <input id="abo-ref" value={payRef} onChange={e => setPayRef(e.target.value)} placeholder={t('sub.refPh')} className="field" style={{ marginBottom: 16 }} />

                    {free && (
                      <p style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.6, marginBottom: 14 }}>
                        {t('sub.launchNote')} {freeUntil}. {t('sub.launchNoteEnd')}
                      </p>
                    )}

                    {err && <div role="alert" style={{ padding: '10px 14px', borderRadius: 'var(--r-field)', background: 'color-mix(in srgb, var(--danger) 9%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', fontSize: 13, color: 'var(--danger)', fontWeight: 600, lineHeight: 1.5, marginBottom: 12 }}>{err}</div>}

                    <button onClick={submit} disabled={submitting || !payRef.trim()} className="btn-primary btn-block" style={{ minHeight: 46 }}>
                      {submitting ? t('sub.sending') : t('sub.submit')}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
