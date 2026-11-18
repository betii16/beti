// Demandes, conversation, coordonnées, avis : le parcours normal, puis les attaques.

import { beforeAll, describe, expect, it } from 'vitest'
import { as, createDb, fails, newArtisan, newBooking, newUser, su, type Db } from './harness'

let db: Db
beforeAll(async () => {
  db = await createDb()
})

const status = async (id: string) => (await su<{ status: string }>(db, `select status from public.bookings where id = $1`, [id]))[0].status
const notifTypes = async (userId: string) =>
  (await su<{ type: string }>(db, `select type from public.notifications where user_id = $1 order by created_at, type`, [userId])).map(r => r.type)

describe('parcours complet', () => {
  it('demande → acceptée → terminée → close → avis, avec notifications et compteurs', async () => {
    const client = await newUser(db, { name: 'Karim Benali', phone: '213555100001' })
    const artisan = await newArtisan(db, { name: 'Sofiane Plomberie' })
    const booking = await newBooking(db, client, artisan)
    expect(await status(booking)).toBe('pending')
    expect(await notifTypes(artisan)).toEqual(['booking_new'])

    const [{ s }] = await as(db, { id: artisan }, run => run<{ s: string }>(`select public.respond_booking($1, true, 4500) as s`, [booking]))
    expect(s).toBe('accepted')
    await as(db, { id: artisan }, run => run(`select public.finish_booking($1)`, [booking]))
    await as(db, { id: client }, run => run(`select public.complete_booking($1)`, [booking]))
    expect(await status(booking)).toBe('completed')
    expect(await notifTypes(client)).toEqual(['booking_accepted', 'booking_finished'])

    await as(db, { id: client }, run => run(`select public.submit_review($1, 4, ' Travail propre, à l’heure. ')`, [booking]))
    const [a] = await su(db, `select rating_avg::text as avg, rating_count, jobs_done from public.artisans where id = $1`, [artisan])
    expect(a).toEqual({ avg: '4.00', rating_count: 1, jobs_done: 1 })
    const [r] = await su(db, `select author_name, comment, rating from public.reviews where booking_id = $1`, [booking])
    // le nom complet du client n'est jamais publié
    expect(r).toEqual({ author_name: 'Karim B.', comment: 'Travail propre, à l’heure.', rating: 4 })
    const [b] = await su(db, `select quoted_price, category from public.bookings where id = $1`, [booking])
    expect(b).toEqual({ quoted_price: 4500, category: 'plomberie' })
  })
})

describe('création d’une demande', () => {
  it('refuse soi-même, un artisan non visible, une description trop courte', async () => {
    const client = await newUser(db)
    const artisan = await newArtisan(db)
    const draft = await newArtisan(db, { publish: false })
    const create = (who: string, target: string, desc = 'Une description suffisamment longue.') =>
      as(db, { id: who }, run => run(`select public.create_booking($1, $2, 16)`, [target, desc]))
    expect(await fails(create(artisan, artisan))).toMatch(/invalid_artisan/)
    expect(await fails(create(client, draft))).toMatch(/artisan_unavailable/)
    expect(await fails(create(client, client))).toMatch(/invalid_artisan/)
    expect(await fails(create(client, artisan, 'court'))).toMatch(/invalid_description/)
    await su(db, `update public.artisans set suspended = true where id = $1`, [draft])
    expect(await fails(create(client, draft))).toMatch(/artisan_unavailable/)
  })

  it('une seule demande ouverte par couple : le second envoi renvoie la première', async () => {
    const client = await newUser(db)
    const artisan = await newArtisan(db)
    const first = await newBooking(db, client, artisan)
    const second = await newBooking(db, client, artisan)
    expect(second).toBe(first)
    expect((await su<{ n: number }>(db, `select count(*)::int as n from public.bookings where client_id = $1`, [client]))[0].n).toBe(1)
  })

  it('limite à 5 demandes en attente', async () => {
    const client = await newUser(db)
    for (let i = 0; i < 5; i++) await newBooking(db, client, await newArtisan(db))
    const sixth = await newArtisan(db)
    expect(await fails(newBooking(db, client, sixth))).toMatch(/too_many_pending/)
  })

  it('aucune écriture directe dans bookings', async () => {
    const client = await newUser(db)
    const artisan = await newArtisan(db)
    const booking = await newBooking(db, client, artisan)
    const denied = /permission denied/
    expect(
      await fails(as(db, { id: client }, run => run(`insert into public.bookings (client_id, artisan_id, category, description, wilaya_code, status) values ($1, $2, 'plomberie', 'insertion directe interdite', 16, 'completed')`, [client, artisan]))),
    ).toMatch(denied)
    expect(await fails(as(db, { id: client }, run => run(`update public.bookings set status = 'completed' where id = $1`, [booking])))).toMatch(denied)
    expect(await fails(as(db, { id: artisan }, run => run(`update public.bookings set quoted_price = 999999 where id = $1`, [booking])))).toMatch(denied)
    expect(await fails(as(db, { id: client }, run => run(`delete from public.bookings where id = $1`, [booking])))).toMatch(denied)
  })
})

