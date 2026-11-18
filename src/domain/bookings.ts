// Demandes d'un client à un artisan.

import type { Database } from '@/lib/supabase/database.types'

export type BookingStatus = Database['public']['Tables']['bookings']['Row']['status']

/** États d'une demande « en cours » : create_booking n'en ouvre pas une seconde avec le même artisan. */
export const OPEN_STATUSES = ['pending', 'accepted', 'finished'] as const satisfies readonly BookingStatus[]

/**
 * Jour choisi dans le formulaire (AAAA-MM-JJ) → instant enregistré : la fin de ce
 * jour à l'heure d'Algérie (UTC+1 toute l'année). La fin de journée, pour
 * qu'« aujourd'hui » reste une date à venir quelle que soit l'heure d'envoi.
 * null si ce n'est pas une date qui existe.
 */
export function dayToTimestamp(day: string): string | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!parts) return null
  const [year, month, date] = [Number(parts[1]), Number(parts[2]), Number(parts[3])]
  // Date() corrige en silence un 30 février en 2 mars : on vérifie que rien n'a bougé.
  const check = new Date(Date.UTC(year, month - 1, date))
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== date) return null
  return `${day}T23:59:59+01:00`
}
