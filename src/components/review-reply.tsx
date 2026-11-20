'use client'

// Réponse de l'artisan à l'avis reçu : publiée sous l'avis, sur son profil.

import { useActionState } from 'react'
import type { Dictionary } from '@/i18n/dictionary'
import { replyReview, type ReplyState } from '@/lib/bookings/actions'
import { ALERT, FIELD, HELP, INPUT, LABEL } from './form-styles'

const BUTTON =
  'inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full px-6 font-semibold transition-colors disabled:cursor-wait disabled:opacity-60'

export function ReviewReply({ reviewId, reply, t, errors }: { reviewId: string; reply: string | null; t: Dictionary['booking']; errors: Dictionary['errors'] }) {
  const [state, run, pending] = useActionState<ReplyState, FormData>(replyReview, {})
  return (
    <form action={run} className="flex max-w-[620px] flex-col gap-3">
      <input type="hidden" name="review" value={reviewId} />
      <label className={FIELD}>
        <span className={LABEL}>{t.replyLabel}</span>
        <textarea name="reply" defaultValue={reply ?? ''} maxLength={1000} rows={3} className={`${INPUT} py-4 leading-relaxed`} />
        <span className={HELP}>{t.replyHelp}</span>
      </label>
      {state.error ? (
        <p role="alert" className={ALERT}>
          {errors[state.error]}
        </p>
      ) : (
        state.saved && (
          <p role="status" className="font-medium">
            {t.replySaved}
          </p>
        )
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" name="do" value="save" disabled={pending} className={`${BUTTON} bg-ink text-paper hover:bg-accent hover:text-ink`}>
          {t.saveReply}
        </button>
        {reply && (
          <button type="submit" name="do" value="remove" disabled={pending} className={`${BUTTON} bg-mist hover:bg-ink hover:text-paper`}>
            {t.removeReply}
          </button>
        )}
      </div>
    </form>
  )
}
