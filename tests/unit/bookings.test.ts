import { expect, it } from 'vitest'
import { bookingActions, canReview, conversationClosed, dayToTimestamp } from '@/domain/bookings'

it('n’offre à chacun que les actions que la base acceptera', () => {
  expect(bookingActions('artisan', 'pending')).toEqual(['accept', 'decline'])
  expect(bookingActions('artisan', 'accepted')).toEqual(['finish', 'cancel'])
  expect(bookingActions('client', 'pending')).toEqual(['cancel'])
  expect(bookingActions('client', 'accepted')).toEqual(['cancel'])
  expect(bookingActions('client', 'finished')).toEqual(['complete'])
  // Une fois le travail déclaré terminé, l'artisan attend ; une demande close ne bouge plus.
  expect(bookingActions('artisan', 'finished')).toEqual([])
  for (const closed of ['declined', 'cancelled', 'completed'] as const) {
    expect(bookingActions('client', closed)).toEqual([])
    expect(bookingActions('artisan', closed)).toEqual([])
  }
})

it('transforme le jour choisi en fin de journée, heure d’Algérie', () => {
  expect(dayToTimestamp('2026-11-21')).toBe('2026-11-21T23:59:59+01:00')
  // 23 h 59 à Alger, c'est encore le même jour là-bas, et 22 h 59 en temps universel.
  expect(new Date(dayToTimestamp('2026-11-21')!).toISOString()).toBe('2026-11-21T22:59:59.000Z')
  expect(dayToTimestamp('2028-02-29')).toBe('2028-02-29T23:59:59+01:00')
})

it('refuse ce qui n’est pas une date qui existe', () => {
  for (const bad of ['', '21/11/2026', '2026-11-21T10:00', '2026-13-01', '2026-02-30', '2027-02-29', '2026-00-10', "2026-11-21'; drop table bookings"]) {
    expect(dayToTimestamp(bad), bad).toBeNull()
  }
})

it('ferme la conversation comme send_message', () => {
  const now = Date.parse('2026-11-20T12:00:00Z')
  expect(conversationClosed('pending', null, now)).toBe(false)
  expect(conversationClosed('accepted', null, now)).toBe(false)
  expect(conversationClosed('declined', null, now)).toBe(true)
  expect(conversationClosed('cancelled', null, now)).toBe(true)
  expect(conversationClosed('completed', '2026-11-15T12:00:00Z', now)).toBe(false)
  expect(conversationClosed('completed', '2026-11-12T12:00:00Z', now)).toBe(true)
})

it('n’ouvre l’avis que sur une demande terminée depuis 60 jours au plus', () => {
  const now = Date.parse('2026-11-20T12:00:00Z')
  expect(canReview('completed', '2026-11-19T12:00:00Z', now)).toBe(true)
  expect(canReview('completed', '2026-09-22T12:00:00Z', now)).toBe(true)
  expect(canReview('completed', '2026-09-20T12:00:00Z', now)).toBe(false)
  expect(canReview('finished', null, now)).toBe(false)
  expect(canReview('completed', null, now)).toBe(false)
})
