import Link from 'next/link'
import { href, type Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { AccountLink } from './account-link'
import { LanguageSwitch } from './language-switch'

export function SiteHeader({ lang, t }: { lang: Locale; t: Dictionary['nav'] }) {
  return (
    <header className="flex items-center justify-between gap-x-4 px-4 py-4 sm:gap-x-6 sm:px-10 sm:py-5">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-10 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-paper"
      >
        {t.skip}
      </a>
      {/* Le nom sur une ligne, dans la langue de la page : « beti » ou « باتي » (choix du propriétaire, 2026-11-24). */}
      <Link href={href(lang)} aria-label={t.home} className="flex min-h-11 items-center">
        <span className="font-display text-[28px] leading-none font-extrabold tracking-[-0.03em] rtl:text-[30px] rtl:leading-[1.4]">
          {lang === 'ar' ? 'باتي' : 'beti'}
        </span>
      </Link>
      <nav aria-label={t.main} className="flex items-center gap-x-4 sm:gap-x-7">
        <Link href={`${href(lang)}#etapes`} className="hidden min-h-11 items-center font-medium whitespace-nowrap lg:inline-flex">
          {t.how}
        </Link>
        <Link href={href(lang, '/artisan')} className="hidden min-h-11 items-center font-medium whitespace-nowrap lg:inline-flex">
          {t.artisan}
        </Link>
        <LanguageSwitch lang={lang} />
        <AccountLink lang={lang} login={t.login} account={t.account} unreadLabel={t.unread} />
      </nav>
    </header>
  )
}
