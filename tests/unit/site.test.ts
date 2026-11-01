import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => { delete process.env.NEXT_PUBLIC_SITE_URL })
async function load(v?: string) {
  vi.resetModules()
  if (v === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
  else process.env.NEXT_PUBLIC_SITE_URL = v
  return (await import('@/lib/site')).SITE_URL
}

describe('SITE_URL', () => {
  it('valeur par défaut sans barre finale', async () => {
    expect(await load()).toMatch(/^https:\/\/.+[^/]$/)
  })
  it('retire les barres finales', async () => {
    expect(await load('https://beti.dz///')).toBe('https://beti.dz')
  })
  it('chaîne vide : repli par défaut', async () => {
    const def = await load()
    expect(await load('')).toBe(def)
  })
})
