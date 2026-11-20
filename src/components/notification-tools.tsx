'use client'

// Page des notifications : les marquer lues à l'affichage, et tout effacer.

import { useActionState, useEffect } from 'react'
import type { Dictionary } from '@/i18n/dictionary'
import { clearNotifications, markNotificationsRead, type ClearState } from '@/lib/notifications/actions'
import { ALERT } from './form-styles'

/** Affichées, elles sont lues : la prochaine visite ne les montrera plus comme nouvelles. */
export function MarkSeen() {
  useEffect(() => {
    void markNotificationsRead()
  }, [])
  return null
}

export function ClearNotifications({ t, errors }: { t: Dictionary['notifications']; errors: Dictionary['errors'] }) {
  const [state, clear, clearing] = useActionState<ClearState>(clearNotifications, {})
  return (
    // Effacer ne se rattrape pas : le lien ne fait qu'ouvrir la confirmation.
    <details className="self-start">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold underline underline-offset-4">{t.clear}</summary>
      <form action={clear} className="flex flex-col items-start gap-3 pt-2">
        <button
          type="submit"
          disabled={clearing}
          className="inline-flex min-h-12 cursor-pointer items-center rounded-full bg-ink px-6 font-semibold text-paper transition-colors hover:bg-accent hover:text-ink disabled:cursor-wait disabled:opacity-60"
        >
          {t.confirmClear}
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
