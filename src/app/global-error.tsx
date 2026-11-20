'use client'

// Erreur dans la mise en page elle-même (en-tête, pied de page) : cette page la
// remplace entièrement, d'où ses propres balises html et body.

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { dirOf } from '@/i18n/config'
import { errorPageTexts } from '@/i18n/error-page'
import './globals.css'

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const locale = usePathname()?.startsWith('/ar') ? 'ar' : 'fr'
  const t = errorPageTexts[locale]

  useEffect(() => {
    console.error('[beti] mise en page en erreur', error)
  }, [error])

  return (
    <html lang={locale} dir={dirOf(locale)}>
      <body className="bg-paper text-ink">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 px-4 sm:px-10">
          <h1 className="text-4xl leading-tight font-bold tracking-[-0.03em]">{t.title}</h1>
          <p className="text-body">{t.text}</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => retry()} className="inline-flex min-h-12 cursor-pointer items-center rounded-full bg-accent px-6 font-semibold">
              {t.retry}
            </button>
            <a href={`/${locale}`} className="inline-flex min-h-12 items-center rounded-full bg-mist px-6 font-semibold">
              {t.home}
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
