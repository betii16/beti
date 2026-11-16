import Link from 'next/link'
import { House } from 'lucide-react'
import { href, type Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
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
      <Link href={href(lang)} aria-label={t.home} className="flex min-h-11 items-center gap-2.5">
        <span className="flex size-[38px] shrink-0 items-center justify-center rounded-xl bg-accent">
          <House aria-hidden className="size-[22px]" strokeWidth={2.4} />
        </span>
        <span lang="fr" className="text-3xl leading-none font-bold tracking-[-0.04em]">
          beti
        </span>
        <span lang="ar" className="hidden text-[22px] leading-none font-medium text-muted sm:inline">
          بيتي
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
        <Link
          href={href(lang, '/connexion')}
          className="inline-flex min-h-[46px] items-center rounded-full bg-ink px-5 font-semibold whitespace-nowrap text-paper sm:px-6"
        >
          {t.login}
        </Link>
      </nav>
    </header>
  )
}
