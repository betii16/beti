import { test, expect, mockSupabase, watchErrors, expectNoHorizontalOverflow, ARTISANS } from './helpers'

test.describe('accueil', () => {
  test('titre, deux CTA, cartes de métiers, clic filtre', async ({ page }) => {
    const errors = watchErrors(page)
    const { rpcCalls } = await mockSupabase(page, { rpc: ARTISANS })
    await page.goto('/')
    await expect(page).toHaveTitle(/BETI/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Trouver un artisan' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Je suis artisan' }).first()).toBeVisible()

    const card = page.locator('#services').getByRole('button', { name: /Plomberie/ }).first()
    await expect(card).toBeVisible()
    await expect(card).toHaveAttribute('aria-pressed', 'false')
    await card.click()
    await expect(card).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => rpcCalls.some(c => c.category_filter === 'plomberie')).toBe(true)
    expect(errors).toEqual([])
  })
})

test.describe('recherche', () => {
  test('liste, puis tri par note réordonne', async ({ page }) => {
    const errors = watchErrors(page)
    await mockSupabase(page, { rpc: ARTISANS })
    await page.goto('/recherche')
    const names = page.locator('main, body').getByText(/Karim Plombier|Samir Electricien|Yacine Peintre/)
    await expect(names).toHaveCount(3)
    // tri par défaut : distance (Samir 3 km, Karim 12, Yacine 25)
    const order = async () => (await names.allTextContents()).map(s => s.split(' ')[0])
    expect(await order()).toEqual(['Samir', 'Karim', 'Yacine'])
    await page.getByRole('button', { name: 'Mieux notés' }).click()
    await expect.poll(order).toEqual(['Samir', 'Yacine', 'Karim'])
    await page.getByRole('button', { name: 'Prix ↓' }).click()
    await expect.poll(order).toEqual(['Karim', 'Yacine', 'Samir'])
    expect(errors).toEqual([])
  })

  test('aucun résultat : état vide', async ({ page }) => {
    await mockSupabase(page, { rpc: [] })
    await page.goto('/recherche')
    await expect(page.getByText('Aucun artisan trouvé')).toBeVisible()
  })

  test('erreur réseau : message puis Réessayer recharge les résultats', async ({ page }) => {
    let fail = true
    await mockSupabase(page)
    await page.route('**/rpc/get_nearby_artisans', route =>
      fail
        ? route.fulfill({ status: 500, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"message":"boom"}' })
        : route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(ARTISANS) }))
    await page.goto('/recherche')
    await expect(page.locator('.empty-state[role=alert]')).toContainText('Impossible de charger les artisans')
    fail = false
    await page.getByRole('button', { name: 'Réessayer' }).click()
    await expect(page.getByText('Samir Electricien')).toBeVisible()
    await expect(page.locator('.empty-state[role=alert]')).toHaveCount(0)
  })
})

test.describe('carte', () => {
  test('sans artisan : état vide avec lien Je suis artisan, sans erreur de page', async ({ page }) => {
    const errors = watchErrors(page)
    await mockSupabase(page, { artisansTable: [] })
    await page.goto('/map')
    const link = page.getByRole('link', { name: 'Je suis artisan' })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/auth/signup?role=artisan')
    expect(errors).toEqual([])
  })
})

test.describe('404', () => {
  test('traduite en arabe', async ({ page }) => {
    await mockSupabase(page)
    await page.addInitScript(() => localStorage.setItem('beti-lang', 'ar'))
    await page.goto('/cette-page-nexiste-pas')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('هذه الصفحة غير موجودة')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await expect(page.getByRole('link', { name: 'العودة إلى الرئيسية' })).toBeVisible()
  })
  test('en français par défaut', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('/cette-page-nexiste-pas')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Cette page n'existe pas")
  })
})

test.describe('mobile 390 px : pas de débordement horizontal ni d’erreur console', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  for (const path of ['/', '/recherche', '/map', '/auth/login', '/cette-page-nexiste-pas']) {
    test(path, async ({ page }) => {
      const errors = watchErrors(page)
      await mockSupabase(page, { rpc: ARTISANS })
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expectNoHorizontalOverflow(page)
      expect(errors).toEqual([])
    })
  }
})
