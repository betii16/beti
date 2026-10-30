// lib/format.ts — formatage partagé des montants et libellés.
import { t as translate, type Lang } from './translations'

/** Nombre sans décimales inutiles : 12500.5 → « 12 500,5 », 3000 → « 3 000 ». */
export function formatNumber(amount: number, lang: Lang = 'fr'): string {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', { maximumFractionDigits: 2 }).format(amount)
    // Espace fine insécable (U+202F) absente de certaines polices : espace insécable classique.
    .replace(/ /g, ' ')
}

/** Vrai si le montant est exploitable (null, undefined, 0, NaN = pas de tarif). */
export function hasAmount(amount: unknown): boolean {
  const n = Number(amount)
  return amount != null && Number.isFinite(n) && n > 0
}

/**
 * « 12 500,5 DA » / « 12 500,5 دج ». Montant absent ou nul : `fallback`
 * (« — » par défaut), jamais « 0 DA ».
 */
export function formatDA(amount: number | string | null | undefined, lang: Lang = 'fr', fallback = '—'): string {
  if (!hasAmount(amount)) return fallback
  return `${formatNumber(Number(amount), lang)} ${lang === 'ar' ? 'دج' : 'DA'}`
}

/** Libellé de catégorie ; slug inconnu : slug lisible, ou « Autre » si vide. */
export function categoryLabel(slug: string | null | undefined, lang: Lang = 'fr'): string {
  const s = (slug || '').trim()
  if (!s) return translate('cxq.catOther', lang)
  const key = `categories.${s}`
  const label = translate(key, lang)
  if (label !== key) return label
  const readable = s.replace(/[-_]+/g, ' ')
  return readable.charAt(0).toUpperCase() + readable.slice(1)
}
