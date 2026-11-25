import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdminForm } from '@/components/admin-form'
import { ADMIN_DARK, ADMIN_INPUT, ADMIN_LIGHT } from '@/components/admin-styles'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { requireStaff } from '@/lib/auth/session'
import { errorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Abonnements' }

// Libellés des valeurs permises par les contraintes de public.subscriptions (…100_schema.sql).
const PLANS: Record<string, string> = { basic: 'Basique', premium: 'Premium' }
const CYCLES: Record<string, string> = { monthly: 'mensuel', yearly: 'annuel' }
const PAYMENTS: Record<string, string> = { transfer: 'Virement', ccp: 'CCP', baridimob: 'BaridiMob', cash: 'Espèces' }
const STATUSES: Record<string, string> = { pending: 'En attente', active: 'Actif', rejected: 'Refusé', expired: 'Expiré', cancelled: 'Annulé par l’artisan' }

export default async function AdminSubscriptions({ params }: PageProps<'/[lang]/admin/abonnements'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  await requireStaff(lang, '/admin/abonnements')
  const dict = getDictionary('fr')

  const supabase = await createClient()
  const columns = 'id, artisan_label, plan, cycle, amount, status, payment_method, payment_ref, note, created_at, reviewed_at, expires_at'
  const [pending, recent] = await Promise.all([
    supabase.from('subscriptions').select(columns).eq('status', 'pending').order('created_at', { ascending: true }),
    supabase.from('subscriptions').select(columns).neq('status', 'pending').order('created_at', { ascending: false }).limit(30),
  ])
  const error = pending.error ?? recent.error
  const number = new Intl.NumberFormat('fr-DZ')
  const date = new Intl.DateTimeFormat('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Algiers' })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[clamp(1.75rem,3.4vw,2.375rem)] leading-[1.08] font-bold tracking-[-0.035em]">Abonnements</h1>
        <p className="max-w-[70ch] text-body">
          Vérifiez le paiement avec sa référence avant de valider. Un renouvellement du même plan prolonge la date en cours ; l’artisan est prévenu dans les deux cas.
        </p>
      </div>

      {error ? (
        <p role="alert" className="max-w-[620px] rounded-[20px] border-2 border-ink px-5 py-3.5 font-medium">
          {dict.errors[errorCode(error)]}
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">À valider</h2>
            {pending.data?.length === 0 ? (
              <p className="rounded-[28px] bg-mist p-6 font-medium">Aucune demande d’abonnement en attente.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {pending.data?.map(sub => (
                  <li key={sub.id} className="flex flex-col gap-3 rounded-[28px] bg-mist p-5 sm:p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="text-lg font-semibold">{sub.artisan_label}</p>
                      <p className="text-lg font-bold">{number.format(sub.amount)} DA</p>
                    </div>
                    <p className="text-body">
                      {PLANS[sub.plan] ?? sub.plan}, {CYCLES[sub.cycle] ?? sub.cycle}. {PAYMENTS[sub.payment_method] ?? sub.payment_method}
                      {sub.payment_ref ? (
                        <>
                          , référence <span className="font-mono font-semibold text-ink">{sub.payment_ref}</span>
                        </>
                      ) : (
                        ', sans référence'
                      )}
                      . Demandé le {date.format(new Date(sub.created_at))}.
                    </p>
                    <AdminForm errors={dict.errors}>
                      <input type="hidden" name="id" value={sub.id} />
                      <label className="flex min-w-0 flex-[1_1_260px] items-center gap-2">
                        <span className="sr-only">Note pour l’artisan (facultatif)</span>
                        <input name="reason" maxLength={500} placeholder="Note (facultatif)" className={`${ADMIN_INPUT} w-full bg-paper`} />
                      </label>
                      <button type="submit" name="do" value="approve_subscription" className={ADMIN_DARK}>
                        Valider
                      </button>
                      <button type="submit" name="do" value="reject_subscription" className={ADMIN_LIGHT}>
                        Refuser
                      </button>
                    </AdminForm>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {recent.data && recent.data.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold">Déjà traités</h2>
              <ul className="divide-y divide-line border-y border-line">
                {recent.data.map(sub => (
                  <li key={sub.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
                    <p>
                      <span className="font-semibold">{sub.artisan_label}</span>{' '}
                      <span className="text-body">
                        {PLANS[sub.plan] ?? sub.plan}, {CYCLES[sub.cycle] ?? sub.cycle}, {number.format(sub.amount)} DA
                      </span>
                    </p>
                    <p className="text-sm text-body">
                      {STATUSES[sub.status] ?? sub.status}
                      {sub.status === 'active' && sub.expires_at && ` jusqu’au ${date.format(new Date(sub.expires_at))}`}
                      {sub.note && `, « ${sub.note} »`}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
