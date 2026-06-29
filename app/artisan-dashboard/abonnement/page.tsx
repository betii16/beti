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
import { Check, Minus, Star, Sparkles, X, Clock, CheckCircle2 } from 'lucide-react'
import {
  PLAN_LIST, FEATURES, priceFor, yearlySavings, freeMonths,
  isLaunchFree, SUB_FREE_UNTIL, type Plan, type BillingCycle,
} from '@/lib/plans'
import { getMyLatestSubscription, submitSubscriptionRequest, type Subscription } from '@/lib/subscription'

const da = (n: number) => n.toLocaleString('fr-DZ')
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })

export default function AbonnementPage() {
  const router = useRouter()
  const { t, isAr } = useLang()
  const [cycle, setCycle] = useState<BillingCycle>('yearly')
  const [chosen, setChosen] = useState<Plan | null>(null)
  const [uid, setUid] = useState<string | null>(null)
  const [latest, setLatest] = useState<Subscription | null>(null)
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
      method: 'transfer', ref: payRef.trim() || undefined,
    })
    if (!res.ok) { setErr(res.message); setSubmitting(false); return }
    setSubmitting(false); setSubmitted(true)
    setLatest(await getMyLatestSubscription(uid))
  }

  const closeModal = () => { setChosen(null); setSubmitted(false); setPayRef(''); setErr('') }

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Nexa, sans-serif', paddingTop: 72, direction: isAr ? 'rtl' : 'ltr' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '32px 24px 72px' }}>

        <div style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.14em', fontWeight: 800, marginBottom: 10 }}>{t('sub.pageEyebrow')}</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.02em', marginBottom: 10 }}>{t('sub.pageTitle')}</h1>
        <p style={{ fontSize: 14, color: 'var(--tx2)', fontWeight: 300, lineHeight: 1.7, marginBottom: 28, maxWidth: 560 }}>
          {t('sub.pageDesc')} <strong style={{ color: 'var(--tx)' }}>{t('sub.noCommission')}</strong> {t('sub.pageDescEnd')}
        </p>

        {/* Statut de l'abonnement courant */}
        {latest && (latest.status === 'pending' || latest.status === 'active' || latest.status === 'rejected') && (
          <div className="card" style={{ padding: '16px 20px', marginBottom: 16, borderColor: latest.status === 'rejected' ? '#ef444444' : 'var(--accent)44', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flexShrink: 0, color: latest.status === 'active' ? 'var(--success)' : latest.status === 'rejected' ? '#ef4444' : 'var(--accent)' }}>
              {latest.status === 'active' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
            </div>
            <div style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 300, lineHeight: 1.6 }}>
              {latest.status === 'pending' && <>{t('sub.yourRequest')} <strong style={{ color: 'var(--tx)' }}>{latest.plan === 'premium' ? 'Premium' : 'Basic'}</strong> {t('sub.pendingStatus')}</>}
              {latest.status === 'active' && <>{t('sub.subscription')} <strong style={{ color: 'var(--tx)' }}>{latest.plan === 'premium' ? 'Premium' : 'Basic'}</strong> {latest.expires_at ? <>{t('sub.activeStatus')} <strong style={{ color: 'var(--success)' }}>{fmtDate(latest.expires_at)}</strong></> : ''}.</>}
              {latest.status === 'rejected' && <>{t('sub.rejectedStatus')}{latest.note ? <> : {latest.note}</> : ''}. {t('sub.rejectedEnd')}</>}
            </div>
          </div>
        )}

        {free && (
          <div className="card" style={{ padding: '16px 20px', marginBottom: 28, borderColor: 'var(--accent)44', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ color: 'var(--accent)', flexShrink: 0 }}><Sparkles size={20} /></div>
            <div style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 300, lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--tx)' }}>{t('sub.launchFree')}</strong> — {t('sub.launchFreeDesc')} <strong style={{ color: 'var(--accent)' }}>{freeUntil}</strong>. {t('sub.launchFreeEnd')}
            </div>
          </div>
        )}

        {/* Toggle mensuel / annuel */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', padding: 4, borderRadius: 14, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            {([['monthly', t('sub.monthly')], ['yearly', t('sub.yearly')]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setCycle(id)}
                style={{
                  padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'Nexa, sans-serif',
                  fontSize: 13, fontWeight: 800, transition: 'all 0.2s',
                  background: cycle === id ? 'var(--gradient)' : 'transparent',
                  color: cycle === id ? '#fff' : 'var(--tx3)',
                }}>
                {label}
              </button>
            ))}
          </div>
          {cycle === 'yearly' && (
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--success)', background: 'color-mix(in srgb, var(--success) 12%, transparent)', padding: '5px 12px', borderRadius: 20 }}>
              {t('sub.upTo')} {maxFreeMonths} {t('sub.monthsFree')}
            </span>
          )}
        </div>

        {/* Cartes des plans */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {PLAN_LIST.map(plan => {
            const price = priceFor(plan, cycle)
            const perMonth = cycle === 'yearly' ? Math.round(plan.yearly / 12) : plan.monthly
            const savings = yearlySavings(plan)
            return (
              <div key={plan.id} className="card" style={{
                padding: '28px 26px', position: 'relative',
                borderColor: plan.highlighted ? 'var(--accent)' : 'var(--border)',
                boxShadow: plan.highlighted ? '0 12px 40px color-mix(in srgb, var(--accent) 18%, transparent)' : undefined,
              }}>
                {plan.highlighted && (
                  <div style={{ position: 'absolute', top: 16, insetInlineEnd: 16, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 800, color: '#fff', background: 'var(--gradient)', padding: '5px 11px', borderRadius: 20, letterSpacing: '0.04em' }}>
                    <Star size={11} fill="#fff" strokeWidth={0} /> RECOMMANDÉ
                  </div>
                )}

                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx)', marginBottom: 4 }}>{plan.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--tx3)', fontWeight: 300, lineHeight: 1.5, marginBottom: 20, minHeight: 36 }}>{plan.tagline}</div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 34, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.02em' }}>{da(price)}</span>
                  <span style={{ fontSize: 13, color: 'var(--tx3)', fontWeight: 300 }}>DA / {cycle === 'monthly' ? t('sub.monthly').toLowerCase() : t('sub.yearly').toLowerCase()}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300, marginTop: 4, minHeight: 18 }}>
                  {cycle === 'yearly'
                    ? <>{t('sub.perMonthEquiv')} {da(perMonth)} DA/{t('sub.monthly').toLowerCase()} · <span style={{ color: 'var(--success)', fontWeight: 700 }}>{t('sub.savings')} {da(savings)} DA</span></>
                    : <>{t('sub.orYearly')} {da(plan.yearly)} DA/{t('sub.yearly').toLowerCase()}</>}
                </div>

                <button
                  onClick={() => { setSubmitted(false); setErr(''); setPayRef(''); setChosen(plan) }}
                  className={plan.highlighted ? 'btn-primary btn-block' : 'btn-ghost btn-block'}
                  style={{ margin: '22px 0', ...(plan.highlighted ? {} : { borderColor: 'var(--accent)', color: 'var(--accent)' }) }}>
                  {t('sub.choosePlan')} {plan.name}
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {FEATURES.map((f, i) => {
                    const v = plan.id === 'basic' ? f.basic : f.premium
                    const included = v !== false
                    const detail = typeof v === 'string' ? v : null
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, opacity: included ? 1 : 0.4 }}>
                        <span style={{ flexShrink: 0, marginTop: 1, color: included ? 'var(--accent)' : 'var(--tx3)' }}>
                          {included ? <Check size={15} strokeWidth={3} /> : <Minus size={15} />}
                        </span>
                        <span style={{ fontSize: 13, color: included ? 'var(--tx2)' : 'var(--tx3)', fontWeight: 300, lineHeight: 1.4 }}>
                          {f.label}{detail && <span style={{ color: 'var(--accent)', fontWeight: 700 }}> · {detail}</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 24, fontSize: 12, color: 'var(--tx3)', fontWeight: 300, lineHeight: 1.7, textAlign: 'center' }}>
          {t('sub.payNote')}
        </div>
      </div>

      {/* Modale : instructions de paiement + soumission */}
      {chosen && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: 460, margin: 16, padding: '26px 24px', direction: isAr ? 'rtl' : 'ltr' }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--success)', marginBottom: 14 }}><CheckCircle2 size={48} /></div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>{t('sub.successTitle')}</div>
                <p style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 300, lineHeight: 1.7, marginBottom: 22 }}>
                  {t('sub.yourRequest')} <strong style={{ color: 'var(--tx)' }}>{chosen.name}</strong> {t('sub.successDesc')}
                </p>
                <button onClick={closeModal} className="btn-primary btn-block">{t('sub.close')}</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 4 }}>{t('sub.modalTitle')}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)' }}>{chosen.name} · {cycle === 'monthly' ? t('sub.monthly') : t('sub.yearly')}</div>
                  </div>
                  <button onClick={closeModal} style={{ background: 'transparent', border: 'none', color: 'var(--tx3)', cursor: 'pointer', padding: 0 }}><X size={20} /></button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '14px 0', borderTop: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)', marginBottom: 16 }}>
                  <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 300 }}>{t('sub.amount')}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{da(priceFor(chosen, cycle))} DA <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>/ {cycle === 'monthly' ? t('sub.monthly').toLowerCase() : t('sub.yearly').toLowerCase()}</span></span>
                </div>

                <div style={{ background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 8 }}>{t('sub.howToPay')}</div>
                  <p style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 300, lineHeight: 1.7 }}>
                    {t('sub.howToPayDesc')} <strong style={{ color: 'var(--tx)' }}>{da(priceFor(chosen, cycle))} DA</strong> {t('sub.howToPayOn')}<br />
                    <strong style={{ color: 'var(--tx)' }}>{t('sub.ribLabel')}</strong><br />
                    {t('sub.ribHint')} <strong style={{ color: 'var(--tx)' }}>{t('sub.ribHintEnd')}</strong> {t('sub.ribHintEnd2')}
                  </p>
                </div>

                <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 8, fontWeight: 800, letterSpacing: '0.06em' }}>{t('sub.refLabel')}</label>
                <input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder={t('sub.refPh')} className="field" style={{ marginBottom: 16 }} />

                {free && (
                  <p style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300, lineHeight: 1.6, marginBottom: 14 }}>
                    {t('sub.launchNote')} {freeUntil}. {t('sub.launchNoteEnd')}
                  </p>
                )}

                {err && <div style={{ fontSize: 12, color: '#f87171', fontWeight: 500, marginBottom: 12 }}>{err}</div>}

                <button onClick={submit} disabled={submitting} className="btn-primary btn-block">
                  {submitting ? t('sub.sending') : t('sub.submit')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
