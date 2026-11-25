import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdminForm } from '@/components/admin-form'
import { ADMIN_DARK, ADMIN_INPUT } from '@/components/admin-styles'
import { wilayaName } from '@/domain/wilayas'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { containsPattern, searchText } from '@/lib/admin/search'
import { requireStaff } from '@/lib/auth/session'
import { errorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Comptes' }

export default async function AdminAccounts({ params, searchParams }: PageProps<'/[lang]/admin/comptes'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  await requireStaff(lang, '/admin/comptes')
  const dict = getDictionary('fr')
  const q = searchText((await searchParams).q)

  const supabase = await createClient()
  let query = supabase
    .from('profiles')
    .select('id, full_name, role, wilaya_code, is_active, created_at')
    .order('created_at', { ascending: false })
    // shortcut: les 50 derniers (ou les 50 premiers trouvés) ; paginer quand il y en aura davantage.
    .limit(50)
  if (q) query = query.ilike('full_name', containsPattern(q))
  const { data, error } = await query
  const date = new Intl.DateTimeFormat('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Algiers' })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[clamp(1.75rem,3.4vw,2.375rem)] leading-[1.08] font-bold tracking-[-0.035em]">Comptes</h1>
        <p className="max-w-[70ch] text-body">
          Un compte suspendu ne peut plus rien envoyer, et son profil d’artisan disparaît de la recherche. La personne est prévenue. Un membre de l’équipe ne peut pas être suspendu.
        </p>
      </div>
      <form className="flex flex-wrap gap-2" role="search">
        <label className="flex min-w-0 flex-[1_1_260px]">
          <span className="sr-only">Nom</span>
          <input name="q" defaultValue={q} placeholder="Nom" className={`${ADMIN_INPUT} w-full`} />
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
        <p className="rounded-[28px] bg-mist p-7 font-medium">{q ? 'Aucun compte à ce nom.' : 'Aucun compte.'}</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {data.map(account => (
            <li key={account.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-semibold">{account.full_name || 'Sans nom'}</span>
                  <span className="text-body">{account.role === 'artisan' ? 'Artisan' : 'Client'}</span>
                  {!account.is_active && <span className="rounded-full bg-ink px-2.5 py-0.5 text-sm text-paper">Suspendu</span>}
                </p>
                <p className="text-sm text-muted">
                  Inscrit le {date.format(new Date(account.created_at))}
                  {account.wilaya_code && `, ${wilayaName(account.wilaya_code, 'fr')}`}
                </p>
              </div>
              <AdminForm errors={dict.errors}>
                <input type="hidden" name="id" value={account.id} />
                <label className="flex">
                  <span className="sr-only">Motif (facultatif, inscrit au journal)</span>
                  <input name="reason" maxLength={300} placeholder="Motif (facultatif)" className={ADMIN_INPUT} />
                </label>
                {account.is_active ? (
                  // Suspendre coupe le compte entier : le bouton ne fait qu'ouvrir la confirmation.
                  <details>
                    <summary className={`${ADMIN_DARK} list-none`}>Suspendre</summary>
                    <button type="submit" name="do" value="suspend_user" className={`${ADMIN_DARK} mt-2`}>
                      Confirmer la suspension
                    </button>
                  </details>
                ) : (
                  <button type="submit" name="do" value="restore_user" className={ADMIN_DARK}>
                    Rétablir
                  </button>
                )}
              </AdminForm>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
