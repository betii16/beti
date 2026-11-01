// Parcours complet client <-> artisan contre le projet Supabase de TEST.
// Deux contextes de navigateur (client, artisan), sessions injectees sans SMS.
import {
  test, expect, admin, anonClient, createTestUser, signInAndGetSession, injectSession,
  seedArtisan, RUN_ID,
} from './fixtures'

test('parcours complet : recherche, reservation, chat, mission, avis, facture, suppression de compte', async ({ browser, world }) => {
  void world // garantit le cleanup apres le test, meme en cas d'echec
  const artisanName = `Plombier QA ${RUN_ID}`
  const client = await createTestUser('client', { fullName: `Client QA ${RUN_ID}` })
  const artisan = await createTestUser('artisan', { fullName: artisanName })
  await seedArtisan(artisan, { hourly_rate: 3000 })
  const clientSession = await signInAndGetSession(client)
  const artisanSession = await signInAndGetSession(artisan)

  const clientCtx = await browser.newContext()
  const artisanCtx = await browser.newContext()
  try {
    await injectSession(clientCtx, clientSession)
    await injectSession(artisanCtx, artisanSession)
    const cp = await clientCtx.newPage()
    const ap = await artisanCtx.newPage()

    // 1. Le client cherche et ouvre la fiche.
    await cp.goto('/recherche')
    const card = cp.getByText(artisanName).first()
    await expect(card, 'artisan seede absent de la recherche : RPC get_nearby_artisans manquante sur le projet de test (hors depot SQL) ou fiche non visible').toBeVisible({ timeout: 45_000 })
    await card.click()
    await cp.waitForURL(`**/artisan/${artisan.id}`)

    // 2. Reservation via le tunnel BookingFlow.
    await cp.getByRole('button', { name: 'Envoyer un message' }).first().click()
    const dialog = cp.getByRole('dialog')
    await dialog.getByPlaceholder(/fuite sous/i).fill('Fuite sous evier, urgence QA')
    await dialog.getByRole('button', { name: 'Continuer', exact: true }).click()
    await dialog.getByRole('button', { name: 'Continuer', exact: true }).click() // quand : « Dès que possible » par defaut
    await dialog.getByPlaceholder(/quartier, rue/i).fill('Rue Didouche Mourad, Alger')
    await dialog.getByRole('button', { name: /Envoyer la demande/ }).click()
    await cp.waitForURL(/\/chat\/[0-9a-f-]{36}/)
    const bookingId = cp.url().match(/\/chat\/([0-9a-f-]{36})/)![1]

    const { data: b1 } = await admin.from('bookings').select('client_id, artisan_id, status, price_agreed').eq('id', bookingId).single()
    expect(b1).toMatchObject({ client_id: client.id, artisan_id: artisan.id, status: 'pending', price_agreed: 3000 })

    // 3. L'artisan accepte depuis son tableau de bord.
    await ap.goto('/artisan-dashboard')
    await ap.getByRole('button', { name: 'Accepter', exact: true }).first().click()
    await expect.poll(async () => (await admin.from('bookings').select('status').eq('id', bookingId).single()).data?.status).toBe('confirmed')

    // 4. Chat bidirectionnel (realtime ; repli par rechargement signale en annotation).
    await ap.goto(`/chat/${bookingId}`)
    await cp.goto(`/chat/${bookingId}`)
    const box = (p: typeof cp) => p.getByPlaceholder('Écrire un message...')
    await box(cp).fill('Bonjour, vous venez quand ?')
    await box(cp).press('Enter')
    await expect(ap.getByText('Bonjour, vous venez quand ?').first()).toBeVisible({ timeout: 15_000 }).catch(async () => {
      test.info().annotations.push({ type: 'realtime', description: 'message non recu en direct par l\'artisan : realtime inactif sur messages ?' })
      await ap.reload()
      await expect(ap.getByText('Bonjour, vous venez quand ?').first()).toBeVisible()
    })
    await box(ap).fill('Je passe dans une heure.')
    await box(ap).press('Enter')
    await expect.poll(async () => (await admin.from('messages').select('id').eq('booking_id', bookingId).eq('sender_id', artisan.id)).data?.length ?? 0).toBeGreaterThan(0)

    // 5. Mission terminee : l'artisan signale, le client confirme.
    await ap.getByRole('button', { name: 'Marquer terminé' }).click()
    await expect.poll(async () => (await admin.from('bookings').select('status').eq('id', bookingId).single()).data?.status).toBe('in_progress')
    await cp.reload()
    await cp.getByRole('button', { name: 'Confirmer la prestation' }).click()
    await expect.poll(async () => (await admin.from('bookings').select('status').eq('id', bookingId).single()).data?.status).toBe('completed')

    // 6. Avis du client.
    await cp.goto(`/mon-espace/avis?booking=${bookingId}`)
    await cp.getByRole('radio', { name: '5/5' }).click()
    await cp.locator('textarea').first().fill('Travail propre et rapide (avis de test).')
    await cp.getByRole('button', { name: /Publier l.avis/ }).click()
    await expect(cp.getByText(/avis a été publié/i)).toBeVisible()
    const { data: rv } = await admin.from('reviews').select('rating, client_id, artisan_id').eq('booking_id', bookingId).single()
    expect(rv).toMatchObject({ rating: 5, client_id: client.id, artisan_id: artisan.id })

    // 7. Facture : total = tarif convenu (3000 DA) x 1 h, sans frais de deplacement.
    await cp.goto(`/facture/${bookingId}`)
    await expect(cp.locator('.inv-total-final .amount')).toContainText(/^3[\s  .,]?000\s*DA$/)

    // 8. Suppression de compte reelle via l'API (jeton du client).
    const res = await cp.request.post('/api/account/delete', { headers: { Authorization: `Bearer ${clientSession.access_token}` } })
    expect(res.status(), 'API de suppression : SUPABASE_SERVICE_ROLE_KEY du projet de test valide ?').toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    const { error: loginErr } = await anonClient().auth.signInWithPassword({ email: client.email, password: client.password })
    expect(loginErr, 'le compte supprime ne doit plus pouvoir se connecter').not.toBeNull()
  } finally {
    await clientCtx.close()
    await artisanCtx.close()
  }
})
