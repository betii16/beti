import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminForm } from '@/components/admin-form'
import { ADMIN_DARK, ADMIN_INPUT } from '@/components/admin-styles'
import type { BookingStatus } from '@/domain/bookings'
import { launchActive } from '@/domain/launch'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { requireStaff } from '@/lib/auth/session'
import { errorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Vue d’ensemble' }

// Forme du JSON renvoyé par admin_overview() (supabase/migrations/…400_admin.sql).
type Overview = {
  users: number
  users_7d: number
  users_suspended: number
  artisans: number
  artisans_published: number
  artisans_subscribed: number
  bookings: number
  bookings_7d: number
  bookings_by_status: Partial<Record<BookingStatus, number>>
  reviews: number
  subscriptions_pending: number
  subscriptions_month_amount: number
  reports_open: number
  launch_free_until: string | null
}

export default async function AdminHome({ params }: PageProps<'/[lang]/admin'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  await requireStaff(lang, '/admin')
  const dict = getDictionary('fr')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_overview')
  if (error) {
    return (
      <p role="alert" className="max-w-[620px] rounded-[20px] border-2 border-ink px-5 py-3.5 font-medium">
        {dict.errors[errorCode(error)]}
      </p>
    )
  }
  const o = data as unknown as Overview
  const number = new Intl.NumberFormat('fr-DZ')
  const day = new Intl.DateTimeFormat('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' })
  const launchUntil = o.launch_free_until ? new Date(o.launch_free_until) : null
  const launchOn = launchActive(o.launch_free_until)

  const tiles = [
    { title: 'Comptes', value: o.users, lines: [`${number.format(o.users_7d)} sur 7 jours`, `${number.format(o.users_suspended)} suspendus`] },
    { title: 'Artisans', value: o.artisans, lines: [`${number.format(o.artisans_published)} visibles`, `${number.format(o.artisans_subscribed)} abonnés`] },
    {
      title: 'Demandes',
      value: o.bookings,
      lines: [
        `${number.format(o.bookings_7d)} sur 7 jours`,
        `${number.format((o.bookings_by_status.pending ?? 0) + (o.bookings_by_status.accepted ?? 0) + (o.bookings_by_status.finished ?? 0))} en cours`,
      ],
    },
    { title: 'Avis', value: o.reviews, lines: [] },
  ]

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-[clamp(1.75rem,3.4vw,2.375rem)] leading-[1.08] font-bold tracking-[-0.035em]">Vue d’ensemble</h1>

      {/* Ce qui attend une décision de l'équipe passe avant les chiffres. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/fr/admin/signalements" className={`flex flex-col gap-1 rounded-[28px] p-6 ${o.reports_open > 0 ? 'bg-accent' : 'bg-mist'}`}>
          <span className="text-4xl font-bold">{number.format(o.reports_open)}</span>
          <span className="font-semibold">signalements à traiter</span>
        </Link>
        <Link href="/fr/admin/abonnements" className={`flex flex-col gap-1 rounded-[28px] p-6 ${o.subscriptions_pending > 0 ? 'bg-accent' : 'bg-mist'}`}>
          <span className="text-4xl font-bold">{number.format(o.subscriptions_pending)}</span>
          <span className="font-semibold">abonnements à valider</span>
        </Link>
      </div>

      <dl className="grid grid-cols-[repeat(auto-fill,minmax(min(220px,100%),1fr))] gap-x-6 gap-y-5 border-y border-line py-6">
        {tiles.map(tile => (
          <div key={tile.title} className="flex flex-col gap-1">
            <dt className="text-[15px] font-semibold text-muted">{tile.title}</dt>
            <dd className="text-3xl font-bold">{number.format(tile.value)}</dd>
            {tile.lines.map(line => (
              <dd key={line} className="text-[15px] text-body">
                {line}
              </dd>
            ))}
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <dt className="text-[15px] font-semibold text-muted">Abonnements validés ce mois</dt>
          <dd className="text-3xl font-bold">{number.format(o.subscriptions_month_amount)} DA</dd>
        </div>
      </dl>

      <section className="flex max-w-[620px] flex-col gap-3">
        <h2 className="text-xl font-semibold">Lancement gratuit</h2>
        <p className="text-body">
          {launchUntil
            ? `${launchOn ? 'En cours jusqu’au' : 'Terminé depuis le'} ${day.format(launchUntil)}. ${launchOn ? 'Tous les artisans publiés sont visibles, abonnés ou non.' : 'Seuls les artisans abonnés sont visibles.'}`
            : 'Aucune date : seuls les artisans abonnés sont visibles.'}
        </p>
        <AdminForm errors={dict.errors}>
          <input type="hidden" name="do" value="launch_until" />
          <label className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold">Nouvelle date de fin</span>
            <input type="date" name="until" required className={ADMIN_INPUT} />
          </label>
          <button type="submit" className={ADMIN_DARK}>
            Enregistrer
          </button>
        </AdminForm>
      </section>
    </div>
  )
}
