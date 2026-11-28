import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArtisanCard } from '@/components/artisan-card'
import { NearMe } from '@/components/near-me'
import { SearchForm } from '@/components/search-form'
import { PAGE_SIZE, parseSearch, searchQuery, type SearchFilters } from '@/domain/search'
import { tradeFromQuery } from '@/domain/trades'
import { wilayaName } from '@/domain/wilayas'
import { href, isLocale, type Locale } from '@/i18n/config'
import { getDictionary, type Dictionary } from '@/i18n/dictionary'
import { errorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'

const PILL = 'inline-flex min-h-12 items-center rounded-full px-6 font-semibold transition-colors'
const PANEL = 'flex flex-col items-start gap-3 rounded-[28px] bg-mist p-7 sm:p-10'

function titleOf(dict: Dictionary, lang: Locale, filters: SearchFilters): string {
  const t = dict.search
  const trade = filters.categorie ? dict.categories[filters.categorie] : t.allArtisans
  const wilaya = filters.wilaya ? wilayaName(filters.wilaya, lang) : undefined
  return wilaya ? t.titleIn.replace('{trade}', trade).replace('{wilaya}', wilaya) : t.titleAll.replace('{trade}', trade)
}

export async function generateMetadata({ params, searchParams }: PageProps<'/[lang]/recherche'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const dict = getDictionary(lang)
  return {
    title: titleOf(dict, lang, parseSearch(await searchParams)),
    description: dict.search.description,
    // Une infinité de combinaisons de filtres : ces pages ne sont pas à indexer.
    robots: { index: false, follow: true },
  }
}

export default async function SearchPage({ params, searchParams }: PageProps<'/[lang]/recherche'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const filters = parseSearch(await searchParams)
  const dict = getDictionary(lang)
  const t = dict.search
  const here = href(lang, '/recherche')

  // « plombier » tapé seul : c'est le métier qu'on cherche. La page s'ouvre sur ce métier, choisi dans le formulaire.
  const trade = filters.categorie ? undefined : tradeFromQuery(filters.q)
  if (trade) redirect(`${here}${searchQuery({ ...filters, categorie: trade, q: undefined, page: 1 })}`)

  const supabase = await createClient()
  // Un artisan de plus que la page : s'il arrive, il existe une page suivante.
  const { data, error } = await supabase.rpc('search_artisans', {
    p_category: filters.categorie,
    p_wilaya_code: filters.wilaya,
    p_q: filters.q,
    p_lat: filters.pres?.[0],
    p_lng: filters.pres?.[1],
    p_limit: PAGE_SIZE + 1,
    p_offset: (filters.page - 1) * PAGE_SIZE,
  })
  const found = (data ?? []).filter(artisan => artisan.id)
  const artisans = found.slice(0, PAGE_SIZE)
  const hasNext = found.length > PAGE_SIZE

  return (
    <main id="contenu" data-ecran className="px-4 pb-6 max-sm:pb-0 sm:px-10">
      {/* Sur téléphone, la recherche reste en haut et seule la liste défile (data-ecran, globals.css). */}
      <div className="mx-auto flex max-w-[1000px] flex-col gap-7 pt-4 max-sm:h-full max-sm:gap-3 lg:pt-8">
        <h1 className="text-[clamp(1.75rem,3.4vw,2.5rem)] leading-[1.08] max-sm:text-[1.375rem] font-bold tracking-[-0.035em] text-balance rtl:leading-[1.3]">
          {titleOf(dict, lang, filters)}
        </h1>
        <SearchForm lang={lang} dict={dict} defaults={filters} keyword className="bg-mist" />
        {filters.pres ? (
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-medium">{t.nearMeOn}</span>
            <Link href={`${here}${searchQuery({ ...filters, pres: undefined, page: 1 })}`} className="inline-flex min-h-11 items-center underline underline-offset-4">
              {t.nearMeOff}
            </Link>
          </p>
        ) : (
          <NearMe
            base={`${here}${searchQuery({ ...filters, page: 1 })}`}
            label={t.nearMe}
            denied={dict.booking.shareDenied}
            unavailable={dict.booking.shareUnavailable}
          />
        )}

        <div className="flex flex-col gap-7 max-sm:-mx-4 max-sm:min-h-0 max-sm:flex-1 max-sm:gap-4 max-sm:overflow-y-auto max-sm:overscroll-contain max-sm:px-4 max-sm:pb-4">
          {error ? (
            <div role="alert" className={PANEL}>
              <h2 className="text-2xl leading-tight font-semibold tracking-[-0.02em]">{t.errorTitle}</h2>
              <p className="text-body">{dict.errors[errorCode(error)]}</p>
              {/* Un vrai rechargement : la page est redemandée au serveur. */}
              <a href={`${here}${searchQuery(filters)}`} className={`${PILL} mt-2 bg-ink text-paper hover:bg-accent hover:text-ink`}>
                {t.retry}
              </a>
            </div>
          ) : artisans.length === 0 ? (
            <div className={PANEL}>
              <h2 className="text-2xl leading-tight font-semibold tracking-[-0.02em]">{t.emptyTitle}</h2>
              <p className="max-w-[34em] text-body">{t.emptyText}</p>
              <div className="flex flex-wrap gap-2.5 pt-2">
                {filters.wilaya && (
                  <Link
                    href={`${here}${searchQuery({ ...filters, wilaya: undefined, page: 1 })}`}
                    className={`${PILL} bg-ink text-paper hover:bg-accent hover:text-ink`}
                  >
                    {t.widenPlace}
                  </Link>
                )}
                {filters.categorie && (
                  <Link
                    href={`${here}${searchQuery({ ...filters, categorie: undefined, page: 1 })}`}
                    className={`${PILL} bg-paper hover:bg-ink hover:text-paper`}
                  >
                    {t.widenTrade}
                  </Link>
                )}
                <Link href={href(lang, '/artisan')} className={`${PILL} bg-paper hover:bg-ink hover:text-paper`}>
                  {dict.home.pro.cta}
                </Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {artisans.map(artisan => (
                <ArtisanCard key={artisan.id} artisan={artisan} lang={lang} dict={dict} />
              ))}
            </ul>
          )}

          {(filters.page > 1 || hasNext) && (
            <nav aria-label={t.pages} className="flex flex-wrap justify-between gap-3">
              {filters.page > 1 ? (
                <Link href={`${here}${searchQuery({ ...filters, page: filters.page - 1 })}`} className={`${PILL} bg-mist hover:bg-ink hover:text-paper`}>
                  {t.prev}
                </Link>
              ) : (
                <span />
              )}
              {hasNext && (
                <Link href={`${here}${searchQuery({ ...filters, page: filters.page + 1 })}`} className={`${PILL} bg-ink text-paper hover:bg-accent hover:text-ink`}>
                  {t.next}
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </main>
  )
}
