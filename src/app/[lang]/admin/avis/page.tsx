import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdminForm } from '@/components/admin-form'
import { ADMIN_DARK, ADMIN_INPUT, ADMIN_LIGHT } from '@/components/admin-styles'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { requireStaff } from '@/lib/auth/session'
import { errorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Avis' }

export default async function AdminReviews({ params }: PageProps<'/[lang]/admin/avis'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  await requireStaff(lang, '/admin/avis')
  const dict = getDictionary('fr')

  const supabase = await createClient()
  // Sur reviews la lecture est accordée colonne par colonne : on les nomme.
  const { data, error } = await supabase
    .from('reviews')
    .select('id, author_name, rating, comment, reply, is_visible, created_at, artisans(display_name)')
    .order('created_at', { ascending: false })
    // shortcut: les 50 derniers ; paginer quand il y en aura davantage.
    .limit(50)
  const date = new Intl.DateTimeFormat('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Algiers' })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[clamp(1.75rem,3.4vw,2.375rem)] leading-[1.08] font-bold tracking-[-0.035em]">Avis</h1>
        <p className="max-w-[70ch] text-body">
          Masquer un avis le retire du profil public et de la note moyenne, sans le supprimer : il peut être réaffiché.
        </p>
      </div>

      {error ? (
        <p role="alert" className="max-w-[620px] rounded-[20px] border-2 border-ink px-5 py-3.5 font-medium">
          {dict.errors[errorCode(error)]}
        </p>
      ) : data.length === 0 ? (
        <p className="rounded-[28px] bg-mist p-7 font-medium">Aucun avis pour l’instant.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {data.map(review => (
            <li key={review.id} className={`flex flex-col gap-2 py-4 ${review.is_visible ? '' : 'opacity-70'}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-semibold">{review.rating} sur 5</span>
                  <span className="text-body">
                    {review.author_name} sur {review.artisans?.display_name ?? 'un artisan'}
                  </span>
                  {!review.is_visible && <span className="rounded-full bg-ink px-2.5 py-0.5 text-sm text-paper">Masqué</span>}
                </p>
                <p className="text-sm text-muted">{date.format(new Date(review.created_at))}</p>
              </div>
              {review.comment && <p className="max-w-[70ch] whitespace-pre-line text-body">{review.comment}</p>}
              {review.reply && <p className="max-w-[70ch] border-s-4 border-sage ps-3 text-sm whitespace-pre-line text-body">{review.reply}</p>}
              <AdminForm errors={dict.errors}>
                <input type="hidden" name="id" value={review.id} />
                <label className="flex min-w-0 flex-[1_1_220px]">
                  <span className="sr-only">Motif (facultatif, inscrit au journal)</span>
                  <input name="reason" maxLength={300} placeholder="Motif (facultatif)" className={`${ADMIN_INPUT} w-full`} />
                </label>
                <button type="submit" name="do" value={review.is_visible ? 'hide_review' : 'show_review'} className={review.is_visible ? ADMIN_DARK : ADMIN_LIGHT}>
                  {review.is_visible ? 'Masquer' : 'Réafficher'}
                </button>
              </AdminForm>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
