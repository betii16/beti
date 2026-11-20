'use client'

// Avis du client sur une demande terminée : note, commentaire, jusqu'à 4 photos.
// Les photos partent d'abord du navigateur (reviews/<demande>/), puis l'action
// publie l'avis ; refusé, ses photos sont retirées du stockage.

import { Star } from 'lucide-react'
import { useState, useTransition, type FormEvent } from 'react'
import type { Dictionary } from '@/i18n/dictionary'
import { submitReview } from '@/lib/bookings/actions'
import type { ErrorCode } from '@/lib/errors'
import { uploadPhotos } from '@/lib/photos'
import { ALERT, FIELD, HELP, INPUT, LABEL, PRIMARY } from './form-styles'

export function ReviewForm({ bookingId, t, errors }: { bookingId: string; t: Dictionary['booking']; errors: Dictionary['errors'] }) {
  const [error, setError] = useState<ErrorCode | null>(null)
  const [pending, start] = useTransition()

  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const rating = Number(form.get('rating'))
    const comment = String(form.get('comment') ?? '')
    const files = form.getAll('photos').filter((file): file is File => file instanceof File && file.size > 0)
    if (files.length > 4) return setError('invalid_photos')
    start(async () => {
      setError(null)
      const upload = files.length > 0 ? await uploadPhotos(`reviews/${bookingId}`, files) : { paths: [] }
      if (upload.error) return setError(upload.error)
      const result = await submitReview(bookingId, rating, comment, upload.paths)
      if (result.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={send} className="flex max-w-[620px] flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className={`${LABEL} mb-2`}>{t.ratingLabel}</legend>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map(value => (
            <label
              key={value}
              className="inline-flex min-h-12 min-w-14 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-mist px-4 font-semibold transition-colors hover:bg-sage has-checked:bg-ink has-checked:text-paper has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ink"
            >
              <input type="radio" name="rating" value={value} required disabled={pending} className="sr-only" />
              <Star aria-hidden className="size-4 fill-current" />
              <span aria-hidden>{value}</span>
              <span className="sr-only">{t.ratingValue.replace('{n}', String(value))}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className={FIELD}>
        <span className={LABEL}>
          {t.comment} <span className="font-normal text-muted">({t.optional})</span>
        </span>
        <textarea name="comment" maxLength={1000} rows={4} disabled={pending} className={`${INPUT} py-4 leading-relaxed`} />
        <span className={HELP}>{t.commentHelp}</span>
      </label>
      <label className={FIELD}>
        <span className={LABEL}>
          {t.reviewPhotos} <span className="font-normal text-muted">({t.optional})</span>
        </span>
        <input
          type="file"
          name="photos"
          accept="image/*"
          multiple
          disabled={pending}
          className="text-[15px] file:me-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-ink file:px-5 file:py-3 file:font-semibold file:text-paper"
        />
        <span className={HELP}>{t.reviewPhotosHelp}</span>
      </label>
      <p className={HELP}>{t.reviewNote}</p>
      {error && (
        <p role="alert" className={ALERT}>
          {errors[error]}
        </p>
      )}
      <button type="submit" disabled={pending} className={PRIMARY}>
        {t.sendReview}
      </button>
    </form>
  )
}
