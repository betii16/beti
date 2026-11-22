'use client'

// Page d'une demande acceptée, côté artisan : partager sa position avec le client
// pendant le trajet. Le navigateur n'envoie la position que tant que cette page
// reste ouverte ; la base ne la garde que si un partage est ouvert (push_location).

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { setSharing } from '@/lib/bookings/actions'
import { errorCode, type ErrorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/browser'
import { ALERT } from './form-styles'

/** Une position toutes les 10 secondes au plus : assez pour suivre un trajet, sans vider la batterie. */
const EVERY_MS = 10_000
const GEO: PositionOptions = { enableHighAccuracy: true, maximumAge: 5000, timeout: 30_000 }

type Problem = { code: ErrorCode } | { geo: 'denied' | 'unavailable' }
const geoProblem = (error: GeolocationPositionError): Problem => ({ geo: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable' })

export function LocationShare({
  lang,
  bookingId,
  sharing,
  t,
  errors,
}: {
  lang: Locale
  bookingId: string
  sharing: boolean
  t: Dictionary['booking']
  errors: Dictionary['errors']
}) {
  const router = useRouter()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [sentAt, setSentAt] = useState<number | null>(null)
  const [pending, start] = useTransition()
  const lastSent = useRef(0)

  // Tant que le partage est ouvert, la position suit l'appareil. Au rechargement de la page, l'envoi reprend seul.
  useEffect(() => {
    if (!sharing || !navigator.geolocation) return
    const supabase = createClient()
    const watch = navigator.geolocation.watchPosition(
      position => {
        const now = Date.now()
        if (now - lastSent.current < EVERY_MS) return
        lastSent.current = now
        void supabase.rpc('push_location', { p_lat: position.coords.latitude, p_lng: position.coords.longitude }).then(({ error }) => {
          if (!error) {
            setProblem(null)
            setSentAt(now)
            return
          }
          const code = errorCode(error)
          setProblem({ code })
          // Le partage a été fermé ailleurs (demande terminée ou annulée) : l'écran se remet à jour.
          if (code === 'not_sharing') router.refresh()
        })
      },
      error => setProblem(geoProblem(error)),
      GEO,
    )
    return () => navigator.geolocation.clearWatch(watch)
  }, [sharing, router])

  const toggle = (on: boolean) =>
    start(async () => {
      const result = await setSharing(bookingId, on)
      setProblem(result.error ? { code: result.error } : null)
    })

  const begin = () => {
    if (!navigator.geolocation) return setProblem({ geo: 'unavailable' })
    // La position est demandée avant d'ouvrir le partage : si l'appareil la refuse, rien n'est activé.
    navigator.geolocation.getCurrentPosition(
      () => toggle(true),
      error => setProblem(geoProblem(error)),
      GEO,
    )
  }

  const time = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Africa/Algiers' })

  return (
    <section className="flex max-w-[620px] flex-col items-start gap-3">
      <h2 className="text-xl font-semibold tracking-[-0.01em]">{t.shareTitle}</h2>
      <p className="text-body">{sharing ? t.shareOn : t.shareHelp}</p>
      {sharing && sentAt !== null && (
        <p role="status" className="text-[15px] text-muted">
          {t.shareSentAt.replace('{time}', time.format(sentAt))}
        </p>
      )}
      <button
        type="button"
        onClick={sharing ? () => toggle(false) : begin}
        disabled={pending}
        className={`inline-flex min-h-12 cursor-pointer items-center rounded-full px-6 font-semibold transition-colors hover:bg-ink hover:text-paper disabled:cursor-wait disabled:opacity-60 ${sharing ? 'bg-mist' : 'bg-accent text-ink'}`}
      >
        {sharing ? t.shareStop : t.shareStart}
      </button>
      {problem && (
        <p role="alert" className={ALERT}>
          {'code' in problem ? errors[problem.code] : problem.geo === 'denied' ? t.shareDenied : t.shareUnavailable}
        </p>
      )}
    </section>
  )
}