describe('changements d’état', () => {
  it('chacun ne fait que ce qui lui revient, dans l’ordre', async () => {
    const client = await newUser(db)
    const artisan = await newArtisan(db)
    const stranger = await newUser(db)
    const booking = await newBooking(db, client, artisan)
    const call = (who: string, sql: string) => as(db, { id: who }, run => run(sql, [booking]))

    // en attente : le client ne peut ni accepter, ni terminer, ni clore
    expect(await fails(call(client, `select public.respond_booking($1, true)`))).toMatch(/not_found/)
    expect(await fails(call(client, `select public.finish_booking($1)`))).toMatch(/not_found/)
    expect(await fails(call(client, `select public.complete_booking($1)`))).toMatch(/invalid_transition/)
    // l'artisan ne peut ni terminer ni annuler une demande pas encore acceptée
    expect(await fails(call(artisan, `select public.finish_booking($1)`))).toMatch(/invalid_transition/)
    expect(await fails(call(artisan, `select public.cancel_booking($1)`))).toMatch(/invalid_transition/)
    // un tiers n'apprend même pas que la demande existe
    for (const sql of [
      `select public.respond_booking($1, true)`, `select public.cancel_booking($1)`, `select public.finish_booking($1)`,
      `select public.complete_booking($1)`, `select public.send_message($1, 'bonjour')`, `select * from public.booking_contact($1)`,
      `select public.mark_messages_read($1)`,
    ])
      expect(await fails(call(stranger, sql)), sql).toMatch(/not_found/)

    await call(artisan, `select public.respond_booking($1, true)`)
    expect(await fails(call(artisan, `select public.respond_booking($1, false)`))).toMatch(/invalid_transition/)
    // acceptée : le client ne peut pas clore avant que l'artisan ait déclaré la fin
    expect(await fails(call(client, `select public.complete_booking($1)`))).toMatch(/invalid_transition/)
    expect(await fails(call(artisan, `select public.complete_booking($1)`))).toMatch(/not_found/)

    await call(artisan, `select public.finish_booking($1)`)
    // terminée : plus d'annulation possible, pour personne
    expect(await fails(call(client, `select public.cancel_booking($1)`))).toMatch(/invalid_transition/)
    expect(await fails(call(artisan, `select public.cancel_booking($1)`))).toMatch(/invalid_transition/)
    await call(client, `select public.complete_booking($1)`)
    expect(await fails(call(client, `select public.complete_booking($1)`))).toMatch(/invalid_transition/)
    expect(await status(booking)).toBe('completed')
  })

  it('annulation : par le client avant la fin, par l’artisan une fois acceptée, avec le motif', async () => {
    const client = await newUser(db)
    const a1 = await newArtisan(db)
    const a2 = await newArtisan(db)
    const b1 = await newBooking(db, client, a1)
    await as(db, { id: client }, run => run(`select public.cancel_booking($1, '  Problème résolu  ')`, [b1]))
    const [row] = await su(db, `select status, cancelled_by, cancel_reason from public.bookings where id = $1`, [b1])
    expect(row).toEqual({ status: 'cancelled', cancelled_by: client, cancel_reason: 'Problème résolu' })

    const b2 = await newBooking(db, client, a2)
    await as(db, { id: a2 }, run => run(`select public.respond_booking($1, true)`, [b2]))
    await as(db, { id: a2 }, run => run(`select public.cancel_booking($1)`, [b2]))
    expect(await status(b2)).toBe('cancelled')
    expect(await notifTypes(client)).toContain('booking_cancelled')
    // une demande annulée libère le couple : une nouvelle demande est possible
    const b3 = await newBooking(db, client, a2)
    expect(b3).not.toBe(b2)
  })
})

