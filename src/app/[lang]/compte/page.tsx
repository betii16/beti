import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NameForm } from '@/components/name-form'
import { PhoneForm } from '@/components/phone-form'
import { href, isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { signOut } from '@/lib/auth/actions'
import { requireSession } from '@/lib/auth/session'
import { ERROR_CODES, errorCode, type ErrorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'

const ALERT = 'max-w-[460px] rounded-[20px] border-2 border-ink px-5 py-3.5 font-medium'

export async function generateMetadata({ params }: PageProps<'/[lang]/compte'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  return { title: getDictionary(lang).account.title, robots: { index: false, follow: false } }
}

export default async function AccountPage({ params, searchParams }: PageProps<'/[lang]/compte'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const session = await requireSession(lang, '/compte')
  const dict = getDictionary(lang)
  const t = dict.account

  const supabase = await createClient()
  const [{ data: profile, error: profileError }, contact] = await Promise.all([
    supabase.from('profiles').select('full_name, role').eq('id', session.userId).maybeSingle(),
    supabase.from('user_contacts').select('phone').eq('user_id', session.userId).maybeSingle(),
  ])
  const error = profileError ?? contact.error

  // Message laissé par une action qui a échoué (déconnexion) : seul un code connu est affiché.
  const raw = (await searchParams).erreur
  const flash = typeof raw === 'string' && (ERROR_CODES as readonly string[]).includes(raw) ? (raw as ErrorCode) : null
  const [before, after] = t.signedInAs.split('{email}')

  return (
    <main id="contenu" className="px-4 pb-6 sm:px-10">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-8 pt-4 lg:pt-8">
        <div className="flex flex-col gap-2.5">
          <h1 className="text-[clamp(2rem,4vw,2.75rem)] leading-[1.08] font-bold tracking-[-0.035em] rtl:leading-[1.3]">{t.title}</h1>
          {session.email && (
            <p className="text-lg text-body">
              {before}
              <bdi dir="ltr" className="font-medium text-ink">
                {session.email}
              </bdi>
              {after}
            </p>
          )}
          {profile && <p className="self-start rounded-full bg-mist px-4 py-1.5 font-medium">{profile.role === 'artisan' ? t.artisan : t.client}</p>}
        </div>

        {flash && (
          <p role="alert" className={ALERT}>
            {dict.errors[flash]}
          </p>
        )}
        {error ? (
          <p role="alert" className={ALERT}>
            {dict.errors[errorCode(error)]}
          </p>
        ) : (
          <>
            <NameForm name={profile?.full_name ?? ''} t={t} errors={dict.errors} />
            <PhoneForm phone={contact.data?.phone ?? null} t={t} errors={dict.errors} />
          </>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            href={href(lang, '/demandes')}
            className="inline-flex min-h-12 items-center rounded-full bg-ink px-6 font-semibold text-paper transition-colors hover:bg-accent hover:text-ink"
          >
            {t.requests}
          </Link>
          <Link
            href={href(lang, '/artisan')}
            className="inline-flex min-h-12 items-center rounded-full bg-mist px-6 font-semibold transition-colors hover:bg-ink hover:text-paper"
          >
            {profile?.role === 'artisan' ? t.listing : t.becomeArtisan}
          </Link>
        </div>

        <form action={signOut} className="border-t border-line pt-6">
          <input type="hidden" name="lang" value={lang} />
          <button type="submit" className="inline-flex min-h-12 cursor-pointer items-center rounded-full bg-mist px-6 font-semibold transition-colors hover:bg-ink hover:text-paper">
            {t.signOut}
          </button>
        </form>
      </div>
    </main>
  )
}
