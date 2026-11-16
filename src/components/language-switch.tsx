'use client'

// Lien vers la même page dans l'autre langue. Il retient aussi le choix dans un
// cookie : le proxy s'en sert pour les adresses sans préfixe de langue.

import { usePathname } from 'next/navigation'
import { LOCALE_COOKIE, localeNames, switchLocalePath, type Locale } from '@/i18n/config'

export function LanguageSwitch({ lang }: { lang: Locale }) {
  const pathname = usePathname()
  const other: Locale = lang === 'fr' ? 'ar' : 'fr'
  return (
    // Un vrai chargement de page, pas une navigation interne : <html lang dir> change.
    <a
      href={switchLocalePath(pathname, other)}
      lang={other}
      hrefLang={other}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${other}; path=/; max-age=31536000; samesite=lax`
      }}
      className="inline-flex min-h-11 items-center font-medium"
    >
      {localeNames[other]}
    </a>
  )
}
