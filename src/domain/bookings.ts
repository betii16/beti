// Demandes d'un client à un artisan.

import type { Database } from '@/lib/supabase/database.types'

export type BookingStatus = Database['public']['Tables']['bookings']['Row']['status']

/** États d'une demande « en cours » : create_booking n'en ouvre pas une seconde avec le même artisan. */
export const OPEN_STATUSES = ['pending', 'accepted', 'finished'] as const satisfies readonly BookingStatus[]

export type BookingRole = 'client' | 'artisan'
export type BookingAction = 'accept' | 'decline' | 'cancel' | 'finish' | 'complete'

/**
 * Ce que chacun peut faire d'une demande selon son état : le reflet exact des
 * fonctions SQL (respond_booking, cancel_booking, finish_booking, complete_booking).
 * L'écran s'en sert pour n'offrir que des boutons qui aboutiront ; la base, elle,
 * revérifie toujours.
 */
export function bookingActions(role: BookingRole, status: BookingStatus): BookingAction[] {
  if (role === 'artisan') {
    if (status === 'pending') return ['accept', 'decline']
    if (status === 'accepted') return ['finish', 'cancel']
    return []
  }
  if (status === 'pending' || status === 'accepted') return ['cancel']
  if (status === 'finished') return ['complete']
  return []
}

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

/** Reflet de send_message : plus de message sur une demande déclinée, annulée, ou terminée depuis plus de 7 jours. */
export function conversationClosed(status: BookingStatus, completedAt: string | null, now = Date.now()): boolean {
  if (status === 'declined' || status === 'cancelled') return true
  return status === 'completed' && completedAt !== null && now - Date.parse(completedAt) > 7 * 24 * 3600 * 1000
}
