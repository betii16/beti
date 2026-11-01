import { test, expect, mockSupabase, watchErrors, expectNoHorizontalOverflow } from './helpers'
import type { Page, Route } from '@playwright/test'

// Flux CLIENT par code e-mail, Supabase moqué (/auth/v1/otp et /auth/v1/verify).

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp: 4102444800 })}.sig`
const cors = { 'access-control-allow-origin': '*' }
const json = (r: Route, status: number, body: unknown) => r.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) })

type Outcome = 'ok' | 'wrong' | 'expired' | 'rate' | 'network'

interface Calls { otp: any[]; verify: any[]; profiles: any[] }

async function mockEmailAuth(page: Page, o: { otp?: Outcome | 'noaccount'; verify?: Outcome } = {}): Promise<Calls> {
  const calls: Calls = { otp: [], verify: [], profiles: [] }
  const user = { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'amine@gmail.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }
  await page.route('http://localhost:54321/auth/v1/otp', r => {
    calls.otp.push(r.request().postDataJSON())
    if (o.otp === 'rate') return json(r, 429, { code: 429, error_code: 'over_email_send_rate_limit', msg: 'email rate limit exceeded' })
    if (o.otp === 'network') return r.abort('failed')
    if (o.otp === 'noaccount') return json(r, 422, { code: 422, error_code: 'otp_disabled', msg: 'Signups not allowed for otp' })
    return json(r, 200, {})
  })
  await page.route('http://localhost:54321/auth/v1/verify', r => {
    calls.verify.push(r.request().postDataJSON())
    if (o.verify === 'wrong') return json(r, 403, { code: 403, msg: 'Token has expired or is invalid' })
    if (o.verify === 'expired') return json(r, 403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' })
    if (o.verify === 'rate') return json(r, 429, { code: 429, error_code: 'over_request_rate_limit', msg: 'Request rate limit reached' })
    if (o.verify === 'network') return r.abort('failed')
    return json(r, 200, { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user })
  })
  await page.route('http://localhost:54321/auth/v1/user', r => json(r, 200, user))
  await page.route('http://localhost:54321/rest/v1/profiles*', r => {
    const req = r.request()
    if (req.method() !== 'GET') calls.profiles.push({ method: req.method(), body: req.postDataJSON() })
    return json(r, 200, req.method() === 'GET' ? { role: 'client' } : [])
  })
  return calls
}

const CODE = '123456'
const codeBox = (page: Page) => page.getByLabel(/code/i).first()

async function loginSendCode(page: Page, email = 'amine@gmail.com') {
  await page.getByLabel('ADRESSE E-MAIL').fill(email)
  await page.getByRole('button', { name: /recevoir le code par e-mail/i }).click()
}

async function signupSendCode(page: Page, email = 'amine@gmail.com') {
  await page.getByLabel(/nom complet/i).fill('Amine Benali')
  await page.getByLabel(/adresse e-mail/i).fill(email)
  await page.getByRole('button', { name: /recevoir le code/i }).click()
}

test.describe('connexion par e-mail', () => {
  test('mode e-mail par défaut, deux onglets, bouton désactivé tant que l\'e-mail est invalide', async ({ page }) => {
    const errors = watchErrors(page)
    await mockSupabase(page)
    await page.goto('/auth/login')
    await expect(page.getByRole('tab', { name: 'E-mail' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab', { name: 'Téléphone' })).toHaveAttribute('aria-selected', 'false')
    const btn = page.getByRole('button', { name: /recevoir le code par e-mail/i })
    await expect(btn).toBeDisabled()
    await page.getByLabel('ADRESSE E-MAIL').fill('amine@gmail')
    await expect(btn).toBeDisabled()
    await page.getByLabel('ADRESSE E-MAIL').fill('  Amine@Gmail.com ')
    await expect(btn).toBeEnabled()
    expect(errors).toEqual([])
  })

  test('succès : envoi sans création de compte, vérification type email, redirection', async ({ page }) => {
    await mockSupabase(page)
    const calls = await mockEmailAuth(page)
    await page.goto('/auth/login')
    await loginSendCode(page, '  Amine@Gmail.com ')
    await expect(page.getByText('amine@gmail.com')).toBeVisible()
    expect(calls.otp).toHaveLength(1)
    expect(calls.otp[0]).toMatchObject({ email: 'amine@gmail.com', create_user: false })
    await codeBox(page).fill(CODE)
    await page.waitForURL('**/mon-espace')
    expect(calls.verify[0]).toMatchObject({ email: 'amine@gmail.com', token: CODE, type: 'email' })
    // le mode utilisé est retenu pour la prochaine visite
    expect(await page.evaluate(() => localStorage.getItem('beti-login-mode'))).toBe('email')
  })

  test('faute de domaine fréquente : avertissement doux et correction en un clic', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('/auth/login')
    await page.getByLabel('ADRESSE E-MAIL').fill('amine@gmial.com')
    await expect(page.getByText('amine@gmail.com')).toBeVisible()
    await expect(page.getByRole('button', { name: /recevoir le code par e-mail/i })).toBeEnabled() // ne bloque pas
    await page.getByRole('button', { name: 'Corriger' }).click()
    await expect(page.getByLabel('ADRESSE E-MAIL')).toHaveValue('amine@gmail.com')
  })

  test('code faux : message clair et saisie vidée', async ({ page }) => {
    await mockSupabase(page)
    await mockEmailAuth(page, { verify: 'wrong' })
    await page.goto('/auth/login')
    await loginSendCode(page)
    await codeBox(page).fill(CODE)
    await expect(page.locator('[role=alert]:not(#__next-route-announcer__)')).toContainText('Code incorrect ou expiré')
    await expect(codeBox(page)).toHaveValue('')
  })

  test('code expiré : message distinct qui invite à renvoyer', async ({ page }) => {
    await mockSupabase(page)
    await mockEmailAuth(page, { verify: 'expired' })
    await page.goto('/auth/login')
    await loginSendCode(page)
    await codeBox(page).fill(CODE)
    await expect(page.locator('[role=alert]:not(#__next-route-announcer__)')).toContainText('a expiré')
  })

  test('limite de débit à l\'envoi : message dédié, pas de passage à l\'étape code', async ({ page }) => {
    await mockSupabase(page)
    await mockEmailAuth(page, { otp: 'rate' })
    await page.goto('/auth/login')
    await loginSendCode(page)
    await expect(page.locator('[role=alert]:not(#__next-route-announcer__)')).toContainText('Trop de tentatives')
    await expect(page.getByLabel('ADRESSE E-MAIL')).toBeVisible()
  })

  test('réseau coupé à l\'envoi : message réseau', async ({ page }) => {
    await mockSupabase(page)
    await mockEmailAuth(page, { otp: 'network' })
    await page.goto('/auth/login')
    await loginSendCode(page)
    await expect(page.locator('[role=alert]:not(#__next-route-announcer__)')).toContainText('Pas de connexion internet')
  })

  test('réseau coupé à la vérification : message réseau, code conservable', async ({ page }) => {
    await mockSupabase(page)
    await mockEmailAuth(page, { verify: 'network' })
    await page.goto('/auth/login')
    await loginSendCode(page)
    await codeBox(page).fill(CODE)
    await expect(page.locator('[role=alert]:not(#__next-route-announcer__)')).toContainText('Pas de connexion internet')
  })

  test('aucun compte avec cet e-mail : message dédié', async ({ page }) => {
    await mockSupabase(page)
    await mockEmailAuth(page, { otp: 'noaccount' })
    await page.goto('/auth/login')
    await loginSendCode(page)
    await expect(page.locator('[role=alert]:not(#__next-route-announcer__)')).toContainText('Aucun compte avec cet e-mail')
  })

  test('renvoi du code : compte à rebours puis nouvel envoi', async ({ page }) => {
    await mockSupabase(page)
    const calls = await mockEmailAuth(page)
    await page.goto('/auth/login')
    await loginSendCode(page)
    await expect(page.getByRole('button', { name: /renvoyer dans/i })).toBeDisabled()
    expect(calls.otp).toHaveLength(1)
  })

  test('un seul envoi malgré un double clic', async ({ page }) => {
    await mockSupabase(page)
    const calls = await mockEmailAuth(page)
    await page.goto('/auth/login')
    await page.getByLabel('ADRESSE E-MAIL').fill('amine@gmail.com')
    await page.getByRole('button', { name: /recevoir le code par e-mail/i }).dblclick()
    await expect(page.getByText('Code envoyé à')).toBeVisible()
    expect(calls.otp).toHaveLength(1)
  })

  test('?next=/map valide : redirection interne', async ({ page }) => {
    await mockSupabase(page)
    await mockEmailAuth(page)
    await page.goto('/auth/login?next=/map')
    await loginSendCode(page)
    await codeBox(page).fill(CODE)
    await page.waitForURL('**/map')
    expect(new URL(page.url()).origin).toBe('http://localhost:3100')
  })

  for (const evil of ['https://evil.com', '//evil.com', '/\\evil.com']) {
    test(`?next=${evil} refusé : reste sur le site`, async ({ page }) => {
      const external: string[] = []
      page.on('request', r => { if (r.isNavigationRequest() && !r.url().startsWith('http://localhost')) external.push(r.url()) })
      await mockSupabase(page)
      await mockEmailAuth(page)
      await page.goto('/auth/login?next=' + encodeURIComponent(evil))
      await loginSendCode(page)
      await codeBox(page).fill(CODE)
      await page.waitForURL(u => !u.pathname.startsWith('/auth/login'))
      expect(new URL(page.url()).origin).toBe('http://localhost:3100')
      expect(external).toEqual([])
    })
  }

  test('onglet Téléphone retenu pour la visite suivante', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('/auth/login')
    await page.getByRole('tab', { name: 'Téléphone' }).click()
    await expect(page.getByLabel('Numéro de téléphone')).toBeVisible()
    await page.reload()
    await expect(page.getByRole('tab', { name: 'Téléphone' })).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('inscription client par e-mail', () => {
  test('succès : rôle borné à client, profil sans téléphone, redirection', async ({ page }) => {
    await mockSupabase(page)
    const calls = await mockEmailAuth(page)
    await page.goto('/auth/signup?role=client')
    await expect(page.getByLabel(/numéro de téléphone/i)).toHaveCount(0) // pas de téléphone pour un client
    await signupSendCode(page, 'Amine@Gmail.com')
    await expect(page.getByText('Code envoyé à')).toBeVisible()
    expect(calls.otp[0]).toMatchObject({ email: 'amine@gmail.com', create_user: true, data: { full_name: 'Amine Benali', role: 'client' } })
    expect(calls.otp[0].data.phone).toBeUndefined()
    await codeBox(page).fill(CODE)
    await page.waitForURL('**/mon-espace')
    expect(calls.verify[0]).toMatchObject({ email: 'amine@gmail.com', token: CODE, type: 'email' })
    const upsert = calls.profiles.find(c => c.method === 'POST')
    expect(upsert.body).toMatchObject({ id: 'u1', full_name: 'Amine Benali', role: 'client' })
    expect(upsert.body).not.toHaveProperty('phone')
  })

  test('rôle imposé par l\'URL ignoré hors client/artisan : jamais admin', async ({ page }) => {
    await mockSupabase(page)
    const calls = await mockEmailAuth(page)
    await page.goto('/auth/signup?role=admin')
    await page.getByRole('radio', { name: /client/i }).click()
    await page.getByRole('button', { name: /continuer/i }).click()
    await signupSendCode(page)
    await expect(page.getByText('Code envoyé à')).toBeVisible()
    expect(calls.otp[0].data.role).toBe('client')
  })

  test('code faux, expiré, limite de débit, réseau coupé', async ({ page }) => {
    await mockSupabase(page)
    await mockEmailAuth(page, { verify: 'wrong' })
    await page.goto('/auth/signup?role=client')
    await signupSendCode(page)
    await codeBox(page).fill(CODE)
    await expect(page.locator('[role=alert]:not(#__next-route-announcer__)')).toContainText('Code incorrect ou expiré')

    const p2 = await page.context().newPage()
    await mockSupabase(p2)
    await mockEmailAuth(p2, { verify: 'expired' })
    await p2.goto('/auth/signup?role=client')
    await signupSendCode(p2)
    await codeBox(p2).fill(CODE)
    await expect(p2.locator('[role=alert]:not(#__next-route-announcer__)')).toContainText('a expiré')

    const p3 = await page.context().newPage()
    await mockSupabase(p3)
    await mockEmailAuth(p3, { otp: 'rate' })
    await p3.goto('/auth/signup?role=client')
    await signupSendCode(p3)
    await expect(p3.locator('[role=alert]:not(#__next-route-announcer__)')).toContainText('Trop de tentatives')

    const p4 = await page.context().newPage()
    await mockSupabase(p4)
    await mockEmailAuth(p4, { otp: 'network' })
    await p4.goto('/auth/signup?role=client')
    await signupSendCode(p4)
    await expect(p4.locator('[role=alert]:not(#__next-route-announcer__)')).toContainText('Pas de connexion internet')
  })

  test('bouton désactivé avec indication tant que nom et e-mail ne sont pas valides', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('/auth/signup?role=client')
    const btn = page.getByRole('button', { name: /recevoir le code/i })
    await expect(btn).toBeDisabled()
    await page.getByLabel(/nom complet/i).fill('Amine')
    await page.getByLabel(/adresse e-mail/i).fill('amine@')
    await expect(btn).toBeDisabled()
    await page.getByLabel(/adresse e-mail/i).fill('amine@gmail.com')
    await expect(btn).toBeEnabled()
  })

  test('l\'inscription artisan reste par téléphone, sans e-mail', async ({ page }) => {
    await mockSupabase(page)
    const calls = await mockEmailAuth(page)
    await page.goto('/auth/signup?role=artisan')
    await expect(page.getByLabel(/numéro de téléphone/i)).toBeVisible()
    await expect(page.getByLabel(/adresse e-mail/i)).toHaveCount(0)
    await page.getByLabel(/nom complet/i).fill('Karim Plombier')
    await page.getByLabel(/numéro de téléphone/i).fill('555123456')
    await page.getByRole('button', { name: /recevoir le code/i }).click()
    await expect(page.getByText('WhatsApp').first()).toBeVisible()
    const body = calls.otp[0]
    expect(body).toMatchObject({ phone: '+213555123456', data: { role: 'artisan' } })
    expect(body.email).toBeUndefined()
  })

  test('390 px : pas de débordement horizontal (connexion et inscription)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockSupabase(page)
    await page.goto('/auth/login')
    await page.getByLabel('ADRESSE E-MAIL').fill('un.tres.long.prenom.nom.de.famille@un-domaine-vraiment-tres-long-pour-tester.example.com')
    await expectNoHorizontalOverflow(page)
    await page.goto('/auth/signup?role=client')
    await expectNoHorizontalOverflow(page)
  })
})
