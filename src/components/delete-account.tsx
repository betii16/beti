'use client'

// « Mon compte » : supprimer son compte. Le lien n'ouvre que l'explication ;
// il faut encore cocher la case, puis valider.

import { useActionState } from 'react'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { deleteAccount, type DeleteState } from '@/lib/auth/actions'
import { ALERT } from './form-styles'

export function DeleteAccount({ lang, t, errors }: { lang: Locale; t: Dictionary['account']; errors: Dictionary['errors'] }) {
  const [state, remove, removing] = useActionState<DeleteState, FormData>(deleteAccount, {})
  return (
    <details className="max-w-[560px]">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold underline underline-offset-4">{t.deleteTitle}</summary>
      <form action={remove} className="flex flex-col items-start gap-4 pt-2">
        <input type="hidden" name="lang" value={lang} />
        <p className="text-body">{t.deleteText}</p>
        <label className="flex cursor-pointer items-start gap-3 font-medium">
          <input type="checkbox" name="confirm" value="oui" required className="mt-0.5 size-6 shrink-0 accent-ink" />
          {t.deleteConfirm}
        </label>
        <button
          type="submit"
          disabled={removing}
          className="inline-flex min-h-12 cursor-pointer items-center rounded-full bg-ink px-6 font-semibold text-paper transition-colors hover:bg-accent hover:text-ink disabled:cursor-wait disabled:opacity-60"
        >
          {t.deleteSubmit}
        </button>
        {state.error && (
          <p role="alert" className={ALERT}>
            {errors[state.error]}
          </p>
        )}
      </form>
    </details>
  )
}
