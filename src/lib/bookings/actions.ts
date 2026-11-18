'use server'

// Envoi d'une demande à un artisan. Point d'entrée public : la base revérifie
// tout (qui appelle, artisan visible, longueurs, limites), cette action ne fait
// que mettre en forme et rendre à l'écran ce qui a été saisi en cas de refus.

import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { dayToTimestamp } from '@/domain/bookings'
import { href } from '@/i18n/config'
import { errorCode, type ErrorCode } from '@/lib/errors'
import { field, localeOf } from '@/lib/form'
import { saveFullName } from '@/lib/profile'
import { createClient } from '@/lib/supabase/server'

export type UpdateState = { error?: ErrorCode }

/**
 * Fait avancer une demande : accepter, décliner, annuler, déclarer la fin,
 * confirmer la fin. Chaque fonction SQL vérifie elle-même qui appelle et si
 * l'état le permet ; une demande qui a changé entre-temps revient en « invalid_transition ».
 */
export async function updateBooking(_previous: UpdateState, formData: FormData): Promise<UpdateState> {
  const booking = field(formData, 'booking')
  if (!z.uuid().safeParse(booking).success) return { error: 'not_found' }
  const supabase = await createClient()
  const action = field(formData, 'do')

  let error: unknown = null
  if (action === 'accept' || action === 'decline') {
    const price = field(formData, 'price').replace(/\s+/g, '')
    if (price && !/^\d{1,9}$/.test(price)) return { error: 'invalid_input' }
    ;({ error } = await supabase.rpc('respond_booking', {
      p_booking_id: booking,
      p_accept: action === 'accept',
      p_quoted_price: action === 'accept' && price ? Number(price) : undefined,
    }))
  } else if (action === 'cancel') {
    ;({ error } = await supabase.rpc('cancel_booking', { p_booking_id: booking, p_reason: field(formData, 'reason') }))
  } else if (action === 'finish') {
    ;({ error } = await supabase.rpc('finish_booking', { p_booking_id: booking }))
  } else if (action === 'complete') {
    ;({ error } = await supabase.rpc('complete_booking', { p_booking_id: booking }))
  } else {
    return { error: 'invalid_input' }
  }
  if (error) return { error: errorCode(error) }
  refresh()
  return {}
}

const FIELDS = ['name', 'description', 'wilaya', 'commune', 'address', 'date', 'urgent'] as const
type Values = Record<(typeof FIELDS)[number], string>

export type BookingState = { error?: ErrorCode; values?: Values }

export async function createBooking(_previous: BookingState, formData: FormData): Promise<BookingState> {
  const values = Object.fromEntries(FIELDS.map(name => [name, field(formData, name)])) as Values
  // En cas de refus, la saisie revient à l'écran : personne ne retape sa description.
  const fail = (error: ErrorCode): BookingState => ({ error, values })

  const artisan = field(formData, 'artisan')
  if (!z.uuid().safeParse(artisan).success) return fail('not_found')
  const scheduledFor = values.date ? dayToTimestamp(values.date) : undefined
  if (scheduledFor === null) return fail('invalid_date')

  // Le nom n'est demandé qu'à la première demande ; l'artisan le voit avec elle.
  if (formData.has('name')) {
    const nameError = await saveFullName(values.name)
    if (nameError) return fail(nameError)
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('create_booking', {
    p_artisan_id: artisan,
    p_description: values.description,
    p_wilaya_code: Number(values.wilaya),
    p_commune: values.commune,
    p_address: values.address,
    p_scheduled_for: scheduledFor,
    p_is_urgent: values.urgent === 'on',
  })
  if (error) return fail(errorCode(error))

  redirect(`${href(localeOf(formData), '/demandes')}?envoyee=1`)
}
