import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { z } from 'zod'
import { BookingActions } from '@/components/booking-actions'
import { Conversation } from '@/components/conversation'
import { Rating } from '@/components/rating'
import { ReviewForm } from '@/components/review-form'
import { ReviewReply } from '@/components/review-reply'
import { bookingActions, canReview, conversationClosed, type BookingRole } from '@/domain/bookings'
import { formatPhone } from '@/domain/listing'
import type { CategorySlug } from '@/domain/search'
import { wilayaName } from '@/domain/wilayas'
import { href, isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { requireSession } from '@/lib/auth/session'
import { errorCode } from '@/lib/errors'
import { mediaUrl } from '@/lib/media'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata({ params }: PageProps<'/[lang]/demandes/[id]'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  return { title: getDictionary(lang).booking.listTitle, robots: { index: false, follow: false } }
}

export default async function RequestPage({ params }: PageProps<'/[lang]/demandes/[id]'>) {
  const { lang, id } = await params
  if (!isLocale(lang)) notFound()
  // L'identifiant vient de l'adresse : s'il n'a pas la forme attendue, la base n'est pas interrogée.
  if (!z.uuid().safeParse(id).success) notFound()
  const session = await requireSession(lang, `/demandes/${id}`)
  const dict = getDictionary(lang)
  const t = dict.booking

  const supabase = await createClient()
  // Le RLS ne rend la demande qu'à ses deux parties (et à l'équipe), l'adresse à l'artisan seulement après acceptation.
  const [{ data: booking, error }, messages, review] = await Promise.all([
    supabase
      .from('bookings')
      .select(
        'id, status, description, category, wilaya_code, commune, scheduled_for, is_urgent, quoted_price, cancel_reason, created_at, completed_at, client_id, artisan_id, artisans(display_name), booking_private(address)',
      )
      .eq('id', id)
      .maybeSingle(),
    // shortcut: les 200 derniers messages ; paginer si une conversation dépasse un jour cette taille.
    supabase.from('messages').select('id, sender_id, body, created_at, read_at').eq('booking_id', id).order('created_at', { ascending: false }).limit(200),
    supabase.from('reviews').select('id, rating, comment, photos, reply').eq('booking_id', id).maybeSingle(),
  ])
  if (!booking && !error) notFound()

  const role: BookingRole | null = !booking ? null : booking.client_id === session.userId ? 'client' : booking.artisan_id === session.userId ? 'artisan' : null
  // Le client voit le nom de l'artisan ; l'artisan, celui du client (lisible parce qu'ils partagent cette demande).
  let title = booking?.artisans?.display_name ?? t.received
  if (booking && role === 'artisan') {
    title = t.received
    if (booking.client_id) {
      const client = await supabase.from('profiles').select('full_name').eq('id', booking.client_id).maybeSingle()
      if (client.data?.full_name) title = t.from.replace('{name}', client.data.full_name)
    }
  }

  // Le numéro de l'autre partie n'existe pour la base qu'une fois la demande acceptée.
  const contact =
    booking && role && (booking.status === 'accepted' || booking.status === 'finished' || booking.status === 'completed')
      ? await supabase.rpc('booking_contact', { p_booking_id: booking.id })
      : null
  const phone = contact?.data?.[0]?.phone

  const locale = lang === 'ar' ? 'ar-DZ' : 'fr-DZ'
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' })
  const address = booking?.booking_private?.address

  return (
    <main id="contenu" className="px-4 pb-6 sm:px-10">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-7 pt-1">
        <Link href={href(lang, '/demandes')} className="-mb-3 inline-flex min-h-11 items-center gap-1.5 self-start font-medium">
          <ChevronLeft aria-hidden className="size-5 rtl:rotate-180" />
          {t.backToList}
        </Link>

        {!booking ? (
          <p role="alert" className="max-w-[620px] rounded-[20px] border-2 border-ink px-5 py-3.5 font-medium">
            {dict.errors[errorCode(error)]}
          </p>
        ) : (
          <>
            <div className="flex flex-col items-start gap-2.5">
              <h1 className="text-[clamp(2rem,4vw,2.75rem)] leading-[1.08] font-bold tracking-[-0.035em] text-balance rtl:leading-[1.3]">{title}</h1>
              <p className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-ink px-3.5 py-1 text-[15px] font-semibold text-paper">{t.status[booking.status]}</span>
                {booking.is_urgent && <span className="rounded-full border-2 border-ink px-3 py-0.5 text-[15px] font-semibold">{t.urgentTag}</span>}
              </p>
              <p className="flex flex-wrap gap-x-2.5 text-lg text-body">
                <span className="font-medium text-ink">{dict.categories[booking.category as CategorySlug] ?? dict.categories.autre}</span>
                <span>{[booking.commune, wilayaName(booking.wilaya_code, lang)].filter(Boolean).join(lang === 'ar' ? '، ' : ', ')}</span>
              </p>
              <p className="flex flex-wrap gap-x-4 text-[15px] text-muted">
                <span>{t.sentOn.replace('{date}', date.format(new Date(booking.created_at)))}</span>
                {booking.scheduled_for && <span>{t.wishedOn.replace('{date}', date.format(new Date(booking.scheduled_for)))}</span>}
              </p>
              {booking.quoted_price != null && (
                <p className="text-lg font-semibold">{t.quoted.replace('{n}', new Intl.NumberFormat(locale).format(booking.quoted_price))}</p>
              )}
              {booking.cancel_reason && <p className="text-body">{t.cancelReason.replace('{reason}', booking.cancel_reason)}</p>}
            </div>

            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold tracking-[-0.01em]">{t.need}</h2>
              <p className="max-w-[65ch] text-lg whitespace-pre-line text-body">{booking.description}</p>
            </section>

            {(address || (role === 'artisan' && booking.status === 'pending')) && (
              <section className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold tracking-[-0.01em]">{t.addressLabel}</h2>
                <p className="max-w-[65ch] text-lg text-body">{address || t.addressLater}</p>
              </section>
            )}

            {contact && (
              <section className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold tracking-[-0.01em]">{role === 'client' ? t.contactArtisan : t.contactClient}</h2>
                {contact.error ? (
                  <p role="alert" className="text-body">
                    {dict.errors[errorCode(contact.error)]}
                  </p>
                ) : phone ? (
                  <p className="flex flex-wrap items-center gap-4">
                    <bdi dir="ltr" className="text-xl font-semibold">
                      {formatPhone(phone)}
                    </bdi>
                    <a
                      href={`tel:${phone}`}
                      className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
                    >
                      {t.call}
                    </a>
                  </p>
                ) : (
                  <p className="text-body">{t.noContact}</p>
                )}
              </section>
            )}

            <BookingActions bookingId={booking.id} actions={role ? bookingActions(role, booking.status) : []} t={t} errors={dict.errors} />

            {role && review.error && (
              <p role="alert" className="max-w-[620px] rounded-[20px] border-2 border-ink px-5 py-3.5 font-medium">
                {dict.errors[errorCode(review.error)]}
              </p>
            )}
            {review.data ? (
              <section className="flex max-w-[680px] flex-col gap-3">
                <h2 className="text-xl font-semibold tracking-[-0.01em]">{role === 'artisan' ? t.reviewTitleArtisan : t.reviewTitleClient}</h2>
                <Rating value={String(review.data.rating)} label={dict.artisan.stars.replace('{rating}', String(review.data.rating))} className="text-lg" />
                {review.data.comment && <p className="text-lg whitespace-pre-line text-body">{review.data.comment}</p>}
                {review.data.photos.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {review.data.photos.map(photo => (
                      <li key={photo} className="relative size-28 overflow-hidden rounded-[20px] bg-mist">
                        <Image src={mediaUrl(photo)} alt="" fill sizes="112px" className="object-cover" />
                      </li>
                    ))}
                  </ul>
                )}
                {role === 'artisan' ? (
                  <ReviewReply reviewId={review.data.id} reply={review.data.reply} t={t} errors={dict.errors} />
                ) : (
                  review.data.reply && (
                    <div className="flex flex-col gap-1 border-s-4 border-sage ps-4">
                      <p className="font-semibold">{dict.artisan.reply}</p>
                      <p className="whitespace-pre-line text-body">{review.data.reply}</p>
                    </div>
                  )
                )}
              </section>
            ) : (
              role === 'client' &&
              canReview(booking.status, booking.completed_at) && (
                <section className="flex flex-col gap-4">
                  <h2 className="text-xl font-semibold tracking-[-0.01em]">{t.reviewTitleClient}</h2>
                  <ReviewForm bookingId={booking.id} t={t} errors={dict.errors} />
                </section>
              )
            )}

            {role &&
              (messages.error ? (
                <p role="alert" className="max-w-[620px] rounded-[20px] border-2 border-ink px-5 py-3.5 font-medium">
                  {dict.errors[errorCode(messages.error)]}
                </p>
              ) : (
                <Conversation
                  lang={lang}
                  bookingId={booking.id}
                  userId={session.userId}
                  initial={messages.data.toReversed()}
                  closed={conversationClosed(booking.status, booking.completed_at)}
                  t={t}
                  errors={dict.errors}
                />
              ))}

            {role && (
              <Link href={href(lang, `/signaler?type=booking&id=${booking.id}`)} className="inline-flex min-h-11 items-center self-start text-[15px] text-muted underline underline-offset-4">
                {dict.report.linkBooking}
              </Link>
            )}
          </>
        )}
      </div>
    </main>
  )
}
