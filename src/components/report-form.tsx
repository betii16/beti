'use client'

// Formulaire de signalement. En cas de refus, la saisie revient à l'écran.

import Link from 'next/link'
import { useActionState } from 'react'
import type { Dictionary } from '@/i18n/dictionary'
import { createReport, type ReportState } from '@/lib/reports/actions'
import { ALERT, FIELD, HELP, INPUT, LABEL, PRIMARY } from './form-styles'

export function ReportForm({
  type,
  id,
  backHref,
  t,
  errors,
}: {
  type: 'artisan' | 'booking'
  id: string
  backHref: string
  t: Dictionary['report']
  errors: Dictionary['errors']
}) {
  const [state, send, sending] = useActionState<ReportState, FormData>(createReport, {})

  if (state.sent) {
    return (
      <div className="flex max-w-[620px] flex-col items-start gap-4">
        <p role="status" className="rounded-[20px] bg-accent px-5 py-3.5 font-medium">
          {t.sent}
        </p>
        <Link href={backHref} className="inline-flex min-h-12 items-center rounded-full bg-ink px-6 font-semibold text-paper transition-colors hover:bg-accent hover:text-ink">
          {t.back}
        </Link>
      </div>
    )
  }

  const reason = state.values?.reason ?? ''
  return (
    <form action={send} className="flex max-w-[620px] flex-col gap-5">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <label className={FIELD}>
        <span className={LABEL}>{t.reason}</span>
        {/* React ne met pas à jour la valeur par défaut d'un select déjà affiché : la clé le recrée avec la saisie rendue. */}
        <select key={reason} name="reason" defaultValue={reason} required className={INPUT}>
          <option value="" disabled>
            {t.choose}
          </option>
          {Object.entries(t.reasons).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className={FIELD}>
        <span className={LABEL}>{t.details}</span>
        <textarea name="details" defaultValue={state.values?.details ?? ''} maxLength={2000} rows={5} className={`${INPUT} py-4 leading-relaxed`} />
        <span className={HELP}>{t.detailsHelp}</span>
      </label>
      {state.error && (
        <p role="alert" className={ALERT}>
          {errors[state.error]}
        </p>
      )}
      <button type="submit" disabled={sending} className={PRIMARY}>
        {t.send}
      </button>
    </form>
  )
}
