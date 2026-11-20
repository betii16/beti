'use client'

// Profil de l'artisan, à la création comme à la modification. En cas de refus,
// l'action renvoie la saisie, qui redevient la valeur par défaut des champs.

import { useActionState } from 'react'
import { wilayas } from '@/domain/wilayas'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { saveListing, type ListingState } from '@/lib/listing/actions'
import { ALERT, FIELD, HELP, INPUT, LABEL, PRIMARY } from './form-styles'

export type ListingValues = NonNullable<ListingState['values']>

export function ListingForm({
  lang,
  initial,
  mode,
  published = false,
  t,
  categories,
  errors,
}: {
  lang: Locale
  initial: ListingValues
  /** « become » : compte client, que l'envoi passe d'abord en compte artisan. */
  mode: 'become' | 'create' | 'edit'
  /** Profil déjà publié : sinon, « enregistré » rappelle qu'il reste invisible tant qu'il n'est pas publié. */
  published?: boolean
  t: Dictionary['listing']
  categories: Dictionary['categories']
  errors: Dictionary['errors']
}) {
  const [state, save, saving] = useActionState<ListingState, FormData>(saveListing, {})
  const v = state.values ?? initial
  const optional = <span className="font-normal text-muted">({t.optional})</span>

  return (
    <form action={save} className="flex max-w-[620px] flex-col gap-5">
      {mode === 'become' && <input type="hidden" name="become" value="1" />}

      <label className={FIELD}>
        <span className={LABEL}>{t.name}</span>
        <input name="name" defaultValue={v.name} required minLength={2} maxLength={60} autoComplete="organization" className={INPUT} />
        <span className={HELP}>{t.nameHelp}</span>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={FIELD}>
          <span className={LABEL}>{t.category}</span>
          {/* React ne met pas à jour la valeur par défaut d'un select déjà affiché : la clé le recrée avec la saisie rendue. */}
          <select key={v.category} name="category" defaultValue={v.category} required className={INPUT}>
            <option value="" disabled>
              {t.choose}
            </option>
            {Object.entries(categories).map(([slug, label]) => (
              <option key={slug} value={slug}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={FIELD}>
          <span className={LABEL}>{t.wilaya}</span>
          <select key={v.wilaya} name="wilaya" defaultValue={v.wilaya} required className={INPUT}>
            <option value="" disabled>
              {t.choose}
            </option>
            {wilayas.map((item, i) => (
              <option key={item.fr} value={i + 1}>
                {item[lang]} ({i + 1})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
        <label className={FIELD}>
          <span className={LABEL}>
            {t.commune} {optional}
          </span>
          <input name="commune" defaultValue={v.commune} maxLength={80} className={INPUT} />
        </label>
        <label className={FIELD}>
          <span className={LABEL}>{t.radius}</span>
          <input type="number" name="radius" defaultValue={v.radius} required min={1} max={200} step={1} dir="ltr" className={`${INPUT} rtl:text-end`} />
          <span className={HELP}>{t.radiusHelp}</span>
        </label>
      </div>

      <label className={FIELD}>
        <span className={LABEL}>
          {t.rate} {optional}
        </span>
        <input name="rate" defaultValue={v.rate} inputMode="numeric" pattern="[0-9 ]{1,9}" maxLength={9} dir="ltr" className={`${INPUT} sm:max-w-[296px] rtl:text-end`} />
        <span className={HELP}>{t.rateHelp}</span>
      </label>

      <label className={FIELD}>
        <span className={LABEL}>
          {t.skills} {optional}
        </span>
        <input name="skills" defaultValue={v.skills} maxLength={400} className={INPUT} />
        <span className={HELP}>{t.skillsHelp}</span>
      </label>

      <label className={FIELD}>
        <span className={LABEL}>
          {t.bio} {optional}
        </span>
        <textarea name="bio" defaultValue={v.bio} maxLength={1000} rows={5} className={`${INPUT} py-4 leading-relaxed`} />
        <span className={HELP}>{t.bioHelp}</span>
      </label>

      {state.error ? (
        <p role="alert" className={ALERT}>
          {errors[state.error]}
        </p>
      ) : (
        state.saved &&
        (published ? (
          <p role="status" className="font-medium">
            {t.saved}
          </p>
        ) : (
          // Le premier essai en vrai l'a montré : enregistrer n'est pas publier, il faut le dire ici.
          <p role="status" className="rounded-[20px] bg-accent px-5 py-3.5 font-medium">
            {t.savedNotPublished}{' '}
            <a href="#etapes" className="font-semibold underline underline-offset-4">
              {t.goPublish}
            </a>
          </p>
        ))
      )}
      <button type="submit" disabled={saving} className={PRIMARY}>
        {mode === 'edit' ? t.save : t.create}
      </button>
    </form>
  )
}
