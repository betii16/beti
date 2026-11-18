'use client'

// Formulaire de demande à un artisan. En cas de refus, l'action renvoie ce qui a
// été saisi : React remet les champs à leur valeur par défaut après une action,
// et cette valeur par défaut devient alors la saisie.

import { useActionState } from 'react'
import { wilayas } from '@/domain/wilayas'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { createBooking, type BookingState } from '@/lib/bookings/actions'
import { ALERT, FIELD, HELP, INPUT, LABEL, PRIMARY } from './form-styles'

export function BookingForm({
  lang,
  artisanId,
  wilaya,
  askName,
  today,
  t,
  errors,
}: {
  lang: Locale
  artisanId: string
  /** Wilaya proposée d'office : celle de l'artisan. */
  wilaya: number
  /** Vrai tant que la personne n'a pas donné son nom : il est demandé avec la première demande. */
  askName: boolean
  /** Date du jour en Algérie (AAAA-MM-JJ), borne basse du champ date. */
  today: string
  t: Dictionary['booking']
  errors: Dictionary['errors']
}) {
  const [state, send, sending] = useActionState<BookingState, FormData>(createBooking, {})
  const saved = state.values
  const optional = <span className="font-normal text-muted">({t.optional})</span>

  return (
    <form action={send} className="flex max-w-[620px] flex-col gap-5">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="artisan" value={artisanId} />

      {askName && (
        <label className={FIELD}>
          <span className={LABEL}>{t.yourName}</span>
          <input name="name" defaultValue={saved?.name ?? ''} required minLength={2} maxLength={80} autoComplete="name" className={INPUT} />
          <span className={HELP}>{t.yourNameHelp}</span>
        </label>
      )}

      <label className={FIELD}>
        <span className={LABEL}>{t.description}</span>
        <textarea
          name="description"
          defaultValue={saved?.description ?? ''}
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          placeholder={t.descriptionPlaceholder}
          className={`${INPUT} py-4 leading-relaxed`}
        />
        <span className={HELP}>{t.descriptionHelp}</span>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={FIELD}>
          <span className={LABEL}>{t.wilaya}</span>
          {/* React ne met pas à jour la valeur par défaut d'un select déjà affiché : la clé le recrée avec la saisie rendue. */}
          <select key={saved?.wilaya ?? String(wilaya)} name="wilaya" defaultValue={saved?.wilaya ?? String(wilaya)} required className={INPUT}>
            {wilayas.map((item, i) => (
              <option key={item.fr} value={i + 1}>
                {item[lang]} ({i + 1})
              </option>
            ))}
          </select>
        </label>
        <label className={FIELD}>
          <span className={LABEL}>
            {t.commune} {optional}
          </span>
          <input name="commune" defaultValue={saved?.commune ?? ''} maxLength={80} className={INPUT} />
        </label>
      </div>

      <label className={FIELD}>
        <span className={LABEL}>
          {t.address} {optional}
        </span>
        <input name="address" defaultValue={saved?.address ?? ''} maxLength={300} autoComplete="street-address" className={INPUT} />
        <span className={HELP}>{t.addressHelp}</span>
      </label>

      <div className="grid gap-5 sm:grid-cols-2 sm:items-end">
        <label className={FIELD}>
          <span className={LABEL}>
            {t.date} {optional}
          </span>
          <input type="date" name="date" min={today} defaultValue={saved?.date ?? ''} className={INPUT} />
        </label>
        <label className="flex min-h-[60px] cursor-pointer items-center gap-3 rounded-[22px] bg-mist px-5 text-lg font-medium">
          <input type="checkbox" name="urgent" defaultChecked={saved?.urgent === 'on'} className="size-5 accent-ink" />
          {t.urgent}
        </label>
      </div>

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