describe('ce que voit l’autre partie', () => {
  it('adresse et téléphone : seulement une fois la demande acceptée', async () => {
    const client = await newUser(db, { phone: '213555100002' })
    const artisan = await newArtisan(db)
    const booking = await newBooking(db, client, artisan, '7 rue Larbi Ben M’hidi, 2e étage')
    const address = (who: string) => as(db, { id: who }, async run => (await run<{ address: string }>(`select address from public.booking_private where booking_id = $1`, [booking])).map(r => r.address))
    const contact = (who: string) => as(db, { id: who }, run => run<{ phone: string }>(`select phone from public.booking_contact($1)`, [booking]))

    expect(await address(client)).toEqual(['7 rue Larbi Ben M’hidi, 2e étage'])
    expect(await address(artisan)).toEqual([])
    expect(await contact(artisan)).toEqual([])
    expect(await contact(client)).toEqual([])
    // le numéro de l'autre n'est jamais lisible directement dans la table
    expect(await as(db, { id: artisan }, run => run(`select phone from public.user_contacts where user_id = $1`, [client]))).toEqual([])

    await as(db, { id: artisan }, run => run(`select public.respond_booking($1, true)`, [booking]))
    expect(await address(artisan)).toEqual(['7 rue Larbi Ben M’hidi, 2e étage'])
    expect(await contact(artisan)).toEqual([{ phone: '+213555100002' }])
    expect((await contact(client))[0].phone).toMatch(/^\+2135550/)
  })

  it('un tiers ne lit ni la demande, ni les messages, ni l’adresse, ni la fiche privée du client', async () => {
    const client = await newUser(db)
    const artisan = await newArtisan(db)
    const stranger = await newUser(db)
    const booking = await newBooking(db, client, artisan)
    await as(db, { id: client }, run => run(`select public.send_message($1, 'Bonjour, êtes-vous disponible demain ?')`, [booking]))
    const seen = await as(db, { id: stranger }, async run => ({
      bookings: await run(`select id from public.bookings`),
      messages: await run(`select id from public.messages`),
      addresses: await run(`select booking_id from public.booking_private`),
      profiles: (await run<{ id: string }>(`select id from public.profiles`)).map(r => r.id),
      notifications: await run(`select id from public.notifications`),
    }))
    expect(seen).toEqual({ bookings: [], messages: [], addresses: [], profiles: [stranger], notifications: [] })
    // l'artisan, lui, voit la demande et le nom du client
    const artisanView = await as(db, { id: artisan }, async run => (await run<{ id: string }>(`select id from public.profiles where id = $1`, [client])).length)
    expect(artisanView).toBe(1)
    // sans connexion : rien
    expect(await fails(as(db, {}, run => run(`select id from public.bookings`)))).toMatch(/permission denied/)
    expect(await fails(as(db, {}, run => run(`select id from public.messages`)))).toMatch(/permission denied/)
  })

  it('une demande dont le client a supprimé son compte ne devient pas accessible à un inconnu', async () => {
    const client = await newUser(db)
    const artisan = await newArtisan(db)
    const stranger = await newUser(db)
    const booking = await newBooking(db, client, artisan)
    await su(db, `update public.bookings set client_id = null where id = $1`, [booking])
    // piège classique : « x not in (NULL, y) » vaut NULL, pas vrai
    expect(await fails(as(db, { id: stranger }, run => run(`select public.send_message($1, 'intrus')`, [booking])))).toMatch(/not_found/)
    expect(await fails(as(db, { id: stranger }, run => run(`select public.cancel_booking($1)`, [booking])))).toMatch(/not_found/)
    expect(await fails(as(db, { id: stranger }, run => run(`select * from public.booking_contact($1)`, [booking])))).toMatch(/not_found/)
    expect(await as(db, { id: stranger }, run => run(`select id from public.bookings where id = $1`, [booking]))).toEqual([])
  })
})

