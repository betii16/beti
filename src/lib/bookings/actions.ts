'use server'

// Envoi d'une demande à un artisan. Point d'entrée public : la base revérifie
// tout (qui appelle, artisan visible, longueurs, limites), cette action ne fait
// que mettre en forme et rendre à l'écran ce qui a été saisi en cas de refus.

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { dayToTimestamp } from '@/domain/bookings'
import { href } from '@/i18n/config'
import { errorCode, type ErrorCode } from '@/lib/errors'
import { field, localeOf } from '@/lib/form'
import { saveFullName } from '@/lib/profile'
import { createClient } from '@/lib/supabase/server'

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
