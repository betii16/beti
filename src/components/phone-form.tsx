'use client'

// Numéro de téléphone de la personne (Mon compte). Il n'est transmis à l'autre
// partie d'une demande qu'une fois celle-ci acceptée (booking_contact).

import { useActionState } from 'react'
import { formatPhone } from '@/domain/listing'
import type { Dictionary } from '@/i18n/dictionary'
import { updateListing, type StepState } from '@/lib/listing/actions'
import { ALERT } from './form-styles'

export function PhoneForm({ phone, t, errors }: { phone: string | null; t: Dictionary['account']; errors: Dictionary['errors'] }) {
  const [state, save, saving] = useActionState<StepState, FormData>(updateListing, {})
  return (
    <form action={save} className="flex max-w-[460px] flex-col gap-2">
      <div className="flex items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[15px] font-semibold whitespace-nowrap">{t.phone}</span>
          <input
            type="tel"
            name="phone"
            defaultValue={state.phone ?? (phone ? formatPhone(phone) : '')}
            required
            maxLength={20}
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="0555 12 34 56"
            className="min-h-14 w-full rounded-[22px] bg-mist px-5 text-lg max-sm:px-4 max-sm:text-base rtl:text-end"
          />
        </label>
        <button type="submit" name="do" value="phone" disabled={saving} className="inline-flex min-h-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ink px-6 font-semibold text-paper max-sm:px-5 transition-colors hover:bg-accent hover:text-ink disabled:cursor-wait disabled:opacity-60">
          {t.save}
        </button>
      </div>
      <p className="text-sm text-muted">{t.phoneHelp}</p>
      {state.error ? (
        <p role="alert" className={ALERT}>
          {errors[state.error]}
        </p>
      ) : (
        state.saved && (
          <p role="status" className="font-medium">
            {t.phoneSaved}
          </p>
        )
      )}
    </form>
  )
}
