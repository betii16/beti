import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminForm } from '@/components/admin-form'
import { ADMIN_DARK, ADMIN_INPUT } from '@/components/admin-styles'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { requireStaff } from '@/lib/auth/session'
import { errorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Signalements' }

// Libellés des valeurs permises par les contraintes de public.reports (…100_schema.sql).
const REASONS: Record<string, string> = {
  fraude: 'Fraude',
  comportement: 'Comportement',
  travail_non_fait: 'Travail non fait',
  prix_different: 'Prix différent de celui convenu',
  faux_profil: 'Faux profil',
  harcelement: 'Harcèlement',
  autre: 'Autre',
}
const TARGETS: Record<string, string> = { artisan: 'Profil d’artisan', client: 'Client', booking: 'Demande', review: 'Avis', message: 'Message' }
const STATUSES = { open: 'Ouvert', in_review: 'En cours d’examen', resolved: 'Résolu', rejected: 'Rejeté' }
const RESOLUTIONS = { none: 'Aucune suite', warning: 'Avertissement', suspension: 'Suspension du compte signalé', cash_dispute: 'Litige de paiement', other: 'Autre suite' }

export default async function AdminReports({ params }: PageProps<'/[lang]/admin/signalements'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  await requireStaff(lang, '/admin/signalements')
  const dict = getDictionary('fr')

  const supabase = await createClient()
  const [open, closed] = await Promise.all([
    supabase
      .from('reports')
      .select('id, reported_user_id, target_type, booking_id, reason, details, status, resolution, created_at, report_notes(note)')
      .in('status', ['open', 'in_review'])
      .order('created_at', { ascending: true }),
    supabase
      .from('reports')
      .select('id, reported_user_id, target_type, booking_id, reason, details, status, resolution, created_at, report_notes(note)')
      .in('status', ['resolved', 'rejected'])
      .order('handled_at', { ascending: false })
      .limit(30),
  ])
  const error = open.error ?? closed.error
  const reports = [...(open.data ?? []), ...(closed.data ?? [])]
  const people = reports.length > 0 ? await supabase.from('profiles').select('id, full_name, is_active').in('id', [...new Set(reports.map(r => r.reported_user_id))]) : null
  const personOf = new Map((people?.data ?? []).map(person => [person.id, person]))
  const date = new Intl.DateTimeFormat('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Algiers' })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[clamp(1.75rem,3.4vw,2.375rem)] leading-[1.08] font-bold tracking-[-0.035em]">Signalements</h1>
        <p className="max-w-[70ch] text-body">
          Les plus anciens d’abord. « Résolu » avec « Suspension » suspend le compte signalé dans la même opération ; la note reste interne à l’équipe.
        </p>
      </div>

      {error ? (
        <p role="alert" className="max-w-[620px] rounded-[20px] border-2 border-ink px-5 py-3.5 font-medium">
          {dict.errors[errorCode(error)]}
        </p>
      ) : reports.length === 0 ? (
        <p className="rounded-[28px] bg-mist p-7 font-medium">Aucun signalement.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {reports.map(report => {
            const person = personOf.get(report.reported_user_id)
            const pending = report.status === 'open' || report.status === 'in_review'
            return (
              <li key={report.id} className={`flex flex-col gap-3 rounded-[28px] p-5 sm:p-6 ${pending ? 'bg-mist' : 'border border-line'}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="flex flex-wrap items-baseline gap-x-3">
                    <span className="text-lg font-semibold">{REASONS[report.reason] ?? report.reason}</span>
                    <span className="text-body">{TARGETS[report.target_type] ?? report.target_type}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {STATUSES[report.status]}, reçu le {date.format(new Date(report.created_at))}
                  </p>
                </div>
                <p className="text-body">
                  Compte signalé : <span className="font-semibold text-ink">{person?.full_name || 'Sans nom'}</span>
                  {person && !person.is_active && <span className="ms-2 rounded-full bg-ink px-2.5 py-0.5 text-sm text-paper">suspendu</span>}
                  {report.booking_id && (
                    <Link href={`/fr/demandes/${report.booking_id}`} className="ms-3 font-semibold underline underline-offset-4">
                      Voir la demande
                    </Link>
                  )}
                </p>
                {report.details && <p className="max-w-[70ch] whitespace-pre-line text-body">{report.details}</p>}
                {!pending && report.resolution !== 'none' && <p className="text-sm font-semibold">Suite : {RESOLUTIONS[report.resolution as keyof typeof RESOLUTIONS]}</p>}

                <AdminForm errors={dict.errors}>
                  <input type="hidden" name="do" value="report" />
                  <input type="hidden" name="id" value={report.id} />
                  <label className="flex items-center gap-2">
                    <span className="sr-only">État</span>
                    <select name="status" defaultValue={report.status} className={ADMIN_INPUT}>
                      {Object.entries(STATUSES).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="sr-only">Suite donnée</span>
                    <select name="resolution" defaultValue={report.resolution} className={ADMIN_INPUT}>
                      {Object.entries(RESOLUTIONS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex w-full flex-col gap-1">
                    <span className="text-sm font-semibold">Note interne</span>
                    <textarea name="note" defaultValue={report.report_notes?.note ?? ''} maxLength={4000} rows={2} className="rounded-[18px] bg-paper px-4 py-2.5" />
                  </label>
                  <button type="submit" className={ADMIN_DARK}>
                    Enregistrer
                  </button>
                </AdminForm>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