describe('messages', () => {
  it('l’expéditeur est toujours l’appelant ; l’autre reçoit une seule notification non lue', async () => {
    const client = await newUser(db)
    const artisan = await newArtisan(db)
    const booking = await newBooking(db, client, artisan)
    const [m] = await as(db, { id: client }, run => run<{ sender_id: string; body: string }>(`select sender_id, body from public.send_message($1, '  Bonjour  ')`, [booking]))
    expect(m).toEqual({ sender_id: client, body: 'Bonjour' })
    await as(db, { id: client }, run => run(`select public.send_message($1, 'Deuxième message')`, [booking]))
    expect((await notifTypes(artisan)).filter(t => t === 'message_new')).toHaveLength(1)

    await as(db, { id: artisan }, run => run(`select public.mark_messages_read($1)`, [booking]))
    const unread = await su(db, `select 1 from public.messages where booking_id = $1 and read_at is null`, [booking])
    expect(unread).toEqual([])
    // insertion directe impossible, même sous son propre nom
    expect(await fails(as(db, { id: client }, run => run(`insert into public.messages (booking_id, sender_id, body) values ($1, $2, 'direct')`, [booking, client])))).toMatch(/permission denied/)
    expect(await fails(as(db, { id: client }, run => run(`update public.messages set body = 'modifié' where booking_id = $1`, [booking])))).toMatch(/permission denied/)
  })

  it('limite le débit et ferme la conversation d’une demande déclinée', async () => {
    const client = await newUser(db)
    const artisan = await newArtisan(db)
    const booking = await newBooking(db, client, artisan)
    for (let i = 0; i < 20; i++) await as(db, { id: client }, run => run(`select public.send_message($1, $2)`, [booking, `message ${i}`]))
    expect(await fails(as(db, { id: client }, run => run(`select public.send_message($1, 'un de trop')`, [booking])))).toMatch(/rate_limited/)
    expect(await fails(as(db, { id: artisan }, run => run(`select public.send_message($1, '')`, [booking])))).toMatch(/invalid_body/)
    await as(db, { id: artisan }, run => run(`select public.respond_booking($1, false)`, [booking]))
    expect(await fails(as(db, { id: artisan }, run => run(`select public.send_message($1, 'trop tard')`, [booking])))).toMatch(/conversation_closed/)
  })
})

describe('avis', () => {
  const completed = async () => {
    const client = await newUser(db, { name: 'Nadia' })
    const artisan = await newArtisan(db)
    const booking = await newBooking(db, client, artisan)
    await as(db, { id: artisan }, run => run(`select public.respond_booking($1, true)`, [booking]))
    await as(db, { id: artisan }, run => run(`select public.finish_booking($1)`, [booking]))
    await as(db, { id: client }, run => run(`select public.complete_booking($1)`, [booking]))
    return { client, artisan, booking }
  }

  it('seulement par le client, sur une demande close, une seule fois', async () => {
    const client = await newUser(db)
    const artisan = await newArtisan(db)
    const open = await newBooking(db, client, artisan)
    expect(await fails(as(db, { id: client }, run => run(`select public.submit_review($1, 5)`, [open])))).toMatch(/booking_not_completed/)

    const done = await completed()
    expect(await fails(as(db, { id: done.artisan }, run => run(`select public.submit_review($1, 5, 'Je suis excellent')`, [done.booking])))).toMatch(/not_found/)
    expect(await fails(as(db, { id: client }, run => run(`select public.submit_review($1, 5)`, [done.booking])))).toMatch(/not_found/)
    expect(await fails(as(db, { id: done.client }, run => run(`select public.submit_review($1, 9)`, [done.booking])))).toMatch(/invalid_rating/)
    await as(db, { id: done.client }, run => run(`select public.submit_review($1, 5, 'Parfait')`, [done.booking]))
    expect(await fails(as(db, { id: done.client }, run => run(`select public.submit_review($1, 1, 'Je change d’avis')`, [done.booking])))).toMatch(/already_reviewed/)
    // un prénom seul reste un prénom
    expect((await su<{ author_name: string }>(db, `select author_name from public.reviews where booking_id = $1`, [done.booking]))[0].author_name).toBe('Nadia')
    // insertion directe impossible
    expect(
      await fails(as(db, { id: done.client }, run => run(`insert into public.reviews (booking_id, artisan_id, client_id, author_name, rating) values ($1, $2, $3, 'x', 5)`, [open, artisan, done.client]))),
    ).toMatch(/permission denied/)
  })

  it('la moyenne ignore les avis masqués ; seul l’artisan concerné répond', async () => {
    const a = await completed()
    await as(db, { id: a.client }, run => run(`select public.submit_review($1, 2, 'Moyen')`, [a.booking]))
    // un second client du même artisan
    const client2 = await newUser(db)
    const booking2 = await newBooking(db, client2, a.artisan)
    await as(db, { id: a.artisan }, run => run(`select public.respond_booking($1, true)`, [booking2]))
    await as(db, { id: a.artisan }, run => run(`select public.finish_booking($1)`, [booking2]))
    await as(db, { id: client2 }, run => run(`select public.complete_booking($1)`, [booking2]))
    await as(db, { id: client2 }, run => run(`select public.submit_review($1, 5, 'Très bien')`, [booking2]))
    const rating = async () => (await su(db, `select rating_avg::text as avg, rating_count from public.artisans where id = $1`, [a.artisan]))[0]
    expect(await rating()).toEqual({ avg: '3.50', rating_count: 2 })

    await su(db, `update public.reviews set is_visible = false where booking_id = $1`, [a.booking])
    expect(await rating()).toEqual({ avg: '5.00', rating_count: 1 })
    // l'avis masqué disparaît du public mais son auteur le voit encore
    expect(await as(db, {}, run => run(`select comment from public.reviews where artisan_id = $1`, [a.artisan]))).toEqual([{ comment: 'Très bien' }])
    expect(await as(db, { id: a.client }, run => run(`select 1 from public.reviews where booking_id = $1`, [a.booking]))).toHaveLength(1)

    // personne ne lit qui a écrit un avis ; un visiteur ne lit pas non plus de quelle demande il vient
    for (const who of [{}, { id: client2 }, { id: a.artisan }]) {
      expect(await fails(as(db, who, run => run(`select client_id from public.reviews`)))).toMatch(/permission denied/)
      expect(await fails(as(db, who, run => run(`select * from public.reviews`)))).toMatch(/permission denied/)
    }
    expect(await fails(as(db, {}, run => run(`select booking_id from public.reviews`)))).toMatch(/permission denied/)

    const [{ id: reviewId }] = await su<{ id: string }>(db, `select id from public.reviews where booking_id = $1`, [booking2])
    const other = await newArtisan(db)
    expect(await fails(as(db, { id: other }, run => run(`select public.reply_review($1, 'Réponse usurpée')`, [reviewId])))).toMatch(/not_found/)
    await as(db, { id: a.artisan }, run => run(`select public.reply_review($1, ' Merci ! ')`, [reviewId]))
    expect((await su<{ reply: string }>(db, `select reply from public.reviews where id = $1`, [reviewId]))[0].reply).toBe('Merci !')
  })
})

