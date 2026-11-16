import Link from 'next/link'
import { href, type Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'

export function SiteFooter({ lang, t }: { lang: Locale; t: Dictionary['footer'] }) {
  const links = [
    { path: '/aide', label: t.help },
    { path: '/cgu', label: t.terms },
    { path: '/confidentialite', label: t.privacy },
  ]
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 pt-10 pb-12 sm:px-10">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span lang="fr" className="text-2xl leading-none font-bold tracking-[-0.04em]">
          beti
        </span>
        <span className="text-[15px] text-muted">{t.tagline}</span>
      </p>
      <nav aria-label={t.links} className="flex flex-wrap gap-x-7 gap-y-1">
        {links.map(link => (
          <Link
            key={link.path}
            href={href(lang, link.path)}
            className="inline-flex min-h-11 items-center text-[15px] underline underline-offset-4"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  )
}
