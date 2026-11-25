import Link from 'next/link'
import { href, type Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'

export function SiteFooter({ lang, t }: { lang: Locale; t: Dictionary['footer'] }) {
  // Les textes juridiques n'existent qu'en français : leurs liens y mènent depuis l'arabe aussi.
  const links = [
    { path: '/aide', label: t.help, to: lang },
    { path: '/cgu', label: t.terms, to: 'fr' as const },
    { path: '/confidentialite', label: t.privacy, to: 'fr' as const },
    { path: '/mentions', label: t.notice, to: 'fr' as const },
  ]
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 pt-10 pb-12 sm:px-10">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-[22px] leading-none font-extrabold tracking-[-0.03em] rtl:leading-[1.4]">{lang === 'ar' ? 'باتي' : 'beti'}</span>
        <span className="text-[15px] text-muted">{t.tagline}</span>
      </p>
      <nav aria-label={t.links} className="flex flex-wrap gap-x-7 gap-y-1">
        {links.map(link => (
          <Link
            key={link.path}
            href={href(link.to, link.path)}
            hrefLang={link.to === lang ? undefined : link.to}
            className="inline-flex min-h-11 items-center text-[15px] underline underline-offset-4"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  )
}
