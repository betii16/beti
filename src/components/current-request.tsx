'use client'

// Accueil : rappel de la demande en cours de la personne connectée, avec un lien
// direct vers elle. L'accueil reste une page statique : la demande est lue par le
// navigateur, et seulement si un cookie de session existe.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { OPEN_STATUSES, type BookingStatus } from '@/domain/bookings'
import { href, type Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { hasSessionCookie } from '@/lib/auth/input'
import { createClient } from '@/lib/supabase/browser'

type Current = { id: string; status: BookingStatus; category: string }
type Texts = { title: string; statuses: Dictionary['booking']['status']; categories: Dictionary['categories'] }

/** Le bandeau lui-même : l'état de la demande, son métier, et toute la ligne mène à elle. */
export function RequestBanner({ lang, booking, title, statuses, categories }: { lang: Locale; booking: Current } & Texts) {
  const trade = (categories as Record<string, string>)[booking.category] ?? categories.autre
  return (
    <div className="px-4 pb-3 sm:px-6">
      <Link
        href={href(lang, `/demandes/${booking.id}`)}
        className="flex min-h-16 items-center justify-between gap-4 rounded-[28px] bg-accent px-6 py-3 text-ink transition-colors hover:bg-ink hover:text-paper"
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-[15px] font-medium">{title}</span>
          <span className="text-lg leading-snug font-semibold">
            {statuses[booking.status]}
            {lang === 'ar' ? '، ' : ', '}
            {trade}
          </span>
        </span>
        <ChevronRight aria-hidden className="size-6 shrink-0 rtl:rotate-180" />
      </Link>
    </div>
  )
}

export function CurrentRequest({ lang, ...texts }: { lang: Locale } & Texts) {
  const [booking, setBooking] = useState<Current | null>(null)

  useEffect(() => {
    if (!hasSessionCookie(document.cookie)) return
    let cancelled = false
    const supabase = createClient()
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const me = session.user.id
      const { data, error } = await supabase
        .from('bookings')
        .select('id, status, category')
        // Le RLS montre toutes les demandes à l'équipe : on ne veut que celles de la personne.
        .or(`client_id.eq.${me},artisan_id.eq.${me}`)
        .in('status', OPEN_STATUSES)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      // Un rappel qui manque ne bloque personne (« Demandes » reste dans la barre d'onglets) : consigné, pas affiché.
      if (error) return console.error('[beti] demande en cours non lue', error)
      if (!cancelled) setBooking(data)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return booking ? <RequestBanner lang={lang} booking={booking} {...texts} /> : null
}
