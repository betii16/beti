'use client'

// Abonnement de l'artisan : où il en est, les formules et leurs prix (lus en
// base), et la demande d'abonnement une fois le paiement fait. L'équipe la valide
// dans le panneau admin ; la base calcule elle-même le montant.

import { useActionState } from 'react'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { subscriptionAction, type SubscriptionState } from '@/lib/listing/actions'
import { ALERT, FIELD, HELP, INPUT, LABEL, PRIMARY } from './form-styles'

export type Plan = { id: 'basic' | 'premium'; monthly: number; yearly: number; max_portfolio_posts: number | null }
export type Subscription = { id: string; plan: string; cycle: string; amount: number; payment_method: string; payment_ref: string | null; expires_at: string | null }

export function ListingSubscription({
  lang,
  plans,
  active,
  pending,
  launchUntil,
  paymentDetails,
  t,
  errors,
}: {
  lang: Locale
  plans: Plan[]
  active: Subscription | null
  pending: Subscription | null
  /** Fin du lancement gratuit si elle est à venir, sinon null. */
  launchUntil: string | null
  paymentDetails: string | null
  t: Dictionary['listing']
  errors: Dictionary['errors']
}) {
  const [state, run, running] = useActionState<SubscriptionState, FormData>(subscriptionAction, {})
  const locale = lang === 'ar' ? 'ar-DZ' : 'fr-DZ'
  const number = new Intl.NumberFormat(locale)
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' })
  const planName = (id: string) => (id === 'premium' ? t.planPremium : t.planBasic)
  const cycleName = (cycle: string) => (cycle === 'yearly' ? t.yearly : t.monthly)
  const methodName = (method: string) => t.methods[method as keyof typeof t.methods] ?? method

  return (
    <section aria-labelledby="abonnement" className="flex flex-col gap-5">
      <h2 id="abonnement" className="text-[clamp(1.375rem,2.6vw,1.75rem)] leading-tight font-bold tracking-[-0.025em] rtl:leading-snug">
        {t.subscriptionTitle}
      </h2>

      <p className="max-w-[65ch] text-lg">
        {active?.expires_at
          ? t.activeNote.replace('{plan}', planName(active.plan)).replace('{date}', date.format(new Date(active.expires_at)))
          : launchUntil
            ? t.launchNote.replace('{date}', date.format(new Date(launchUntil)))
            : t.noSubscriptionNote}
      </p>

      <ul className="grid gap-3 sm:grid-cols-2">
        {plans.map(plan => (
          <li key={plan.id} className={`flex flex-col gap-2 rounded-[28px] p-6 ${plan.id === 'premium' ? 'bg-night text-paper' : 'bg-mist'}`}>
            <p className="text-xl font-bold">{planName(plan.id)}</p>
            <p className="text-lg font-semibold">{t.planPrice.replace('{month}', number.format(plan.monthly)).replace('{year}', number.format(plan.yearly))}</p>
            <p className={plan.id === 'premium' ? 'text-paper/80' : 'text-body'}>{plan.id === 'premium' ? t.perksPremium : t.perksBasic.replace('{n}', String(plan.max_portfolio_posts ?? ''))}</p>
          </li>
        ))}
      </ul>

      {pending ? (
        <form action={run} className="flex max-w-[620px] flex-col items-start gap-3 rounded-[22px] border-2 border-ink p-5">
          <input type="hidden" name="id" value={pending.id} />
          <p className="font-medium">
            {t.pendingNote
              .replace('{plan}', planName(pending.plan))
              .replace('{cycle}', cycleName(pending.cycle))
              .replace('{amount}', number.format(pending.amount))
              .replace('{method}', methodName(pending.payment_method))}
          </p>
          <button
            type="submit"
            name="do"
            value="cancel"
            disabled={running}
            className="inline-flex min-h-12 cursor-pointer items-center rounded-full bg-mist px-6 font-semibold transition-colors hover:bg-ink hover:text-paper disabled:cursor-wait disabled:opacity-60"
          >
            {t.cancelRequest}
          </button>
        </form>
      ) : paymentDetails ? (
        <form action={run} className="flex max-w-[620px] flex-col gap-5">
          <p className="rounded-[22px] bg-mist px-5 py-4 whitespace-pre-line">{paymentDetails}</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={FIELD}>
              <span className={LABEL}>{t.planLabel}</span>
              <select name="plan" defaultValue="basic" className={INPUT}>
                {plans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {planName(plan.id)}
                  </option>
                ))}
              </select>
            </label>
            <label className={FIELD}>
              <span className={LABEL}>{t.cycleLabel}</span>
              <select name="cycle" defaultValue="monthly" className={INPUT}>
                <option value="monthly">{t.monthly}</option>
                <option value="yearly">{t.yearly}</option>
              </select>
            </label>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={FIELD}>
              <span className={LABEL}>{t.methodLabel}</span>
              <select name="method" defaultValue="ccp" className={INPUT}>
                {Object.entries(t.methods).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className={FIELD}>
              <span className={LABEL}>{t.refLabel}</span>
              <input name="ref" maxLength={80} dir="ltr" className={`${INPUT} rtl:text-end`} />
              <span className={HELP}>{t.refHelp}</span>
            </label>
          </div>
          <button type="submit" name="do" value="request" disabled={running} className={PRIMARY}>
            {t.requestSubscription}
          </button>
        </form>
      ) : (
        <p className="max-w-[65ch] text-body">{t.paymentSoon}</p>
      )}

      {state.error && (
        <p role="alert" className={`${ALERT} max-w-[620px]`}>
          {errors[state.error]}
        </p>
      )}
    </section>
  )
}
