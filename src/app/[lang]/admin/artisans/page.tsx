import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminForm } from '@/components/admin-form'
import { ADMIN_DARK, ADMIN_INPUT, ADMIN_LIGHT } from '@/components/admin-styles'
import type { CategorySlug } from '@/domain/search'
import { wilayaName } from '@/domain/wilayas'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { containsPattern, searchText } from '@/lib/admin/search'
import { requireStaff } from '@/lib/auth/session'
import { errorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Artisans' }

export default async function AdminArtisans({ params, searchParams }: PageProps<'/[lang]/admin/artisans'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  await requireStaff(lang, '/admin/artisans')
  const dict = getDictionary('fr')
  const q = searchText((await searchParams).q)

  const supabase = await createClient()
  // Sur artisans la lecture est accordée colonne par colonne : on les nomme.
  let query = supabase
    .from('artisans')
    .select('id, display_name, category, wilaya_code, published, suspended, verified_at, rating_avg, rating_count, created_at')
    .order('created_at', { ascending: false })
    // shortcut: les 50 derniers (ou les 50 premiers trouvés) ; paginer quand il y en aura davantage.
    .limit(50)
  if (q) query = query.ilike('display_name', containsPattern(q))
  const { data, error } = await query
  const date = new Intl.DateTimeFormat('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Algiers' })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[clamp(2rem,4vw,2.75rem)] leading-[1.08] font-bold tracking-[-0.035em]">Artisans</h1>
      <form className="flex flex-wrap gap-2" role="search">
        <label className="flex min-w-0 flex-[1_1_260px]">
          <span className="sr-only">Nom de l’artisan</span>
          <input name="q" defaultValue={q} placeholder="Nom de l’artisan" className={`${ADMIN_INPUT} w-full`} />
        </label>
        <button type="submit" className={ADMIN_DARK}>
          Chercher
        </button>
      </form>

      {error ? (
        <p role="alert" className="max-w-[620px] rounded-[20px] border-2 border-ink px-5 py-3.5 font-medium">
          {dict.errors[errorCode(error)]}
        </p>
      ) : data.length === 0 ? (
        <p className="rounded-[28px] bg-mist p-7 font-medium">{q ? 'Aucun artisan à ce nom.' : 'Aucun artisan pour l’instant.'}</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {data.map(artisan => (
            <li key={artisan.id} className="flex flex-col gap-2 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link href={`/fr/artisans/${artisan.id}`} className="text-lg font-semibold underline-offset-4 hover:underline">
                    {artisan.display_name}
                  </Link>
                  <span className="text-body">
                    {dict.categories[artisan.category as CategorySlug] ?? artisan.category}, {wilayaName(artisan.wilaya_code, 'fr')}
                  </span>
                </p>
                <p className="flex flex-wrap gap-1.5 text-sm">
                  <span className={`rounded-full px-2.5 py-0.5 ${artisan.published ? 'bg-accent' : 'bg-mist'}`}>{artisan.published ? 'Publié' : 'Non publié'}</span>
                  {artisan.verified_at && <span className="rounded-full bg-sage px-2.5 py-0.5">Identité contrôlée</span>}
                  {artisan.suspended && <span className="rounded-full bg-ink px-2.5 py-0.5 text-paper">Compte suspendu</span>}
                </p>
              </div>
              <p className="text-sm text-muted">
                Inscrit le {date.format(new Date(artisan.created_at))}
                {artisan.rating_count > 0 && `, note ${artisan.rating_avg} sur ${artisan.rating_count} avis`}
              </p>
              <AdminForm errors={dict.errors}>
                <input type="hidden" name="id" value={artisan.id} />
                <label className="flex min-w-0 flex-[1_1_220px]">
                  <span className="sr-only">Motif (facultatif, inscrit au journal)</span>
                  <input name="reason" maxLength={300} placeholder="Motif (facultatif)" className={`${ADMIN_INPUT} w-full`} />
                </label>
                {artisan.published ? (
                  <button type="submit" name="do" value="unpublish" className={ADMIN_LIGHT}>
                    Retirer de la recherche
                  </button>
                ) : (
                  <button type="submit" name="do" value="publish" className={ADMIN_LIGHT}>
                    Remettre dans la recherche
                  </button>
                )}
                <button type="submit" name="do" value={artisan.verified_at ? 'unverify' : 'verify'} className={ADMIN_LIGHT}>
                  {artisan.verified_at ? 'Retirer « identité contrôlée »' : 'Identité contrôlée'}
                </button>
                {artisan.suspended ? (
                  <button type="submit" name="do" value="restore_user" className={ADMIN_DARK}>
                    Rétablir le compte
                  </button>
                ) : (
                  // Suspendre coupe le compte entier : le bouton ne fait qu'ouvrir la confirmation.
                  <details className="group">
                    <summary className={`${ADMIN_DARK} list-none`}>Suspendre le compte</summary>
                    <button type="submit" name="do" value="suspend_user" className={`${ADMIN_DARK} mt-2`}>
                      Confirmer la suspension
                    </button>
                  </details>
                )}
              </AdminForm>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
