import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { BookingForm } from '@/components/booking-form'
import { OPEN_STATUSES } from '@/domain/bookings'
import type { CategorySlug } from '@/domain/search'
import { wilayaName } from '@/domain/wilayas'
import { href, isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { getArtisan } from '@/lib/artisans'
import { requireSession } from '@/lib/auth/session'
import { errorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'

const PANEL = 'flex max-w-[620px] flex-col items-start gap-3 rounded-[28px] bg-mist p-7 sm:p-10'
const PILL = 'inline-flex min-h-12 items-center rounded-full bg-ink px-6 font-semibold text-paper transition-colors hover:bg-accent hover:text-ink'

export async function generateMetadata({ params }: PageProps<'/[lang]/artisans/[id]/demande'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  return { title: getDictionary(lang).booking.metaTitle, robots: { index: false, follow: false } }
}

export default async function RequestPage({ params }: PageProps<'/[lang]/artisans/[id]/demande'>) {
  const { lang, id } = await params
  if (!isLocale(lang)) notFound()
  const dict = getDictionary(lang)
  const t = dict.booking

  // L'artisan d'abord (information publique) : une adresse fausse donne la page 404, pas un détour par la connexion.
  const { artisan, error: artisanError } = await getArtisan(id)
  if (!artisan && !artisanError) notFound()
  const session = await requireSession(lang, `/artisans/${id}/demande`)

  const supabase = await createClient()
  const [profile, open] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', session.userId).maybeSingle(),
    // Une demande déjà en cours avec cet artisan ? create_booking la renverrait sans rien enregistrer de nouveau.
    supabase.from('bookings').select('id').eq('client_id', session.userId).eq('artisan_id', id).in('status', [...OPEN_STATUSES]).limit(1),
  ])
  const failure = artisanError ?? profile.error ?? open.error
  const profilePath = href(lang, `/artisans/${id}`)

  return (
    <main id="contenu" className="px-4 pb-6 sm:px-10">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-7 pt-1">
        <Link href={profilePath} className="-mb-3 inline-flex min-h-11 items-center gap-1.5 self-start font-medium">
          <ChevronLeft aria-hidden className="size-5 rtl:rotate-180" />
          {t.backToProfile}
        </Link>

        {failure || !artisan ? (
          <div role="alert" className={PANEL}>
            <p className="text-lg font-medium">{dict.errors[failure ? errorCode(failure) : 'unknown']}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-[clamp(2rem,4vw,2.75rem)] leading-[1.08] font-bold tracking-[-0.035em] text-balance rtl:leading-[1.3]">
                {t.title.replace('{name}', artisan.display_name)}
              </h1>
              <p className="flex flex-wrap gap-x-2.5 text-lg text-body">
                <span className="font-medium text-ink">{dict.categories[artisan.category as CategorySlug] ?? dict.categories.autre}</span>
                <span>{[artisan.commune, wilayaName(artisan.wilaya_code, lang)].filter(Boolean).join(lang === 'ar' ? '، ' : ', ')}</span>
              </p>
            </div>

            {artisan.id === session.userId ? (
              <div className={PANEL}>
                <p className="text-lg font-medium">{dict.errors.invalid_artisan}</p>
              </div>
            ) : open.data && open.data.length > 0 ? (
              <div className={PANEL}>
                <p className="text-lg font-medium">{t.already}</p>
                <Link href={href(lang, '/demandes')} className={PILL}>
                  {t.seeRequests}
                </Link>
              </div>
            ) : (
              <BookingForm
                lang={lang}
                artisanId={artisan.id}
                wilaya={artisan.wilaya_code}
                askName={!profile.data?.full_name}
                // en-CA écrit une date sous la forme AAAA-MM-JJ, celle qu'attend un champ date.
                today={new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' }).format(new Date())}
                t={t}
                errors={dict.errors}
              />
            )}
          </>
        )}
      </div>
    </main>
  )
}
