// Langues du site. Chaque page vit sous /fr/… ou /ar/… : la langue et le sens
// d'écriture sont connus dès le serveur, sans clignotement au chargement.

export const locales = ['fr', 'ar'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'fr'

/** Cookie posé quand la personne choisit sa langue ; le proxy s'en sert pour rediriger. */
export const LOCALE_COOKIE = 'beti-lang'

export const isLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value)

export const dirOf = (locale: Locale): 'ltr' | 'rtl' => (locale === 'ar' ? 'rtl' : 'ltr')

/** Chemin interne préfixé par la langue : href('ar', '/recherche') → « /ar/recherche ». */
export const href = (locale: Locale, path = '/'): string => `/${locale}${path === '/' ? '' : path}`
