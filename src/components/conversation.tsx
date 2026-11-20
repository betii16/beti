'use client'

// Conversation d'une demande. Les messages arrivent en temps réel (Supabase
// Realtime applique le RLS : chacun ne reçoit que les messages de ses demandes) ;
// un changement d'état de la demande recharge la page pour en montrer les boutons.

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { markMessagesRead, sendMessage, type Message } from '@/lib/bookings/actions'
import type { ErrorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/browser'
import { ALERT } from './form-styles'

/** Ajoute ou remplace un message (même id), en gardant l'ordre chronologique. */
const upsert = (list: Message[], message: Message) =>
  [...list.filter(item => item.id !== message.id), message].sort((a, b) => a.created_at.localeCompare(b.created_at))

export function Conversation({
  lang,
  bookingId,
  userId,
  initial,
  closed,
  t,
  errors,
}: {
  lang: Locale
  bookingId: string
  userId: string
  initial: Message[]
  /** Demande déclinée, annulée, ou terminée depuis plus de 7 jours : la base refuse tout nouveau message. */
  closed: boolean
  t: Dictionary['booking']
  errors: Dictionary['errors']
}) {
  const router = useRouter()
  const [messages, setMessages] = useState(initial)
  const [error, setError] = useState<ErrorCode | null>(null)
  const [sending, start] = useTransition()
  const list = useRef<HTMLOListElement>(null)
  const unreadFromOther = messages.some(message => message.sender_id !== userId && !message.read_at)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`demande:${bookingId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` }, payload => {
        if (payload.eventType === 'DELETE') return
        const { id, sender_id, body, created_at, read_at } = payload.new as Message
        setMessages(current => upsert(current, { id, sender_id, body, created_at, read_at }))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` }, () => router.refresh())
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [bookingId, router])

  // Lu dès qu'il est affiché sur un écran visible ; sinon au retour sur l'onglet.
  useEffect(() => {
    if (!unreadFromOther) return
    const mark = () => {
      if (document.visibilityState === 'visible') void markMessagesRead(bookingId)
    }
    mark()
    document.addEventListener('visibilitychange', mark)
    return () => document.removeEventListener('visibilitychange', mark)
  }, [bookingId, unreadFromOther])

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight })
  }, [messages.length])

  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const body = String(new FormData(form).get('body') ?? '').trim()
    if (!body) return
    start(async () => {
      setError(null)
      const result = await sendMessage(bookingId, body)
      if (result.error) return setError(result.error)
      if (result.message) setMessages(current => upsert(current, result.message!))
      form.reset()
    })
  }

  const locale = lang === 'ar' ? 'ar-DZ' : 'fr-DZ'
  // Jour en Algérie, le même au rendu serveur et dans le navigateur.
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' })
  const today = day.format(new Date())
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Africa/Algiers' })
  const dateTime = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Africa/Algiers' })
  const lastOwn = [...messages].reverse().find(message => message.sender_id === userId)

  return (
    <section aria-labelledby="conversation" className="flex max-w-[680px] flex-col gap-4">
      <h2 id="conversation" className="text-xl font-semibold tracking-[-0.01em]">
        {t.chatTitle}
      </h2>

      {messages.length === 0 ? (
        <p className="text-body">{t.chatEmpty}</p>
      ) : (
        <ol ref={list} role="log" className="flex max-h-[60vh] flex-col gap-2.5 overflow-y-auto rounded-[28px] bg-mist p-3 sm:p-4">
          {messages.map(message => {
            const own = message.sender_id === userId
            const sent = new Date(message.created_at)
            return (
              <li key={message.id} className={`flex max-w-[85%] flex-col gap-1 ${own ? 'items-end self-end' : 'items-start self-start'}`}>
                {/* Chaque message prend le sens de sa propre langue : un message en français reste lisible dans la page en arabe. */}
                <p dir="auto" className={`rounded-[22px] px-4 py-2.5 leading-relaxed whitespace-pre-line [overflow-wrap:anywhere] ${own ? 'bg-ink text-paper' : 'bg-paper'}`}>
                  {message.body}
                </p>
                <span className="flex gap-2 px-2 text-[13px] text-muted">
                  <span>{(day.format(sent) === today ? time : dateTime).format(sent)}</span>
                  {own && message.id === lastOwn?.id && message.read_at && <span>{t.chatSeen}</span>}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      {closed ? (
        <p className="rounded-[20px] border border-line px-5 py-3.5 text-body">{errors.conversation_closed}</p>
      ) : (
        <form onSubmit={send} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="sr-only">{t.chatLabel}</span>
            <textarea
              name="body"
              required
              maxLength={2000}
              rows={3}
              placeholder={t.chatLabel}
              className="min-h-[60px] w-full rounded-[22px] bg-mist px-5 py-4 text-lg leading-relaxed"
            />
          </label>
          {error && (
            <p role="alert" className={ALERT}>
              {errors[error]}
            </p>
          )}
          <button
            type="submit"
            disabled={sending}
            className="inline-flex min-h-14 cursor-pointer items-center justify-center self-start rounded-full bg-ink px-7 font-semibold text-paper transition-colors hover:bg-accent hover:text-ink disabled:cursor-wait disabled:opacity-60"
          >
            {t.chatSend}
          </button>
        </form>
      )}
    </section>
  )
}
