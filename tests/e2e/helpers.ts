import { test as base, expect, type Page, type Route } from '@playwright/test'

export const ARTISANS = [
  { artisan_id: 'a1', full_name: 'Karim Plombier', avatar_url: null, category: 'plomberie', rating_avg: 3.5, rating_count: 4, hourly_rate: 3000, distance_km: 12, is_available: true, total_missions: 10, bio: 'Fuites et sanitaires' },
  { artisan_id: 'a2', full_name: 'Samir Electricien', avatar_url: null, category: 'electricite', rating_avg: 4.9, rating_count: 30, hourly_rate: 1500, distance_km: 3, is_available: true, total_missions: 80, bio: 'Installations' },
  { artisan_id: 'a3', full_name: 'Yacine Peintre', avatar_url: null, category: 'peinture', rating_avg: 4.2, rating_count: 9, hourly_rate: 2200, distance_km: 25, is_available: false, total_missions: 20, bio: 'Peinture interieure' },
]

export interface MockOptions {
  /** Résultat de la RPC get_nearby_artisans ; 'error' = réponse 500. */
  rpc?: unknown[] | 'error'
  /** Lignes de la table artisans (carte). */
  artisansTable?: unknown[]
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })

/** Simule Supabase (http://localhost:54321) et coupe tout accès réseau externe. */
export async function mockSupabase(page: Page, opts: MockOptions = {}) {
  const rpcCalls: Record<string, unknown>[] = []
  await page.route('http://localhost:54321/**', async route => {
    const req = route.request()
    const url = new URL(req.url())
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
    if (url.pathname.endsWith('/rpc/get_nearby_artisans')) {
      rpcCalls.push(req.postDataJSON() ?? {})
      if (opts.rpc === 'error') return json(route, { message: 'boom' }, 500)
      return json(route, opts.rpc ?? [])
    }
    if (url.pathname.endsWith('/rest/v1/artisans')) return json(route, opts.artisansTable ?? [])
    if (url.pathname.startsWith('/rest/v1/')) return json(route, [])
    return json(route, {})
  })
  // Aucun accès externe (tuiles de carte, polices, OSRM...) : réponse vide immédiate.
  await page.route(u => !/^(http:\/\/localhost|data:|blob:)/.test(u.href), route => route.fulfill({ status: 204, body: '' }))
  return { rpcCalls }
}

/** Collecte les erreurs console / de page inattendues. */
export function watchErrors(page: Page) {
  const errors: string[] = []
  const ignorable = /Failed to load resource|net::ERR|WebGL|maplibre|favicon|Download the React DevTools|Fast Refresh|\[HMR\]/i
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
  page.on('console', m => { if (m.type() === 'error' && !ignorable.test(m.text())) errors.push(`console: ${m.text()}`) })
  return errors
}

export async function expectNoHorizontalOverflow(page: Page) {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  expect(o.sw, `scrollWidth ${o.sw} > clientWidth ${o.cw}`).toBeLessThanOrEqual(o.cw)
}

export const test = base
export { expect }
