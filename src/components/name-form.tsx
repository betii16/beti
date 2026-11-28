'use client'

import { useActionState } from 'react'
import type { Dictionary } from '@/i18n/dictionary'
import { saveName, type NameState } from '@/lib/auth/actions'

export function NameForm({ name, t, errors }: { name: string; t: Dictionary['account']; errors: Dictionary['errors'] }) {
  const [state, save, saving] = useActionState<NameState, FormData>(saveName, {})
  return (
    <form action={save} className="flex max-w-[460px] flex-col gap-2">
      {/* Bouton à côté du champ : la page « Mon compte » tient dans un écran de téléphone. */}
      <div className="flex items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[15px] font-semibold whitespace-nowrap">{t.name}</span>
          <input
            name="name"
            defaultValue={name}
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            className="min-h-14 w-full rounded-[22px] bg-mist px-5 text-lg max-sm:px-4 max-sm:text-base"
          />
        </label>
        <button type="submit" disabled={saving} className="inline-flex min-h-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ink px-6 font-semibold text-paper max-sm:px-5 transition-colors hover:bg-accent hover:text-ink disabled:cursor-wait disabled:opacity-60">
          {t.save}
        </button>
      </div>
      <p className="text-sm text-muted">{t.nameHelp}</p>
      {state.error ? (
        <p role="alert" className="rounded-[20px] border-2 border-ink px-5 py-3.5 font-medium">
          {errors[state.error]}
        </p>
      ) : state.saved ? (
        <p role="status" className="font-medium">
          {t.saved}
        </p>
      ) : null}
    </form>
  )
}
