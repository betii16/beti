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
    <form action={save} className="flex max-w-[460px] flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[15px] font-semibold">{t.phone}</span>
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
          className="min-h-[60px] w-full rounded-[22px] bg-mist px-5 text-lg rtl:text-end"
        />
      </label>
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
      <button
        type="submit"
        name="do"
        value="phone"
        disabled={saving}
        className="inline-flex min-h-14 cursor-pointer items-center justify-center self-start rounded-full bg-ink px-7 font-semibold text-paper transition-colors hover:bg-accent hover:text-ink disabled:cursor-wait disabled:opacity-60"
      >
        {t.savePhone}
      </button>
    </form>
  )
}
