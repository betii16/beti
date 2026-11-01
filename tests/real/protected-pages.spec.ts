// Pages protegees sans session : redirection vers /auth/login (avec ?next quand le code le prevoit).
// Rappel : ces redirections sont de l'affichage ; la vraie barriere est le RLS (security.spec.ts).
import { test, expect, createTestUser, signInAndGetSession, injectSession } from './fixtures'

const ID = '00000000-0000-4000-8000-000000000001'

// next: true = la page doit transmettre ?next ; false = comportement actuel du code (pas de next),
// signale ici pour que l'ajout futur de ?next soit visible. Le test echoue si la redirection saute.
const PAGES: { path: string; next: boolean }[] = [
  { path: '/mon-espace', next: true },
  { path: '/mon-espace/reservations', next: true },
  { path: `/mon-espace/avis?booking=${ID}`, next: true },
  { path: '/notifications', next: true },
  { path: '/parametres', next: true },
  { path: '/compte/parametres', next: true },
  { path: '/map', next: true },
  { path: `/chat/${ID}`, next: true },
  { path: `/facture/${ID}`, next: true },
  { path: '/admin', next: false },
  { path: '/artisan-dashboard', next: false },
  { path: '/artisan-dashboard/profil', next: false },
  { path: '/artisan-dashboard/revenus', next: false },
  { path: '/artisan-dashboard/planning', next: false },
  { path: '/artisan-dashboard/abonnement', next: false },
]

test.describe('pages protegees sans session', () => {
  for (const { path, next } of PAGES) {
    test(`${path} renvoie vers la connexion`, async ({ page }) => {
      await page.goto(path)
      await page.waitForURL(/\/auth\/login/, { timeout: 30_000 })
      const u = new URL(page.url())
      expect(u.pathname).toBe('/auth/login')
      if (next) {
        const target = u.searchParams.get('next')
        expect(target, 'le parametre ?next doit etre conserve').toBe(new URL(path, u.origin).pathname)
      }
    })
  }

  test('temoin : une page publique ne redirige pas', async ({ page }) => {
    await page.goto('/recherche')
    await page.waitForTimeout(2000)
    expect(new URL(page.url()).pathname).toBe('/recherche')
  })
})

test.describe('/admin selon le role', () => {
  test('un client connecte est renvoye hors de /admin', async ({ browser, world }) => {
    void world
    const user = await createTestUser('client')
    const ctx = await browser.newContext()
    await injectSession(ctx, await signInAndGetSession(user))
    const page = await ctx.newPage()
    await page.goto('/admin')
    await page.waitForURL(u => u.pathname !== '/admin', { timeout: 30_000 })
    await ctx.close()
  })

  test('temoin : un admin promu par la cle service reste sur /admin', async ({ browser, world }) => {
    void world
    const user = await createTestUser('admin')
    const ctx = await browser.newContext()
    await injectSession(ctx, await signInAndGetSession(user))
    const page = await ctx.newPage()
    await page.goto('/admin')
    await page.waitForTimeout(4000)
    expect(new URL(page.url()).pathname, 'le compte admin promu doit acceder a /admin').toBe('/admin')
    await ctx.close()
  })
})