describe('notifications', () => {
  it('on ne lit, ne marque et n’efface que les siennes', async () => {
    const client = await newUser(db)
    const artisan = await newArtisan(db)
    await newBooking(db, client, artisan)
    const mine = await as(db, { id: artisan }, run => run<{ id: string }>(`select id from public.notifications`))
    expect(mine).toHaveLength(1)
    // le client tente de marquer comme lue la notification de l'artisan
    await as(db, { id: client }, run => run(`select public.mark_notifications_read($1)`, [[mine[0].id]]))
    await as(db, { id: client }, run => run(`select public.clear_notifications()`))
    expect(await su(db, `select 1 from public.notifications where id = $1 and read_at is null`, [mine[0].id])).toHaveLength(1)
    await as(db, { id: artisan }, run => run(`select public.mark_notifications_read()`))
    expect(await su(db, `select 1 from public.notifications where id = $1 and read_at is null`, [mine[0].id])).toEqual([])
    expect(await fails(as(db, { id: client }, run => run(`insert into public.notifications (user_id, type) values ($1, 'booking_new')`, [artisan])))).toMatch(/permission denied/)
  })
})

describe('position en direct', () => {
  it('n’est enregistrée que pendant un trajet partagé, et lue seulement par le client concerné', async () => {
    const client = await newUser(db)
    const artisan = await newArtisan(db)
    const stranger = await newUser(db)
    const booking = await newBooking(db, client, artisan)
    const push = () => as(db, { id: artisan }, run => run(`select public.push_location(36.7538, 3.0588)`))
    const seenBy = (who: string) => as(db, { id: who }, run => run(`select lat from public.artisan_live_location where artisan_id = $1`, [artisan]))

    expect(await fails(push())).toMatch(/not_sharing/)
    expect(await fails(as(db, { id: artisan }, run => run(`select public.set_sharing_location($1, true)`, [booking])))).toMatch(/invalid_transition/)
    await as(db, { id: artisan }, run => run(`select public.respond_booking($1, true)`, [booking]))
    expect(await fails(as(db, { id: client }, run => run(`select public.set_sharing_location($1, true)`, [booking])))).toMatch(/not_found/)
    await as(db, { id: artisan }, run => run(`select public.set_sharing_location($1, true)`, [booking]))
    await push()
    expect(await seenBy(client)).toHaveLength(1)
    expect(await seenBy(stranger)).toEqual([])
    // une position vieille de plus de 15 minutes n'est plus montrée
    await su(db, `update public.artisan_live_location set updated_at = now() - interval '20 minutes' where artisan_id = $1`, [artisan])
    expect(await seenBy(client)).toEqual([])
    // l'arrêt du partage efface la position
    await as(db, { id: artisan }, run => run(`select public.set_sharing_location($1, false)`, [booking]))
    expect(await su(db, `select 1 from public.artisan_live_location where artisan_id = $1`, [artisan])).toEqual([])
  })
})
