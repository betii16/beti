import Link from 'next/link'
import { lang } from 'next/root-params'
import { defaultLocale, href, isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'

// Cette page ne reçoit aucun paramètre : la langue se lit dans l'adresse.
export default async function NotFound() {
  const param = await lang()
  const locale = isLocale(param) ? param : defaultLocale
  const t = getDictionary(locale).notFound
  return (
    <main id="contenu" className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-start justify-center gap-4 px-4 py-20 sm:px-10">
      <h1 className="text-4xl leading-tight font-bold tracking-[-0.03em]">{t.title}</h1>
      <p className="text-body">{t.text}</p>
      <Link
        href={href(locale)}
        className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-semibold transition-colors hover:bg-ink hover:text-paper"
      >
        {t.back}
      </Link>
    </main>
  )
}
