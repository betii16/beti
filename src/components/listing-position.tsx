'use client'

// Espace artisan : enregistrer sa position approximative, pour apparaître en tête
// des recherches « près de moi » des clients proches.

import { useState, useTransition } from 'react'
import type { Dictionary } from '@/i18n/dictionary'
import type { ErrorCode } from '@/lib/errors'
import { setListingPosition } from '@/lib/listing/actions'
import { ALERT } from './form-styles'

const BUTTON = 'inline-flex min-h-12 cursor-pointer items-center rounded-full px-6 font-semibold transition-colors hover:bg-ink hover:text-paper disabled:cursor-wait disabled:opacity-60'

export function ListingPosition({
  placed,
  t,
  geo,
  errors,
}: {
  placed: boolean
  t: Dictionary['listing']
  /** Messages de l'appareil (position refusée ou introuvable), les mêmes que pour le partage de position. */
  geo: { denied: string; unavailable: string }
  errors: Dictionary['errors']
}) {
  const [problem, setProblem] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [saving, start] = useTransition()

  const save = (position: { lat: number; lng: number } | null) =>
    start(async () => {
      const result: { error?: ErrorCode } = await setListingPosition(position)
      setProblem(result.error ? errors[result.error] : null)
    })

  const locate = () => {
    if (!navigator.geolocation) return setProblem(geo.unavailable)
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false)
        save({ lat: coords.latitude, lng: coords.longitude })
      },
      error => {
        setLocating(false)
        setProblem(error.code === error.PERMISSION_DENIED ? geo.denied : geo.unavailable)
      },
      { maximumAge: 60_000, timeout: 20_000 },
    )
  }

  const busy = locating || saving
  return (
    <section aria-labelledby="zone" className="flex max-w-[620px] flex-col items-start gap-3">
      <h2 id="zone" className="text-[clamp(1.375rem,2.6vw,1.75rem)] leading-tight font-bold tracking-[-0.025em] rtl:leading-snug">
        {t.positionTitle}
      </h2>
      <p className="text-body">{placed ? t.positionOn : t.positionHelp}</p>
      <div className="flex flex-wrap gap-2.5">
        <button type="button" onClick={locate} disabled={busy} className={`${BUTTON} ${placed ? 'bg-mist' : 'bg-accent text-ink'}`}>
          {placed ? t.positionUpdate : t.positionSet}
        </button>
        {placed && (
          <button type="button" onClick={() => save(null)} disabled={busy} className={`${BUTTON} bg-mist`}>
            {t.positionRemove}
          </button>
        )}
      </div>
      {problem && (
        <p role="alert" className={ALERT}>
          {problem}
        </p>
      )}
    </section>
  )
}
