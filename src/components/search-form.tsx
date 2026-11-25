import { Search } from 'lucide-react'
import { CATEGORY_SLUGS, type SearchFilters } from '@/domain/search'
import { wilayas } from '@/domain/wilayas'
import { href, type Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'

const FIELD =
  'relative flex min-w-0 flex-[1_1_200px] flex-col justify-center rounded-[22px] px-4.5 py-1.5 focus-within:outline-2 focus-within:outline-ink'
// Trait de séparation entre deux champs voisins (un bord sur un champ arrondi serait courbe).
const DIVIDED = 'sm:before:absolute sm:before:inset-y-2 sm:before:start-0 sm:before:w-px sm:before:bg-line'
const LABEL = 'text-[13px] leading-snug font-semibold'
const CONTROL = 'min-h-[30px] min-w-0 bg-transparent py-0.5 text-[17px] outline-hidden'

/** Recherche de l'accueil et de la page de résultats : un simple envoi vers /recherche, sans script. */
export function SearchForm({
  lang,
  dict,
  defaults = {},
  keyword = false,
  className = '',
}: {
  lang: Locale
  dict: Dictionary
  defaults?: Partial<SearchFilters>
  /** Ajoute le champ « mot-clé », utile une fois sur la page de résultats. */
  keyword?: boolean
  className?: string
}) {
  const t = dict.search
  return (
    <form
      action={href(lang, '/recherche')}
      role="search"
      className={`flex min-w-0 flex-wrap items-stretch gap-2 rounded-[30px] p-2.5 ${className}`}
    >
      <label className={FIELD}>
        <span className={LABEL}>{t.trade}</span>
        {/* -ms-1 : rattrape le retrait interne d'un <select> pour l'aligner sur son étiquette. */}
        <select name="categorie" defaultValue={defaults.categorie ?? ''} className={`-ms-1 ${CONTROL}`}>
          <option value="">{t.allTrades}</option>
          {CATEGORY_SLUGS.map(slug => (
            <option key={slug} value={slug}>
              {dict.categories[slug]}
            </option>
          ))}
        </select>
      </label>
      <label className={`${FIELD} ${DIVIDED}`}>
        <span className={LABEL}>{t.wilaya}</span>
        <select name="wilaya" defaultValue={defaults.wilaya ?? ''} className={`-ms-1 ${CONTROL}`}>
          <option value="">{t.allWilayas}</option>
          {wilayas.map((wilaya, i) => (
            <option key={wilaya.fr} value={i + 1}>
              {wilaya[lang]} ({i + 1})
            </option>
          ))}
        </select>
      </label>
      {keyword && (
        <label className={`${FIELD} ${DIVIDED}`}>
          <span className={LABEL}>{t.keyword}</span>
          <input
            name="q"
            type="search"
            maxLength={60}
            defaultValue={defaults.q ?? ''}
            placeholder={t.keywordPlaceholder}
            className={CONTROL}
          />
        </label>
      )}
      <button
        type="submit"
        className="inline-flex min-h-[60px] flex-[1_1_220px] cursor-pointer items-center justify-center gap-2.5 rounded-full bg-ink px-7 text-lg font-semibold text-paper transition-colors hover:bg-accent hover:text-ink"
      >
        <Search aria-hidden className="size-5" strokeWidth={2.6} />
        {t.submit}
      </button>
    </form>
  )
}
