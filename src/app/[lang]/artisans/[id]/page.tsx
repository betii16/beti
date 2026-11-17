import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { BadgeCheck, ChevronLeft } from 'lucide-react'
import { z } from 'zod'
import { Rating } from '@/components/rating'
import type { CategorySlug } from '@/domain/search'
import { wilayaName } from '@/domain/wilayas'
import { href, isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { errorCode } from '@/lib/errors'
import { mediaUrl } from '@/lib/media'
import { createClient } from '@/lib/supabase/server'

const H2 = 'text-[clamp(1.5rem,2.6vw,2rem)] leading-tight font-bold tracking-[-0.03em] rtl:leading-[1.4]'
const BADGE = 'inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-0.5 text-[13px] font-medium'

// Seules les colonnes affichées sont demandées : ni l'abonnement de l'artisan, ni qui a écrit un avis.
const ARTISAN =
  'id, display_name, category, skills, bio, hourly_rate, wilaya_code, commune, radius_km, avatar_path, cover_path, is_available, phone_verified, verified_at, rating_avg, rating_count, jobs_done'

// Lu deux fois par requête (titre de l'onglet, puis page) : cache() n'interroge la base qu'une fois.
const getArtisan = cache(async (id: string) => {
  // L'identifiant vient de l'adresse : s'il n'a pas la forme attendue, la base n'est pas interrogée.
  if (!z.uuid().safeParse(id).success) return { artisan: null, error: null }
  const supabase = await createClient()
  const { data, error } = await supabase.from('artisans').select(ARTISAN).eq('id', id).maybeSingle()
  return { artisan: data, error }
})

export async function generateMetadata({ params }: PageProps<'/[lang]/artisans/[id]'>): Promise<Metadata> {
  const { lang, id } = await params
  if (!isLocale(lang)) return {}
  const { artisan } = await getArtisan(id)
  if (!artisan) return {}
  const dict = getDictionary(lang)
  const trade = dict.categories[artisan.category as CategorySlug] ?? dict.categories.autre
  const path = `/artisans/${artisan.id}`
  return {
    title: dict.artisan.metaTitle
      .replace('{name}', artisan.display_name)
      .replace('{trade}', trade)
      .replace('{wilaya}', wilayaName(artisan.wilaya_code, lang) ?? ''),
    description: artisan.bio.slice(0, 160) || dict.search.description,
    alternates: { canonical: href(lang, path), languages: { fr: href('fr', path), ar: href('ar', path) } },
  }
}

export default async function ArtisanPage({ params }: PageProps<'/[lang]/artisans/[id]'>) {
  const { lang, id } = await params
  if (!isLocale(lang)) notFound()
  const dict = getDictionary(lang)
  const t = dict.artisan

  const { artisan, error } = await getArtisan(id)
  if (error) {
    return (
      <main id="contenu" className="px-4 pb-6 sm:px-10">
        <div role="alert" className="mx-auto mt-6 flex max-w-[1000px] flex-col items-start gap-3 rounded-[28px] bg-mist p-7 sm:p-10">
          <h1 className="text-2xl leading-tight font-semibold tracking-[-0.02em]">{t.errorTitle}</h1>
          <p className="text-body">{dict.errors[errorCode(error)]}</p>
          {/* Un vrai rechargement : la page est redemandée au serveur. */}
          <a
            href={href(lang, `/artisans/${id}`)}
            className="mt-2 inline-flex min-h-12 items-center rounded-full bg-ink px-6 font-semibold text-paper transition-colors hover:bg-accent hover:text-ink"
          >
            {t.retry}
          </a>
        </div>
      </main>
    )
  }
  // Introuvable, non publié ou suspendu : les règles de la base ne renvoient rien, la page non plus.
  if (!artisan) notFound()

  const supabase = await createClient()
  const [posts, reviews] = await Promise.all([
    // shortcut: six réalisations et dix avis, les plus récents ; ajouter des pages quand un artisan en aura davantage.
    supabase.from('portfolio_posts').select('id, caption, photos').eq('artisan_id', artisan.id).order('created_at', { ascending: false }).limit(6),
    supabase
      .from('reviews')
      .select('id, author_name, rating, comment, reply, created_at')
      .eq('artisan_id', artisan.id)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const locale = lang === 'ar' ? 'ar-DZ' : 'fr-DZ'
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  const date = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' })
  const name = artisan.display_name
  const trade = dict.categories[artisan.category as CategorySlug] ?? dict.categories.autre
  const place = [artisan.commune, wilayaName(artisan.wilaya_code, lang)].filter(Boolean).join(lang === 'ar' ? '، ' : ', ')
  const rating = number.format(artisan.rating_avg)

  return (
    <main id="contenu" className="px-4 pb-6 sm:px-10">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-10 pt-1 lg:gap-12">
        <Link href={href(lang, '/recherche')} className="-mb-6 inline-flex min-h-11 items-center gap-1.5 self-start font-medium lg:-mb-8">
          <ChevronLeft aria-hidden className="size-5 rtl:rotate-180" />
          {t.back}
        </Link>

        <section className="overflow-hidden rounded-[28px] bg-mist sm:rounded-[36px]">
          {artisan.cover_path && (
            <div className="relative h-[180px] sm:h-[280px]">
              <Image src={mediaUrl(artisan.cover_path)} alt="" fill preload sizes="(min-width: 1080px) 1000px, 100vw" className="object-cover" />
            </div>
          )}
          <div className="flex flex-wrap items-start gap-x-8 gap-y-6 p-6 sm:p-10">
            {artisan.avatar_path ? (
              <Image
                src={mediaUrl(artisan.avatar_path)}
                alt={t.photoOf.replace('{name}', name)}
                width={112}
                height={112}
                className="size-[112px] shrink-0 rounded-[28px] object-cover"
              />
            ) : (
              // Pas de photo : l'initiale, jamais un visage d'emprunt.
              <span aria-hidden className="flex size-[112px] shrink-0 items-center justify-center rounded-[28px] bg-paper text-4xl font-semibold">
                {name.trim().charAt(0).toUpperCase()}
              </span>
            )}

            <div className="flex min-w-0 flex-[1_1_300px] flex-col items-start gap-2.5">
              <h1 className="text-[clamp(2rem,4vw,2.75rem)] leading-[1.08] font-bold tracking-[-0.035em] text-balance rtl:leading-[1.3]">{name}</h1>
              {(artisan.verified_at || artisan.phone_verified) && (
                <p className="flex flex-wrap gap-2">
                  {artisan.verified_at && (
                    <span className={BADGE}>
                      <BadgeCheck aria-hidden className="size-4" />
                      {t.verified}
                    </span>
                  )}
                  {artisan.phone_verified && <span className={BADGE}>{t.phoneVerified}</span>}
                </p>
              )}
              <p className="flex flex-wrap gap-x-2.5 text-lg text-body">
                <span className="font-medium text-ink">{trade}</span>
                {place && <span>{place}</span>}
              </p>
              {artisan.rating_count > 0 ? (
                <Rating
                  value={rating}
                  count={artisan.rating_count}
                  label={t.rating.replace('{rating}', rating).replace('{count}', String(artisan.rating_count))}
                />
              ) : (
                <p className="text-muted">{t.noReviews}</p>
              )}
              <ul className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-[15px]">
                <li className="inline-flex items-center gap-2 font-medium">
                  <span aria-hidden className={`size-2 rounded-full ${artisan.is_available ? 'bg-accent' : 'bg-muted'}`} />
                  {artisan.is_available ? t.available : t.unavailable}
                </li>
                {artisan.hourly_rate ? <li className="font-semibold">{t.rate.replace('{n}', number.format(artisan.hourly_rate))}</li> : null}
                <li>{t.radius.replace('{n}', number.format(artisan.radius_km))}</li>
                {artisan.jobs_done > 0 && <li>{t.jobs.replace('{n}', number.format(artisan.jobs_done))}</li>}
              </ul>
            </div>

            <div className="flex flex-[1_1_240px] flex-col gap-2.5 sm:max-w-[280px]">
              <Link
                href={href(lang, `/artisans/${artisan.id}/demande`)}
                className="inline-flex min-h-[60px] items-center justify-center rounded-full bg-accent px-7 text-center text-lg font-semibold transition-colors hover:bg-ink hover:text-paper"
              >
                {t.request}
              </Link>
              <p className="text-sm text-muted">{t.requestNote}</p>
            </div>
          </div>
        </section>

        {(artisan.bio || artisan.skills.length > 0) && (
          <section className="flex flex-col gap-4">
            <h2 className={H2}>{t.about}</h2>
            {artisan.bio && <p className="max-w-[65ch] text-lg whitespace-pre-line text-body">{artisan.bio}</p>}
            {artisan.skills.length > 0 && (
              <>
                <h3 className="pt-2 text-lg font-semibold">{t.skills}</h3>
                <ul className="flex flex-wrap gap-2.5">
                  {artisan.skills.map(skill => (
                    <li key={skill} className="inline-flex min-h-10 items-center rounded-full bg-mist px-4.5 font-medium">
                      {skill}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {(posts.error || (posts.data && posts.data.length > 0)) && (
          <section className="flex flex-col gap-4">
            <h2 className={H2}>{t.portfolio}</h2>
            {posts.error ? (
              <p role="alert" className="text-body">
                {dict.errors[errorCode(posts.error)]}
              </p>
            ) : (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-x-4 gap-y-6">
                {posts.data.map(post => (
                  <li key={post.id}>
                    <figure className="flex flex-col gap-2.5">
                      <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-[28px]">
                        {post.photos.map((photo, i) => (
                          // La première photo en grand, les suivantes en vignettes.
                          <div key={photo} className={`relative bg-mist ${i === 0 ? 'col-span-2 aspect-[4/3]' : 'aspect-square'}`}>
                            <Image
                              src={mediaUrl(photo)}
                              alt={i === 0 ? t.workOf.replace('{name}', name) : ''}
                              fill
                              sizes="(min-width: 1080px) 320px, (min-width: 640px) 50vw, 100vw"
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                      {post.caption && <figcaption className="text-body">{post.caption}</figcaption>}
                    </figure>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="flex flex-col gap-4">
          <h2 className={H2}>{t.reviews}</h2>
          {reviews.error ? (
            <p role="alert" className="text-body">
              {dict.errors[errorCode(reviews.error)]}
            </p>
          ) : reviews.data.length === 0 ? (
            <p className="text-muted">{t.noReviews}</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {reviews.data.map(review => (
                <li key={review.id} className="flex flex-col gap-2 py-5">
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold">{review.author_name}</span>
                    <Rating
                      value={number.format(review.rating)}
                      label={t.stars.replace('{rating}', number.format(review.rating))}
                      className="text-[15px]"
                    />
                    <time dateTime={review.created_at} className="text-sm text-muted">
                      {date.format(new Date(review.created_at))}
                    </time>
                  </p>
                  {review.comment && <p className="max-w-[65ch] whitespace-pre-line text-body">{review.comment}</p>}
                  {review.reply && (
                    <div className="mt-1 flex max-w-[65ch] flex-col gap-1 rounded-[20px] bg-mist px-5 py-4">
                      <span className="text-sm font-semibold">{t.reply}</span>
                      <p className="whitespace-pre-line text-body">{review.reply}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
