import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { ReportForm } from '@/components/report-form'
import { href, isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { getArtisan } from '@/lib/artisans'
import { requireSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata({ params }: PageProps<'/[lang]/signaler'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  return { title: getDictionary(lang).report.title, robots: { index: false, follow: false } }
}

// Signaler un profil d'artisan ou une de ses demandes. La cible vient de l'adresse : elle est contrôlée avant tout.
export default async function ReportPage({ params, searchParams }: PageProps<'/[lang]/signaler'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const query = await searchParams
  const type = query.type === 'artisan' || query.type === 'booking' ? query.type : null
  const id = typeof query.id === 'string' && z.uuid().safeParse(query.id).success ? query.id : null
  if (!type || !id) notFound()
  await requireSession(lang, `/signaler?type=${type}&id=${id}`)
  const dict = getDictionary(lang)
  const t = dict.report

  let about: string
  let backHref: string
  if (type === 'artisan') {
    const { artisan } = await getArtisan(id)
    if (!artisan) notFound()
    about = t.aboutArtisan.replace('{name}', artisan.display_name)
    backHref = href(lang, `/artisans/${id}`)
  } else {
    const supabase = await createClient()
    // Le RLS ne rend la demande qu'à ses deux parties : une autre adresse donne « introuvable ».
    const { data: booking } = await supabase.from('bookings').select('created_at').eq('id', id).maybeSingle()
    if (!booking) notFound()
    const date = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' })
    about = t.aboutBooking.replace('{date}', date.format(new Date(booking.created_at)))
    backHref = href(lang, `/demandes/${id}`)
  }

  return (
    <main id="contenu" className="px-4 pb-6 sm:px-10">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-7 pt-4 lg:pt-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-[clamp(1.75rem,3.4vw,2.375rem)] leading-[1.08] font-bold tracking-[-0.035em] rtl:leading-[1.3]">{t.title}</h1>
          <p className="text-lg font-medium">{about}</p>
          <p className="max-w-[60ch] text-body">{t.intro}</p>
        </div>
        <ReportForm type={type} id={id} backHref={backHref} t={t} errors={dict.errors} />
      </div>
    </main>
  )
}
