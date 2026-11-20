import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'

export async function generateMetadata({ params }: PageProps<'/[lang]/aide'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const t = getDictionary(lang).help
  return { title: t.title, description: t.intro }
}

export default async function HelpPage({ params }: PageProps<'/[lang]/aide'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const t = getDictionary(lang).help

  return (
    <main id="contenu" className="px-4 pb-6 sm:px-10">
      <div className="mx-auto flex max-w-[760px] flex-col gap-8 pt-4 lg:pt-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-[clamp(2rem,4vw,2.75rem)] leading-[1.08] font-bold tracking-[-0.035em] rtl:leading-[1.3]">{t.title}</h1>
          <p className="text-lg text-body">{t.intro}</p>
        </div>
        <dl className="flex flex-col gap-7">
          {t.faq.map(item => (
            <div key={item.q} className="flex flex-col gap-2 border-t border-line pt-6">
              <dt className="text-xl font-semibold tracking-[-0.01em] rtl:leading-snug">{item.q}</dt>
              <dd className="max-w-[65ch] leading-relaxed text-body">{item.a}</dd>
            </div>
          ))}
        </dl>
        <section className="flex flex-col items-start gap-3 rounded-[28px] bg-night px-7 py-8 text-paper sm:rounded-[36px] sm:px-10">
          <h2 className="text-2xl font-bold tracking-[-0.02em]">{t.contactTitle}</h2>
          <p className="text-paper/80">{t.contactText}</p>
          <a href={`mailto:${t.email}`} dir="ltr" className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-semibold text-ink transition-colors hover:bg-paper">
            {t.email}
          </a>
        </section>
      </div>
    </main>
  )
}
