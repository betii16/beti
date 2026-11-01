import { test, expect, mockSupabase, watchErrors } from './helpers'
import type { Page } from '@playwright/test'

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.sig`
const user = { id: 'u1', aud: 'authenticated', role: 'authenticated', phone: '213555123456', app_metadata: {}, user_metadata: {}, created_at: '2024-01-01T00:00:00Z' }

async function mockAuth(page: Page) {
  const cors = { 'access-control-allow-origin': '*' }
  await page.route('http://localhost:54321/auth/v1/otp', r => r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '{}' }))
  await page.route('http://localhost:54321/auth/v1/verify', r =>
    r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user }) }))
  await page.route('http://localhost:54321/auth/v1/user', r => r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(user) }))
}

async function login(page: Page) {
  await page.getByLabel('Numéro de téléphone').fill('555123456')
  await page.getByRole('button', { name: /recevoir le code/i }).click()
  await page.getByLabel(/code/i).first().fill('123456') // validation automatique à 6 chiffres
}

test('connexion sans numéro : bouton désactivé avec indication', async ({ page }) => {
  const errors = watchErrors(page)
  await mockSupabase(page)
  await page.goto('/auth/login')
  const btn = page.getByRole('button', { name: /recevoir le code/i })
  await expect(btn).toBeDisabled()
  await expect(page.getByRole('status').filter({ hasText: /\S/ }).first()).toBeVisible()
  await page.getByLabel('Numéro de téléphone').fill('55512')
  await expect(btn).toBeDisabled()
  await page.getByLabel('Numéro de téléphone').fill('555123')
  await expect(btn).toBeEnabled()
  expect(errors).toEqual([])
})

test('?next=/map : redirection interne après connexion', async ({ page }) => {
  await mockSupabase(page)
  await mockAuth(page)
  await page.goto('/auth/login?next=/map')
  await login(page)
  await page.waitForURL('**/map')
  expect(new URL(page.url()).origin).toBe('http://localhost:3100')
})

for (const evil of ['https://evil.com', '//evil.com', '/\\evil.com']) {
  test(`?next=${evil} : ne sort jamais du site`, async ({ page }) => {
    const external: string[] = []
    page.on('request', r => { if (r.isNavigationRequest() && !r.url().startsWith('http://localhost')) external.push(r.url()) })
    await mockSupabase(page)
    await mockAuth(page)
    await page.goto('/auth/login?next=' + encodeURIComponent(evil))
    await login(page)
    // Sans next valide : retour à l'espace client (profil moqué vide -> /mon-espace)
    await page.waitForURL(u => !u.pathname.startsWith('/auth/login'))
    expect(new URL(page.url()).origin).toBe('http://localhost:3100')
    expect(external).toEqual([])
  })
}

test('page protégée sans session : redirige vers la connexion avec ?next', async ({ page }) => {
  await mockSupabase(page)
  await page.goto('/mon-espace')
  await page.waitForURL(/\/auth\/login\?next=%2Fmon-espace/)
  await expect(page.getByRole('button', { name: /recevoir le code/i })).toBeVisible()
})
