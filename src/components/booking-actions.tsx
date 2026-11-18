'use client'

// Boutons d'une demande. La page ne passe que les actions permises à cette
// personne dans cet état ; la base revérifie de toute façon à chaque envoi.

import { useActionState } from 'react'
import type { BookingAction } from '@/domain/bookings'
import type { Dictionary } from '@/i18n/dictionary'
import { updateBooking, type UpdateState } from '@/lib/bookings/actions'
import { ALERT, FIELD, HELP, INPUT, LABEL, PRIMARY } from './form-styles'

const SECONDARY =
  'inline-flex min-h-[60px] w-full cursor-pointer items-center justify-center rounded-full bg-mist px-7 text-lg font-semibold transition-colors hover:bg-ink hover:text-paper disabled:cursor-wait disabled:opacity-60'

export function BookingActions({
  bookingId,
  actions,
  t,
  errors,
}: {
  bookingId: string
  actions: BookingAction[]
  t: Dictionary['booking']
  errors: Dictionary['errors']
}) {
  const [state, run, running] = useActionState<UpdateState, FormData>(updateBooking, {})
  if (actions.length === 0) return null
  const can = (action: BookingAction) => actions.includes(action)
  const booking = <input type="hidden" name="booking" value={bookingId} />

  return (
    <div className="flex max-w-[460px] flex-col gap-4">
      {can('accept') && (
        <form action={run} className="flex flex-col gap-3">
          {booking}
          <label className={FIELD}>
            <span className={LABEL}>
              {t.price} <span className="font-normal text-muted">({t.optional})</span>
            </span>
            <input name="price" inputMode="numeric" maxLength={11} dir="ltr" className={INPUT} />
            <span className={HELP}>{t.priceHelp}</span>
          </label>
          {/* Le bouton cliqué donne l'action : son nom et sa valeur partent avec le formulaire. */}
          <button type="submit" name="do" value="accept" disabled={running} className={PRIMARY}>
            {t.accept}
          </button>
          <button type="submit" name="do" value="decline" disabled={running} className={SECONDARY}>
            {t.decline}
          </button>
        </form>
      )}

      {(can('finish') || can('complete')) && (
        <form action={run}>
          {booking}
          <button type="submit" name="do" value={can('finish') ? 'finish' : 'complete'} disabled={running} className={PRIMARY}>
            {can('finish') ? t.finish : t.complete}
          </button>
        </form>
      )}

      {can('cancel') && (
        // Annuler ne se rattrape pas : le bouton ne fait qu'ouvrir la confirmation.
        <details className="rounded-[22px] bg-mist px-5">
          <summary className="flex min-h-14 cursor-pointer items-center font-semibold">{t.cancel}</summary>
          <form action={run} className="flex flex-col gap-3 pb-5">
            {booking}
            <label className={FIELD}>
              <span className={LABEL}>
                {t.reason} <span className="font-normal text-muted">({t.optional})</span>
              </span>
              <input name="reason" maxLength={300} className={`${INPUT} bg-paper`} />
            </label>
            <button
              type="submit"
              name="do"
              value="cancel"
              disabled={running}
              className="inline-flex min-h-14 cursor-pointer items-center justify-center rounded-full bg-ink px-7 font-semibold text-paper transition-colors hover:bg-accent hover:text-ink disabled:cursor-wait disabled:opacity-60"
            >
              {t.confirmCancel}
            </button>
          </form>
        </details>
      )}

      {state.error && (
        <p role="alert" className={ALERT}>
          {errors[state.error]}
        </p>
      )}
    </div>
  )
}
