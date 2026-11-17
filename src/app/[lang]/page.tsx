import type { Metadata } from 'next'
import Image, { type StaticImageData } from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check } from 'lucide-react'
import { SearchForm } from '@/components/search-form'
import { href, isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import electricite from '../../../public/images/metiers/electricite.jpg'
import peinture from '../../../public/images/metiers/peinture.jpg'
import plomberie from '../../../public/images/metiers/plomberie.jpg'
import serrurerie from '../../../public/images/metiers/serrurerie.jpg'
import rueAlger from '../../../public/images/rue-alger.jpg'

// Les métiers sans photo pour l'instant : ils sont proposés en liens simples.
const OTHER_TRADES = ['plomberie', 'menage', 'demenagement', 'jardinage', 'informatique', 'coiffure', 'autre'] as const

const H2 = 'text-[clamp(1.75rem,3.3vw,2.625rem)] leading-[1.1] font-bold tracking-[-0.03em] text-balance rtl:leading-[1.35]'

export async function generateMetadata({ params }: PageProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const t = getDictionary(lang).meta
  return {
    title: { absolute: t.title },
    description: t.description,
    alternates: { canonical: href(lang), languages: { fr: href('fr'), ar: href('ar') } },
  }
}

export default async function Home({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const dict = getDictionary(lang)
  const t = dict.home
  const search = href(lang, '/recherche')

  return (
    <main id="contenu">
      <section className="px-4 sm:px-6">
        <div className="relative isolate overflow-hidden rounded-[28px] bg-night sm:rounded-[36px]">
          {/* Sur téléphone la photo occupe le haut du bloc et le texte vient dessous ; sur écran
              large elle remplit tout. En arabe le texte passe à droite : la photo est retournée
              pour que l'artisan reste visible. */}
          <div className="absolute inset-x-0 top-0 -z-10 h-[260px] sm:h-full">
            <Image
              src={plomberie}
              alt={t.heroAlt}
              fill
              preload
              sizes="(min-width: 1280px) 1232px, 100vw"
              placeholder="blur"
              className="object-cover object-[78%_35%] sm:object-[72%_45%] rtl:-scale-x-100"
            />
            <div aria-hidden className="scrim-hero absolute inset-0" />
          </div>
          <div className="flex flex-wrap content-end items-end justify-between gap-x-10 gap-y-8 px-5 pt-[180px] pb-5 sm:min-h-[560px] sm:p-10 lg:min-h-[640px] lg:p-14">
            <div className="flex max-w-[720px] min-w-0 flex-[1_1_520px] flex-col items-start gap-5 text-paper">
              <p className="hidden min-h-10 items-center gap-2.5 rounded-full border border-paper/40 bg-paper/15 px-4 py-1.5 text-[15px] leading-snug font-medium backdrop-blur-sm sm:inline-flex">
                <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-accent" />
                {t.heroTag}
              </p>
              <h1 className="text-[clamp(2.375rem,4.7vw,3.75rem)] leading-[1.04] font-bold tracking-[-0.035em] rtl:leading-[1.3]">
                {t.heroTitle1}
                <br />
                {t.heroTitle2}
              </h1>
              <p className="max-w-[30em] text-[17px] text-haze sm:text-[19px]">{t.heroText}</p>
            </div>

            <div className="hidden w-[340px] shrink flex-col gap-3.5 rounded-3xl bg-paper px-6 py-5.5 shadow-float lg:flex">
              <p className="text-[15px] font-medium text-muted">{t.track.title}</p>
              <ol className="flex flex-col gap-3.5 leading-snug">
                {[t.track.sent, t.track.accepted].map(label => (
                  <li key={label} className="flex items-center gap-3">
                    <span aria-hidden className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-ink">
                      <Check className="size-3.5 text-paper" strokeWidth={3.2} />
                    </span>
                    {label}
                  </li>
                ))}
                <li className="flex items-center gap-3">
                  <span aria-hidden className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-accent">
                    <span className="size-2.5 rounded-full bg-ink" />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <strong className="font-semibold">{t.track.onTheWay}</strong>
                    <span className="text-sm text-muted">{t.track.sharing}</span>
                  </span>
                </li>
                <li className="flex items-center gap-3 text-muted">
                  <span aria-hidden className="size-[26px] shrink-0 rounded-full border-2 border-line" />
                  {t.track.done}
                </li>
              </ol>
            </div>

            <SearchForm lang={lang} dict={dict} className="flex-[1_1_100%] bg-paper shadow-float" />
          </div>
        </div>
      </section>

      <section className="px-4 pt-16 sm:px-10 lg:pt-22">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-7">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
            <h2 className={H2}>{t.trades.title}</h2>
            <Link href={search} className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">
              {t.trades.all}
            </Link>
          </div>
          <div className="flex flex-wrap gap-4">
            <TradeTile big href={`${search}?categorie=electricite`} image={electricite} title={dict.categories.electricite} text={t.trades.electricite} />
            <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
              <TradeTile href={`${search}?categorie=peinture`} image={peinture} title={dict.categories.peinture} text={t.trades.peinture} />
              <TradeTile href={`${search}?categorie=serrurerie`} image={serrurerie} title={dict.categories.serrurerie} text={t.trades.serrurerie} />
            </div>
            <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-4 rounded-[28px] bg-mist p-7">
              <h3 className="text-[22px] leading-tight font-semibold tracking-[-0.01em]">{t.trades.more}</h3>
              <ul className="flex flex-wrap gap-2.5">
                {OTHER_TRADES.map(slug => (
                  <li key={slug}>
                    <Link
                      href={`${search}?categorie=${slug}`}
                      className="inline-flex min-h-[46px] items-center rounded-full bg-paper px-4.5 font-medium transition-colors hover:bg-ink hover:text-paper"
                    >
                      {dict.categories[slug]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="etapes" className="scroll-mt-6 px-4 pt-16 sm:px-10 lg:pt-24">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
          <h2 className={`${H2} max-w-[22em]`}>{t.steps.title}</h2>
          <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-x-6 gap-y-8">
            {t.steps.items.map((step, i) => (
              <li key={step.title} className="flex flex-col items-start gap-2.5 border-t-2 border-ink pt-4.5">
                {/* Le suivi en direct est l'étape qui distingue BETI : c'est la seule pastille verte. */}
                <span
                  aria-hidden
                  className={`flex size-11 items-center justify-center rounded-full text-xl font-semibold ${i === 2 ? 'bg-accent' : 'bg-ink text-paper'}`}
                >
                  {i + 1}
                </span>
                <h3 className="text-[22px] leading-tight font-semibold tracking-[-0.01em]">{step.title}</h3>
                <p className="text-base text-body">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-4 pt-16 sm:px-6 lg:pt-24">
        <div className="flex flex-wrap overflow-hidden rounded-[28px] bg-mist sm:rounded-[36px]">
          <div className="relative min-h-[280px] min-w-0 flex-[1_1_440px] lg:min-h-[420px]">
            <Image src={rueAlger} alt={t.trust.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" placeholder="blur" className="object-cover" />
          </div>
          <div className="flex min-w-0 flex-[1_1_440px] flex-col justify-center gap-6 p-7 sm:p-14">
            <h2 className="text-[clamp(1.75rem,3vw,2.375rem)] leading-[1.12] font-bold tracking-[-0.03em] text-balance rtl:leading-[1.35]">
              {t.trust.title}
            </h2>
            <ul className="flex flex-col gap-6">
              {t.trust.items.map(item => (
                <li key={item.title} className="flex items-start gap-3.5">
                  <span aria-hidden className="mt-0.5 flex size-[30px] shrink-0 items-center justify-center rounded-full bg-accent">
                    <Check className="size-4" strokeWidth={3.2} />
                  </span>
                  <span className="flex flex-col gap-1">
                    <strong className="text-xl leading-snug font-semibold">{item.title}</strong>
                    <span className="text-base text-body">{item.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="px-4 pt-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-12 gap-y-6 rounded-[28px] bg-night px-7 py-12 text-paper sm:rounded-[36px] sm:px-14 sm:py-16">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-2">
            <h2 className="text-[clamp(1.875rem,3.6vw,2.875rem)] leading-[1.1] font-bold tracking-[-0.03em] rtl:leading-[1.35]">{t.pro.title}</h2>
            <p className="max-w-[32em] text-[19px] text-sage">{t.pro.text}</p>
          </div>
          <Link
            href={href(lang, '/artisan')}
            className="inline-flex min-h-[60px] items-center rounded-full bg-accent px-8 text-lg font-semibold text-ink transition-colors hover:bg-paper focus-visible:outline-paper"
          >
            {t.pro.cta}
          </Link>
        </div>
      </section>
    </main>
  )
}

function TradeTile({
  href: target,
  image,
  title,
  text,
  big = false,
}: {
  href: string
  image: StaticImageData
  title: string
  text: string
  big?: boolean
}) {
  return (
    <Link
      href={target}
      className={`relative isolate flex min-w-0 items-end overflow-hidden rounded-[28px] bg-night text-paper ${big ? 'min-h-[320px] flex-[2_1_440px] lg:min-h-[420px]' : 'min-h-[202px] flex-1'}`}
    >
      {/* Photo d'ambiance : le nom du lien, c'est le texte. */}
      <Image
        src={image}
        alt=""
        fill
        sizes={big ? '(min-width: 1024px) 45vw, 100vw' : '(min-width: 1024px) 27vw, 100vw'}
        placeholder="blur"
        className="-z-10 object-cover"
      />
      <span aria-hidden className="scrim-tile absolute inset-0 -z-10" />
      <span className={`flex flex-col ${big ? 'gap-1 p-7' : 'gap-0.5 px-6 py-5.5'}`}>
        <span className={`leading-[1.15] font-semibold tracking-[-0.02em] rtl:leading-snug ${big ? 'text-3xl' : 'text-2xl'}`}>{title}</span>
        <span className={`text-haze ${big ? 'text-base' : 'text-[15px]'}`}>{text}</span>
      </span>
    </Link>
  )
}
