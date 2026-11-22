import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ListingForm, type ListingValues } from '@/components/listing-form'
import { ListingPhotos } from '@/components/listing-photos'
import { ListingPosition } from '@/components/listing-position'
import { ListingSubscription } from '@/components/listing-subscription'
import { ListingSteps } from '@/components/listing-steps'
import { launchActive } from '@/domain/launch'
import { PAYMENT_DETAILS } from '@/domain/payment'
import { href, isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { requireSession } from '@/lib/auth/session'
import { errorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'
import electricite from '../../../../public/images/metiers/electricite.jpg'

const TITLE = 'text-[clamp(2rem,4vw,2.75rem)] leading-[1.08] font-bold tracking-[-0.035em] text-balance rtl:leading-[1.3]'

export async function generateMetadata({ params }: PageProps<'/[lang]/artisan'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  return { title: getDictionary(lang).listing.title, robots: { index: false, follow: false } }
}

// Espace de l'artisan : un client y crée son profil, un artisan le complète, le publie, se dit disponible.
export default async function ArtisanSpacePage({ params }: PageProps<'/[lang]/artisan'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const session = await requireSession(lang, '/artisan')
  const dict = getDictionary(lang)
  const t = dict.listing

  const supabase = await createClient()
  const [profile, listing, contact, posts, plans, subscriptions, config] = await Promise.all([
    supabase.from('profiles').select('full_name, role, wilaya_code, commune').eq('id', session.userId).maybeSingle(),
    // Sur artisans la lecture est accordée colonne par colonne : on les nomme.
    supabase
      .from('artisans')
      .select('display_name, category, skills, bio, hourly_rate, wilaya_code, commune, radius_km, lat, avatar_path, cover_path, is_available, published, suspended')
      .eq('id', session.userId)
      .maybeSingle(),
    supabase.from('user_contacts').select('phone').eq('user_id', session.userId).maybeSingle(),
    supabase.from('portfolio_posts').select('id, caption, photos').eq('artisan_id', session.userId).order('created_at', { ascending: false }),
    supabase.from('plans').select('id, monthly, yearly, max_portfolio_posts').order('monthly'),
    // L'abonnement d'un artisan se lit ici, jamais dans sa fiche (colonnes fermées à l'API).
    supabase
      .from('subscriptions')
      .select('id, plan, cycle, amount, status, payment_method, payment_ref, expires_at')
      .eq('artisan_id', session.userId)
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: false }),
    supabase.from('app_config').select('launch_free_until').maybeSingle(),
  ])
  const error = profile.error ?? listing.error ?? contact.error ?? posts.error ?? plans.error ?? subscriptions.error ?? config.error
  if (error) {
    return (
      <main id="contenu" className="px-4 pb-6 sm:px-10">
        <div className="mx-auto flex max-w-[1000px] flex-col gap-7 pt-4 lg:pt-8">
          <h1 className={TITLE}>{t.title}</h1>
          <p role="alert" className="max-w-[620px] rounded-[20px] border-2 border-ink px-5 py-3.5 font-medium">
            {dict.errors[errorCode(error)]}
          </p>
        </div>
      </main>
    )
  }

  const own = listing.data
  if (own) {
    const initial: ListingValues = {
      name: own.display_name,
      category: own.category,
      wilaya: String(own.wilaya_code),
      commune: own.commune ?? '',
      bio: own.bio ?? '',
      skills: (own.skills ?? []).join(', '),
      rate: own.hourly_rate == null ? '' : String(own.hourly_rate),
      radius: String(own.radius_km),
    }
    return (
      <main id="contenu" className="px-4 pb-6 sm:px-10">
        <div className="mx-auto flex max-w-[1000px] flex-col gap-8 pt-4 lg:pt-8">
          <h1 className={TITLE}>{t.title}</h1>
          <ListingSteps
            phone={contact.data?.phone ?? null}
            published={own.published}
            available={own.is_available}
            suspended={own.suspended}
            profileHref={href(lang, `/artisans/${session.userId}`)}
            t={t}
            errors={dict.errors}
          />
          <ListingPhotos
            userId={session.userId}
            name={own.display_name}
            avatar={own.avatar_path}
            cover={own.cover_path}
            posts={posts.data ?? []}
            t={t}
            errors={dict.errors}
          />
          <ListingPosition
            placed={own.lat !== null}
            t={t}
            geo={{ denied: dict.booking.shareDenied, unavailable: dict.booking.shareUnavailable }}
            errors={dict.errors}
          />
          <ListingSubscription
            lang={lang}
            plans={plans.data ?? []}
            active={(subscriptions.data ?? []).find(sub => sub.status === 'active') ?? null}
            pending={(subscriptions.data ?? []).find(sub => sub.status === 'pending') ?? null}
            launchUntil={launchActive(config.data?.launch_free_until ?? null) ? (config.data?.launch_free_until ?? null) : null}
            paymentDetails={PAYMENT_DETAILS?.[lang] ?? null}
            t={t}
            errors={dict.errors}
          />
          <section aria-labelledby="profil" className="flex flex-col gap-5">
            <h2 id="profil" className="text-[clamp(1.5rem,3vw,2rem)] leading-tight font-bold tracking-[-0.025em] rtl:leading-snug">
              {t.editTitle}
            </h2>
            <ListingForm lang={lang} initial={initial} mode="edit" published={own.published} t={t} categories={dict.categories} errors={dict.errors} />
          </section>
        </div>
      </main>
    )
  }

  // Pas encore de profil : le formulaire part de ce que l'on sait déjà de la personne.
  const initial: ListingValues = {
    name: profile.data?.full_name ?? '',
    category: '',
    wilaya: profile.data?.wilaya_code ? String(profile.data.wilaya_code) : '',
    commune: profile.data?.commune ?? '',
    bio: '',
    skills: '',
    rate: '',
    radius: '15',
  }
  return (
    <main id="contenu" className="px-4 pb-6 sm:px-10">
      <div className="mx-auto grid max-w-[1000px] items-start gap-10 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] lg:gap-14 lg:pt-8">
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-3">
            <h1 className={TITLE}>{t.createTitle}</h1>
            <p className="max-w-[60ch] text-lg text-body">{t.createIntro}</p>
          </div>
          <ListingForm
            lang={lang}
            initial={initial}
            mode={profile.data?.role === 'artisan' ? 'create' : 'become'}
            t={t}
            categories={dict.categories}
            errors={dict.errors}
          />
        </div>
        {/* Photo d'ambiance, sur grand écran seulement ; elle suit le formulaire en défilant. */}
        <div className="hidden lg:sticky lg:top-6 lg:block">
          {/* Une image « fill » veut un parent en position relative : le bloc collant l'enveloppe. */}
          <div className="relative h-[560px] overflow-hidden rounded-[36px] bg-night">
            <Image src={electricite} alt="" fill sizes="(min-width: 1024px) 400px, 1px" placeholder="blur" className="object-cover" />
          </div>
        </div>
      </div>
    </main>
  )
}
