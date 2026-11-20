'use client'

// Erreur inattendue dans une page : le message technique n'est jamais montré
// (Next le remplace par un identifiant en production), il est consigné.

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect } from 'react'
import { defaultLocale, href, isLocale } from '@/i18n/config'
import { errorPageTexts } from '@/i18n/error-page'

export default function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  const param = useParams().lang
  const locale = typeof param === 'string' && isLocale(param) ? param : defaultLocale
  const t = errorPageTexts[locale]

  useEffect(() => {
    console.error('[beti] page en erreur', error)
  }, [error])

  return (
    <main id="contenu" className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-start justify-center gap-4 px-4 py-20 sm:px-10">
      <h1 className="text-4xl leading-tight font-bold tracking-[-0.03em] rtl:leading-snug">{t.title}</h1>
      <p className="text-body">{t.text}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-12 cursor-pointer items-center rounded-full bg-accent px-6 font-semibold transition-colors hover:bg-ink hover:text-paper"
        >
          {t.retry}
        </button>
        <Link href={href(locale)} className="inline-flex min-h-12 items-center rounded-full bg-mist px-6 font-semibold transition-colors hover:bg-ink hover:text-paper">
          {t.home}
        </Link>
      </div>
    </main>
  )
}
