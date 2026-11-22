import Image from 'next/image'
import Link from 'next/link'
import { BadgeCheck } from 'lucide-react'
import type { CategorySlug } from '@/domain/search'
import { wilayaName } from '@/domain/wilayas'
import { href, type Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { mediaUrl } from '@/lib/media'
import type { Database } from '@/lib/supabase/database.types'
import { Rating } from './rating'

export type ArtisanSummary = Database['public']['Functions']['search_artisans']['Returns'][number]

/** Une ligne de la liste des artisans : toute la ligne mène au profil. */
export function ArtisanCard({ artisan, lang, dict }: { artisan: ArtisanSummary; lang: Locale; dict: Dictionary }) {
  const t = dict.artisan
  const number = new Intl.NumberFormat(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', { maximumFractionDigits: 1 })
  const name = artisan.display_name ?? ''
  const trade = dict.categories[artisan.category as CategorySlug] ?? dict.categories.autre
  const wilaya = artisan.wilaya_code ? wilayaName(artisan.wilaya_code, lang) : undefined
  const place = [artisan.commune, wilaya].filter(Boolean).join(lang === 'ar' ? '، ' : ', ')
  const reviews = artisan.rating_count ?? 0
  const rating = number.format(artisan.rating_avg ?? 0)

  return (
    <li>
      <Link href={href(lang, `/artisans/${artisan.id}`)} className="group flex flex-wrap items-center gap-x-5 gap-y-3 py-5">
        {artisan.avatar_path ? (
          <Image
            src={mediaUrl(artisan.avatar_path)}
            alt=""
            width={72}
            height={72}
            className="size-[72px] shrink-0 rounded-[20px] object-cover"
          />
        ) : (
          // Pas de photo : l'initiale, jamais un visage d'emprunt.
          <span aria-hidden className="flex size-[72px] shrink-0 items-center justify-center rounded-[20px] bg-mist text-2xl font-semibold">
            {name.trim().charAt(0).toUpperCase()}
          </span>
        )}

        <span className="flex min-w-0 flex-[1_1_180px] flex-col gap-1">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-xl leading-snug font-semibold tracking-[-0.01em] underline-offset-4 group-hover:underline">{name}</span>
            {artisan.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-mist px-2.5 py-0.5 text-[13px] font-medium">
                <BadgeCheck aria-hidden className="size-4" />
                {t.verified}
              </span>
            )}
            {/* Les artisans abonnés Premium passent en tête de liste : on le dit. */}
            {artisan.is_premium && (
              <span className="rounded-full border border-line px-2.5 py-0.5 text-[13px] font-medium text-muted">{t.featured}</span>
            )}
          </span>
          <span className="flex flex-wrap gap-x-2.5 text-body">
            <span className="font-medium text-ink">{trade}</span>
            {place && <span>{place}</span>}
          </span>
          {reviews > 0 ? (
            <Rating
              value={rating}
              count={reviews}
              label={t.rating.replace('{rating}', rating).replace('{count}', String(reviews))}
              className="text-[15px]"
            />
          ) : (
            <span className="text-[15px] text-muted">{t.noReviews}</span>
          )}
        </span>

        {/* Sur téléphone ce bloc passe à la ligne : il s'aligne sous le nom, pas sous la photo. */}
        <span className="flex flex-col gap-1 text-[15px] max-sm:w-full max-sm:ps-[92px] sm:items-end">
          {artisan.is_available && (
            <span className="inline-flex items-center gap-2 font-medium">
              <span aria-hidden className="size-2 rounded-full bg-accent" />
              {t.available}
            </span>
          )}
          {artisan.distance_km != null && <span>{t.distance.replace('{n}', number.format(artisan.distance_km))}</span>}
          {artisan.hourly_rate ? <span className="font-semibold">{t.rate.replace('{n}', number.format(artisan.hourly_rate))}</span> : null}
        </span>
      </Link>
    </li>
  )
}
