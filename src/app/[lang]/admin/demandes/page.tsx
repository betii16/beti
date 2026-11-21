import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminForm } from '@/components/admin-form'
import { ADMIN_DARK, ADMIN_INPUT, ADMIN_LIGHT } from '@/components/admin-styles'
import type { CategorySlug } from '@/domain/search'
import { wilayaName } from '@/domain/wilayas'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { requireStaff } from '@/lib/auth/session'
import { errorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Demandes' }

export default async function AdminBookings({ params }: PageProps<'/[lang]/admin/demandes'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  await requireStaff(lang, '/admin/demandes')
  const dict = getDictionary('fr')

  const supabase = await createClient()
  // Seules les demandes encore ouvertes peuvent être débloquées par l'équipe ; les plus anciennes d'abord.
  const { data, error } = await supabase
    .from('bookings')
    .select('id, status, category, wilaya_code, created_at, client_id, artisans(display_name)')
    .in('status', ['pending', 'accepted', 'finished'])
    .order('created_at', { ascending: true })
    // shortcut: les 50 plus anciennes ; paginer quand il y en aura davantage.
    .limit(50)
  const clientIds = [...new Set((data ?? []).map(booking => booking.client_id).filter((id): id is string => id !== null))]
  const clients = clientIds.length > 0 ? await supabase.from('profiles').select('id, full_name').in('id', clientIds) : null
  const clientName = new Map((clients?.data ?? []).map(client => [client.id, client.full_name || 'Sans nom']))
  const date = new Intl.DateTimeFormat('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Algiers' })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[clamp(2rem,4vw,2.75rem)] leading-[1.08] font-bold tracking-[-0.035em]">Demandes ouvertes</h1>
        <p className="max-w-[70ch] text-body">
          Pour débloquer une demande restée ouverte : l’annuler, ou la clore comme terminée. Les deux parties sont prévenues.
        </p>
      </div>

      {error ? (
        <p role="alert" className="max-w-[620px] rounded-[20px] border-2 border-ink px-5 py-3.5 font-medium">
          {dict.errors[errorCode(error)]}
        </p>
      ) : data.length === 0 ? (
        <p className="rounded-[28px] bg-mist p-7 font-medium">Aucune demande ouverte.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {data.map(booking => (
            <li key={booking.id} className="flex flex-col gap-2 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link href={`/fr/demandes/${booking.id}`} className="font-semibold underline underline-offset-4">
                    {booking.client_id ? clientName.get(booking.client_id) ?? 'Client' : 'Compte supprimé'} vers {booking.artisans?.display_name ?? 'artisan'}
                  </Link>
                  <span className="text-body">
                    {dict.categories[booking.category as CategorySlug] ?? booking.category}, {wilayaName(booking.wilaya_code, 'fr')}
                  </span>
                </p>
                <p className="text-sm text-body">
                  {dict.booking.status[booking.status]}, envoyée le {date.format(new Date(booking.created_at))}
                </p>
              </div>
              <AdminForm errors={dict.errors}>
                <input type="hidden" name="id" value={booking.id} />
                <label className="flex min-w-0 flex-[1_1_220px]">
                  <span className="sr-only">Motif (facultatif, montré aux parties pour une annulation)</span>
                  <input name="reason" maxLength={300} placeholder="Motif (facultatif)" className={`${ADMIN_INPUT} w-full`} />
                </label>
                <button type="submit" name="do" value="complete_booking" className={ADMIN_LIGHT}>
                  Clore comme terminée
                </button>
                <details>
                  <summary className={`${ADMIN_DARK} list-none`}>Annuler la demande</summary>
                  <button type="submit" name="do" value="cancel_booking" className={`${ADMIN_DARK} mt-2`}>
                    Confirmer l’annulation
                  </button>
                </details>
              </AdminForm>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
