import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { BookingStatus } from '@/domain/bookings'
import type { CategorySlug } from '@/domain/search'
import { wilayaName } from '@/domain/wilayas'
import { href, isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { requireSession } from '@/lib/auth/session'
import { errorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'

// Le vert marque ce qui avance ; une demande close est discrète. Le libellé dit toujours l'état, pas la couleur seule.
const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: 'bg-mist',
  accepted: 'bg-accent',
  finished: 'bg-accent',
  completed: 'bg-ink text-paper',
  declined: 'border border-line text-muted',
  cancelled: 'border border-line text-muted',
}

export async function generateMetadata({ params }: PageProps<'/[lang]/demandes'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  return { title: getDictionary(lang).booking.listTitle, robots: { index: false, follow: false } }
}

export default async function RequestsPage({ params, searchParams }: PageProps<'/[lang]/demandes'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const session = await requireSession(lang, '/demandes')
  const dict = getDictionary(lang)
  const t = dict.booking

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bookings')
    .select('id, status, description, category, wilaya_code, commune, scheduled_for, is_urgent, quoted_price, created_at, client_id, artisans(display_name)')
    // Le RLS montre toutes les demandes à l'équipe : cette page ne veut que celles de la personne.
    .or(`client_id.eq.${session.userId},artisan_id.eq.${session.userId}`)
    .order('created_at', { ascending: false })
    // shortcut: les 50 dernières demandes ; ajouter des pages quand quelqu'un en aura davantage.
    .limit(50)

  const locale = lang === 'ar' ? 'ar-DZ' : 'fr-DZ'
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' })
  const number = new Intl.NumberFormat(locale)
  const justSent = (await searchParams).envoyee === '1'

  return (
    <main id="contenu" data-ecran className="px-4 pb-6 sm:px-10">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-7 pt-4 lg:pt-8">
        <h1 className="text-[clamp(1.75rem,3.4vw,2.375rem)] leading-[1.08] font-bold tracking-[-0.035em] rtl:leading-[1.3]">{t.listTitle}</h1>

        {justSent && !error && (
          <p role="status" className="max-w-[620px] rounded-[20px] bg-accent px-5 py-3.5 font-medium">
            {t.sent}
          </p>
        )}

        {error ? (
          <p role="alert" className="max-w-[620px] rounded-[20px] border-2 border-ink px-5 py-3.5 font-medium">
            {dict.errors[errorCode(error)]}
          </p>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-[28px] bg-mist p-7 sm:p-10">
            <p className="text-lg font-medium">{t.empty}</p>
            <Link href={href(lang, '/recherche')} className="inline-flex min-h-12 items-center rounded-full bg-ink px-6 font-semibold text-paper transition-colors hover:bg-accent hover:text-ink">
              {t.find}
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {data.map(booking => (
              <li key={booking.id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 py-5">
                <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
                  <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <Link href={href(lang, `/demandes/${booking.id}`)} className="text-xl leading-snug font-semibold tracking-[-0.01em] underline-offset-4 hover:underline">
                      {/* Côté artisan, on ne lit pas ici la fiche du client : la demande est simplement « reçue ». */}
                      {booking.client_id === session.userId ? (booking.artisans?.display_name ?? t.received) : t.received}
                    </Link>
                    {booking.is_urgent && <span className="rounded-full bg-ink px-2.5 py-0.5 text-[13px] font-medium text-paper">{t.urgentTag}</span>}
                  </p>
                  <p className="flex flex-wrap gap-x-2.5 text-body">
                    <span className="font-medium text-ink">{dict.categories[booking.category as CategorySlug] ?? dict.categories.autre}</span>
                    <span>{[booking.commune, wilayaName(booking.wilaya_code, lang)].filter(Boolean).join(lang === 'ar' ? '، ' : ', ')}</span>
                  </p>
                  <p className="line-clamp-2 max-w-[60ch] text-body">{booking.description}</p>
                  <p className="flex flex-wrap gap-x-4 text-sm text-muted">
                    <span>{t.sentOn.replace('{date}', date.format(new Date(booking.created_at)))}</span>
                    {booking.scheduled_for && <span>{t.wishedOn.replace('{date}', date.format(new Date(booking.scheduled_for)))}</span>}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-1.5 sm:items-end">
                  <span className={`rounded-full px-3.5 py-1 text-[15px] font-semibold ${STATUS_STYLE[booking.status]}`}>{t.status[booking.status]}</span>
                  {booking.quoted_price != null && <span className="text-[15px] font-semibold">{t.quoted.replace('{n}', number.format(booking.quoted_price))}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
