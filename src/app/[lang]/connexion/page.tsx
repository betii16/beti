import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { LoginForm } from '@/components/login-form'
import { href, isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { safeNext } from '@/lib/auth/input'
import { getSession } from '@/lib/auth/session'
import serrurerie from '../../../../public/images/metiers/serrurerie.jpg'

export async function generateMetadata({ params }: PageProps<'/[lang]/connexion'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const t = getDictionary(lang).login
  return { title: t.title, description: t.description, robots: { index: false, follow: true } }
}

export default async function LoginPage({ params, searchParams }: PageProps<'/[lang]/connexion'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  // La page de retour vient de l'adresse : seule une page du site est acceptée.
  const raw = (await searchParams).next
  const next = safeNext(typeof raw === 'string' ? raw : '')
  if (await getSession()) redirect(next || href(lang, '/compte'))
  const dict = getDictionary(lang)

  return (
    <main id="contenu" className="px-4 pb-6 sm:px-10">
      <div className="mx-auto grid max-w-[1000px] items-center gap-10 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-14 lg:pt-8">
        <LoginForm lang={lang} next={next} t={dict.login} errors={dict.errors} />
        {/* Photo d'ambiance, sur grand écran seulement. */}
        <div className="relative hidden min-h-[540px] overflow-hidden rounded-[36px] bg-night lg:block">
          <Image src={serrurerie} alt="" fill sizes="(min-width: 1024px) 460px, 1px" placeholder="blur" className="object-cover" />
        </div>
      </div>
    </main>
  )
}
