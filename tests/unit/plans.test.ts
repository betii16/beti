import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PLANS, priceFor, yearlySavings, freeMonths } from '@/lib/plans'

describe('tarifs', () => {
  it('priceFor selon le cycle', () => {
    expect(priceFor(PLANS.basic, 'monthly')).toBe(2500)
    expect(priceFor(PLANS.basic, 'yearly')).toBe(20000)
    expect(priceFor(PLANS.premium, 'yearly')).toBe(50000)
  })
  it('yearlySavings', () => {
    expect(yearlySavings(PLANS.basic)).toBe(10000)
    expect(yearlySavings(PLANS.premium)).toBe(10000)
  })
  it('freeMonths arrondi', () => {
    expect(freeMonths(PLANS.basic)).toBe(4)
    expect(freeMonths(PLANS.premium)).toBe(2)
  })
  it('le tarif annuel est toujours inférieur à 12 mois', () => {
    for (const p of Object.values(PLANS)) expect(p.yearly).toBeLessThan(p.monthly * 12)
  })
})

describe('période de lancement', () => {
  const orig = process.env.NEXT_PUBLIC_LAUNCH_DATE
  beforeEach(() => { vi.resetModules() })
  afterEach(() => {
    if (orig === undefined) delete process.env.NEXT_PUBLIC_LAUNCH_DATE
    else process.env.NEXT_PUBLIC_LAUNCH_DATE = orig
  })

  it('date valide : gratuit jusqu’à +2 mois', async () => {
    process.env.NEXT_PUBLIC_LAUNCH_DATE = '2027-01-15T00:00:00Z'
    const m = await import('@/lib/plans')
    expect(m.LAUNCH_DATE.toISOString()).toBe('2027-01-15T00:00:00.000Z')
    expect(m.SUB_FREE_UNTIL.toISOString()).toBe('2027-03-15T00:00:00.000Z')
    expect(m.isLaunchFree(new Date('2027-03-14T23:59:59Z'))).toBe(true)
    expect(m.isLaunchFree(new Date('2027-03-15T00:00:00Z'))).toBe(false)
  })
  it('date invalide : repli sur 2026-07-01', async () => {
    process.env.NEXT_PUBLIC_LAUNCH_DATE = 'pas-une-date'
    const m = await import('@/lib/plans')
    expect(m.LAUNCH_DATE.toISOString()).toBe('2026-07-01T00:00:00.000Z')
    expect(m.isLaunchFree(new Date('2026-08-30T00:00:00Z'))).toBe(true)
    expect(m.isLaunchFree(new Date('2026-09-02T00:00:00Z'))).toBe(false)
  })
  it('date absente : même repli', async () => {
    delete process.env.NEXT_PUBLIC_LAUNCH_DATE
    const m = await import('@/lib/plans')
    expect(m.LAUNCH_DATE.toISOString()).toBe('2026-07-01T00:00:00.000Z')
  })
})
