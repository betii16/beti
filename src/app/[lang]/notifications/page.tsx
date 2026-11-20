import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ClearNotifications, MarkSeen } from '@/components/notification-tools'
import { href, isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { requireSession } from '@/lib/auth/session'
import { errorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata({ params }: PageProps<'/[lang]/notifications'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  return { title: getDictionary(lang).notifications.title, robots: { index: false, follow: false } }
}

export default async function NotificationsPage({ params }: PageProps<'/[lang]/notifications'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  await requireSession(lang, '/notifications')
  const dict = getDictionary(lang)
  const t = dict.notifications

  const supabase = await createClient()
  // shortcut: les 50 dernières ; paginer si quelqu'un en garde davantage.
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, booking_id, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const date = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Africa/Algiers',
  })

  return (
    <main id="contenu" className="px-4 pb-6 sm:px-10">
      <div className="mx-auto flex max-w-[760px] flex-col gap-7 pt-4 lg:pt-8">
        <h1 className="text-[clamp(2rem,4vw,2.75rem)] leading-[1.08] font-bold tracking-[-0.035em] rtl:leading-[1.3]">{t.title}</h1>

        {error ? (
          <p role="alert" className="max-w-[620px] rounded-[20px] border-2 border-ink px-5 py-3.5 font-medium">
            {dict.errors[errorCode(error)]}
          </p>
        ) : data.length === 0 ? (
          <p className="rounded-[28px] bg-mist p-7 text-lg font-medium">{t.empty}</p>
        ) : (
          <>
            {data.some(item => !item.read_at) && <MarkSeen />}
            <ul className="divide-y divide-line border-y border-line">
              {data.map(item => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4">
                  <div className="flex min-w-0 flex-[1_1_300px] items-start gap-3">
                    {/* Pastille des nouvelles ; le lecteur d'écran lit « nouvelle » à la place de la couleur. */}
                    <span aria-hidden className={`mt-2 size-2.5 shrink-0 rounded-full ${item.read_at ? 'bg-transparent' : 'bg-accent'}`} />
                    <div className="flex flex-col gap-0.5">
                      <p className={item.read_at ? 'text-body' : 'font-semibold'}>
                        {t.types[item.type]}
                        {!item.read_at && <span className="sr-only"> ({t.unread})</span>}
                      </p>
                      <p className="text-sm text-muted">{date.format(new Date(item.created_at))}</p>
                    </div>
                  </div>
                  {item.booking_id && (
                    <Link href={href(lang, `/demandes/${item.booking_id}`)} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
                      {t.open}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <ClearNotifications t={t} errors={dict.errors} />
          </>
        )}
      </div>
    </main>
  )
}
