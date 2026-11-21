import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { requireStaff } from '@/lib/auth/session'
import { errorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Journal' }

// Une ligne par action inscrite par private.audit() dans …400_admin.sql.
const ACTIONS: Record<string, string> = {
  'user.suspend': 'Compte suspendu',
  'user.restore': 'Compte rétabli',
  'listing.update': 'Profil d’artisan modifié',
  'subscription.approve': 'Abonnement validé',
  'subscription.reject': 'Abonnement refusé',
  'booking.cancelled': 'Demande annulée',
  'booking.completed': 'Demande close',
  'review.hide': 'Avis masqué',
  'review.show': 'Avis réaffiché',
  'report.update': 'Signalement traité',
  'config.launch_free_until': 'Fin du lancement gratuit modifiée',
}

export default async function AdminJournal({ params }: PageProps<'/[lang]/admin/journal'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  await requireStaff(lang, '/admin/journal')
  const dict = getDictionary('fr')

  const supabase = await createClient()
  // shortcut: les 100 dernières actions ; paginer quand le journal grandira.
  const { data, error } = await supabase.from('audit_log').select('id, actor_id, action, target, details, created_at').order('created_at', { ascending: false }).limit(100)
  const actorIds = [...new Set((data ?? []).map(entry => entry.actor_id))]
  const actors = actorIds.length > 0 ? await supabase.from('profiles').select('id, full_name').in('id', actorIds) : null
  const nameOf = new Map((actors?.data ?? []).map(actor => [actor.id, actor.full_name || 'Sans nom']))

  const date = new Intl.DateTimeFormat('fr-DZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Africa/Algiers' })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[clamp(2rem,4vw,2.75rem)] leading-[1.08] font-bold tracking-[-0.035em]">Journal</h1>
        <p className="text-body">Chaque action de l’équipe y est inscrite par la base, sans possibilité de la modifier.</p>
      </div>
      {error ? (
        <p role="alert" className="max-w-[620px] rounded-[20px] border-2 border-ink px-5 py-3.5 font-medium">
          {dict.errors[errorCode(error)]}
        </p>
      ) : data.length === 0 ? (
        <p className="rounded-[28px] bg-mist p-7 font-medium">Aucune action pour l’instant.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {data.map(entry => {
            const reason = entry.details && typeof entry.details === 'object' && !Array.isArray(entry.details) ? entry.details.reason : null
            return (
              <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="font-semibold">{ACTIONS[entry.action] ?? entry.action}</p>
                  <p className="text-sm text-muted">
                    <span className="font-mono">{entry.target}</span>
                    {typeof reason === 'string' && reason && <span> — {reason}</span>}
                  </p>
                </div>
                <p className="text-sm text-body">
                  {nameOf.get(entry.actor_id) ?? 'Membre de l’équipe'}, {date.format(new Date(entry.created_at))}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
