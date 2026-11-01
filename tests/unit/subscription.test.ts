import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

async function load(launch: string) {
  vi.resetModules()
  process.env.NEXT_PUBLIC_LAUNCH_DATE = launch
  return import('@/lib/subscription')
}
const past = new Date(Date.now() - 86400_000).toISOString()
const future = new Date(Date.now() + 86400_000).toISOString()
const LONG_AGO = '2020-01-01T00:00:00Z'

afterEach(() => { delete process.env.NEXT_PUBLIC_LAUNCH_DATE })

describe('effectivePlan / isPremium', () => {
  it('null, vide, free -> free', async () => {
    const s = await load(LONG_AGO)
    expect(s.effectivePlan(null)).toBe('free')
    expect(s.effectivePlan({})).toBe('free')
    expect(s.effectivePlan({ plan: 'free' })).toBe('free')
  })
  it('plan valide sans échéance ou avec échéance future', async () => {
    const s = await load(LONG_AGO)
    expect(s.effectivePlan({ plan: 'premium' })).toBe('premium')
    expect(s.effectivePlan({ plan: 'basic', plan_until: future })).toBe('basic')
  })
  it('plan expiré -> free', async () => {
    const s = await load(LONG_AGO)
    expect(s.effectivePlan({ plan: 'premium', plan_until: past })).toBe('free')
    expect(s.isPremium({ plan: 'premium', plan_until: past })).toBe(false)
    expect(s.isPremium({ plan: 'premium', plan_until: future })).toBe(true)
  })
  it('valeur inconnue -> basic', async () => {
    const s = await load(LONG_AGO)
    expect(s.effectivePlan({ plan: 'gold' })).toBe('basic')
  })
})

describe('isListed', () => {
  it('lancement gratuit en cours : tout le monde est listé', async () => {
    const s = await load(new Date().toISOString())
    expect(s.isListed({ plan: 'free' })).toBe(true)
    expect(s.isListed(null)).toBe(true)
  })
  describe('après le lancement', () => {
    let s: typeof import('@/lib/subscription')
    beforeEach(async () => { s = await load(LONG_AGO) })
    it('free / null / expiré : masqué', () => {
      expect(s.isListed({ plan: 'free' })).toBe(false)
      expect(s.isListed(null)).toBe(false)
      expect(s.isListed({ plan: 'basic', plan_until: past })).toBe(false)
    })
    it('abonné valide : listé', () => {
      expect(s.isListed({ plan: 'basic', plan_until: future })).toBe(true)
      expect(s.isListed({ plan: 'premium' })).toBe(true)
    })
  })
})
