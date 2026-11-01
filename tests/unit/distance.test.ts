import { describe, it, expect } from 'vitest'
import { haversineKm } from '@/lib/distance'

describe('haversineKm', () => {
  it('0 pour le même point', () => expect(haversineKm(36.75, 3.06, 36.75, 3.06)).toBe(0))
  it('Alger - Oran environ 355 km', () => {
    const d = haversineKm(36.7538, 3.0588, 35.6971, -0.6308)
    expect(d).toBeGreaterThan(340)
    expect(d).toBeLessThan(365)
  })
  it('symétrique', () => {
    expect(haversineKm(36, 3, 35, -1)).toBe(haversineKm(35, -1, 36, 3))
  })
  it('1 degré de latitude = 111,2 km, arrondi au dixième', () => {
    expect(haversineKm(0, 0, 1, 0)).toBe(111.2)
  })
  it('traverse l’antiméridien', () => {
    expect(haversineKm(0, 179.5, 0, -179.5)).toBe(111.2)
  })
})
