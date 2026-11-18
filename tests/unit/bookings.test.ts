import { expect, it } from 'vitest'
import { dayToTimestamp } from '@/domain/bookings'

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
