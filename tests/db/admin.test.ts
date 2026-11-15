// Équipe BETI : droits d'admin, journal, abonnements, suspension, signalements,
// suppression de compte.

import { beforeAll, describe, expect, it } from 'vitest'
import { as, createDb, fails, makeStaff, newArtisan, newBooking, newUser, su, type Db } from './harness'

let db: Db
let admin: string
beforeAll(async () => {
  db = await createDb()
  admin = await newUser(db, { name: 'Admin BETI' })
  await makeStaff(db, admin)
})

const audit = async (action: string) =>
  su<{ actor_id: string; target: string; details: Record<string, unknown> }>(
    db,
    `select actor_id, target, details from public.audit_log where action = $1 order by id desc`,
    [action],
  )

describe('accès', () => {
  it('toutes les fonctions admin_* refusent un non-membre de l’équipe', async () => {
    const user = await newUser(db)
    const artisan = await newArtisan(db)
    const calls = [
      `select public.admin_overview()`,
      `select public.admin_set_user_active('${artisan}', false)`,
      `select public.admin_set_listing('${artisan}', false)`,
      `select public.admin_review_subscription('${artisan}', true)`,
      `select public.admin_set_booking_status('${artisan}', 'completed')`,
      `select public.admin_set_review_visibility('${artisan}', false)`,
      `select public.admin_update_report('${artisan}', 'resolved')`,
      `select public.admin_set_launch_free_until(now() + interval '10 years')`,
    ]
    for (const sql of calls) {
      expect(await fails(as(db, { id: user }, run => run(sql))), sql).toMatch(/forbidden/)
      expect(await fails(as(db, { id: artisan }, run => run(sql))), sql).toMatch(/forbidden/)
      expect(await fails(as(db, {}, run => run(sql))), sql).toMatch(/permission denied/)
    }
    expect(await su(db, `select 1 from public.audit_log`)).toEqual([])
  })

  it('personne ne peut se nommer membre de l’équipe par l’API', async () => {
    const user = await newUser(db)
    expect(await fails(as(db, { id: user }, run => run(`insert into private.staff (user_id) values ($1)`, [user])))).toMatch(/permission denied/)
    expect(await fails(as(db, { id: user }, run => run(`select * from private.staff`)))).toMatch(/permission denied/)
    const [row] = await as(db, { id: admin }, run => run<{ a: { staff_role: string } }>(`select public.my_access() as a`))
    expect(row.a.staff_role).toBe('admin')
  })

  it('le tableau de bord renvoie des compteurs et 30 jours d’activité', async () => {
    const [{ o }] = await as(db, { id: admin }, run => run<{ o: Record<string, unknown> }>(`select public.admin_overview() as o`))
    expect(typeof o.users).toBe('number')
    expect(o.users as number).toBeGreaterThan(0)
    expect(o.daily as unknown[]).toHaveLength(30)
  })

  it('le journal est en ajout seul, même pour la clé service', async () => {
    const user = await newUser(db)
    await as(db, { id: admin }, run => run(`select public.admin_set_user_active($1, false, 'essai')`, [user]))
    expect(await fails(as(db, { role: 'service_role' }, run => run(`update public.audit_log set action = 'rien'`)))).toMatch(/audit_log_append_only/)
    expect(await fails(as(db, { role: 'service_role' }, run => run(`delete from public.audit_log`)))).toMatch(/audit_log_append_only/)
    expect(await fails(as(db, { id: admin }, run => run(`delete from public.audit_log`)))).toMatch(/permission denied/)
    // un utilisateur ordinaire ne lit aucune ligne du journal (il en existe pourtant)
    expect((await su(db, `select 1 from public.audit_log`)).length).toBeGreaterThan(0)
    expect(await as(db, { id: user }, run => run(`select 1 from public.audit_log`))).toEqual([])
  })
})

describe('suspension', () => {
  it('cache la fiche, bloque les écritures, prévient la personne, et se journalise', async () => {
    const artisan = await newArtisan(db)
    await as(db, { id: admin }, run => run(`select public.admin_set_user_active($1, false, 'Faux profil')`, [artisan]))
    expect(await as(db, {}, run => run(`select 1 from public.artisans where id = $1`, [artisan]))).toEqual([])
    expect(await fails(as(db, { id: artisan }, run => run(`select public.set_availability(true)`)))).toMatch(/account_suspended/)
    expect(await su(db, `select type from public.notifications where user_id = $1`, [artisan])).toEqual([{ type: 'account_suspended' }])
    const [log] = await audit('user.suspend')
    expect(log).toEqual({ actor_id: admin, target: `user:${artisan}`, details: { reason: 'Faux profil' } })

    await as(db, { id: admin }, run => run(`select public.admin_set_user_active($1, true)`, [artisan]))
    expect(await as(db, {}, run => run(`select 1 from public.artisans where id = $1`, [artisan]))).toHaveLength(1)
  })

  it('ne s’applique pas à un membre de l’équipe', async () => {
    const other = await newUser(db)
    await makeStaff(db, other, 'moderator')
    expect(await fails(as(db, { id: admin }, run => run(`select public.admin_set_user_active($1, false)`, [other])))).toMatch(/cannot_suspend_staff/)
    expect(await fails(as(db, { id: other }, run => run(`select public.admin_set_user_active($1, false)`, [admin])))).toMatch(/cannot_suspend_staff/)
  })
})

describe('abonnements', () => {
  it('la validation active le plan et le registre ensemble ; un renouvellement prolonge', async () => {
    const artisan = await newArtisan(db)
    const request = async (plan: string, cycle: string) =>
      (await as(db, { id: artisan }, run => run<{ id: string }>(`select public.request_subscription($1, $2) as id`, [plan, cycle])))[0].id

    const first = await request('basic', 'monthly')
    await as(db, { id: admin }, run => run(`select public.admin_review_subscription($1, true, 'Virement reçu')`, [first]))
    const [a1] = await su<{ plan: string; days: number }>(db, `select plan, round(extract(epoch from plan_until - now()) / 86400)::int as days from public.artisans where id = $1`, [artisan])
    expect(a1.plan).toBe('basic')
    expect(a1.days).toBeGreaterThanOrEqual(28)
    expect(a1.days).toBeLessThanOrEqual(31)
    const [s1] = await su(db, `select status, reviewed_by, note from public.subscriptions where id = $1`, [first])
    expect(s1).toEqual({ status: 'active', reviewed_by: admin, note: 'Virement reçu' })
    expect(await su(db, `select type from public.notifications where user_id = $1`, [artisan])).toEqual([{ type: 'subscription_active' }])

    // déjà traitée : on ne revalide pas
    expect(await fails(as(db, { id: admin }, run => run(`select public.admin_review_subscription($1, true)`, [first])))).toMatch(/invalid_transition/)

    const second = await request('basic', 'monthly')
    await as(db, { id: admin }, run => run(`select public.admin_review_subscription($1, true)`, [second]))
    const [a2] = await su<{ days: number }>(db, `select round(extract(epoch from plan_until - now()) / 86400)::int as days from public.artisans where id = $1`, [artisan])
    expect(a2.days).toBeGreaterThanOrEqual(57)

    const third = await request('premium', 'yearly')
    await as(db, { id: admin }, run => run(`select public.admin_review_subscription($1, false, 'Référence introuvable')`, [third]))
    const [a3] = await su<{ plan: string }>(db, `select plan from public.artisans where id = $1`, [artisan])
    expect(a3.plan).toBe('basic')
    expect((await audit('subscription.reject'))[0].details).toEqual({ plan: 'premium', cycle: 'yearly', amount: 50000 })
  })
})

describe('demandes et avis', () => {
  it('l’équipe peut clore ou annuler une demande restée ouverte, pas une demande finie', async () => {
    const client = await newUser(db)
    const artisan = await newArtisan(db)
    const booking = await newBooking(db, client, artisan)
    expect(await fails(as(db, { id: admin }, run => run(`select public.admin_set_booking_status($1, 'accepted')`, [booking])))).toMatch(/invalid_status/)
    await as(db, { id: admin }, run => run(`select public.admin_set_booking_status($1, 'completed', 'Litige tranché')`, [booking]))
    const [b] = await su(db, `select status from public.bookings where id = $1`, [booking])
    expect(b).toEqual({ status: 'completed' })
    expect((await su<{ jobs_done: number }>(db, `select jobs_done from public.artisans where id = $1`, [artisan]))[0].jobs_done).toBe(1)
    expect(await fails(as(db, { id: admin }, run => run(`select public.admin_set_booking_status($1, 'cancelled')`, [booking])))).toMatch(/invalid_transition/)
    expect((await audit('booking.completed'))[0].details).toEqual({ from: 'pending', reason: 'Litige tranché' })
  })

  it('masquer un avis le retire du public et de la moyenne', async () => {
    const client = await newUser(db)
    const artisan = await newArtisan(db)
    const booking = await newBooking(db, client, artisan)
    await as(db, { id: admin }, run => run(`select public.admin_set_booking_status($1, 'completed')`, [booking]))
    const [{ id: review }] = await as(db, { id: client }, run => run<{ id: string }>(`select public.submit_review($1, 1, 'Insultes') as id`, [booking]))
    await as(db, { id: admin }, run => run(`select public.admin_set_review_visibility($1, false, 'Propos injurieux')`, [review]))
    expect(await as(db, {}, run => run(`select 1 from public.reviews where id = $1`, [review]))).toEqual([])
    expect((await su<{ rating_count: number }>(db, `select rating_count from public.artisans where id = $1`, [artisan]))[0].rating_count).toBe(0)
  })
})

describe('signalements', () => {
  it('la personne signalée est déduite par le serveur ; l’équipe ne lit la conversation que si elle est signalée', async () => {
    const client = await newUser(db)
    const artisan = await newArtisan(db)
    const quiet = await newBooking(db, client, await newArtisan(db))
    const booking = await newBooking(db, client, artisan)
    await as(db, { id: client }, run => run(`select public.send_message($1, 'Message de la demande signalée')`, [booking]))
    await as(db, { id: client }, run => run(`select public.send_message($1, 'Message d’une demande tranquille')`, [quiet]))

    // avant signalement : l'équipe ne lit aucune conversation ni adresse
    const before = await as(db, { id: admin }, async run => ({
      messages: await run(`select 1 from public.messages`),
      addresses: await run(`select 1 from public.booking_private`),
    }))
    expect(before).toEqual({ messages: [], addresses: [] })

    const [{ id: report }] = await as(db, { id: client }, run =>
      run<{ id: string }>(`select public.create_report('booking', $1, 'travail_non_fait', 'Il n’est jamais venu.') as id`, [booking]),
    )
    const [r] = await su(db, `select reporter_id, reported_user_id, booking_id, status from public.reports where id = $1`, [report])
    expect(r).toEqual({ reporter_id: client, reported_user_id: artisan, booking_id: booking, status: 'open' })

    const after = await as(db, { id: admin }, async run => ({
      messages: (await run<{ body: string }>(`select body from public.messages`)).map(m => m.body),
      addresses: await run(`select booking_id from public.booking_private`),
    }))
    expect(after.messages).toEqual(['Message de la demande signalée'])
    expect(after.addresses).toEqual([{ booking_id: booking }])

    // l'artisan signalé ne voit pas le signalement ; l'auteur ne voit pas la note interne
    expect(await as(db, { id: artisan }, run => run(`select 1 from public.reports`))).toEqual([])
    await as(db, { id: admin }, run => run(`select public.admin_update_report($1, 'in_review', 'none', 'Appeler le client lundi')`, [report]))
    expect(await as(db, { id: client }, run => run(`select 1 from public.report_notes`))).toEqual([])
    expect(await as(db, { id: client }, run => run(`select status from public.reports`))).toEqual([{ status: 'in_review' }])
  })

  it('refuse les cibles incohérentes, les doublons et le signalement de soi-même', async () => {
    const client = await newUser(db)
    const artisan = await newArtisan(db)
    const stranger = await newUser(db)
    const booking = await newBooking(db, client, artisan)
    const report = (who: string, sql: string, params: unknown[] = []) => as(db, { id: who }, run => run(sql, params))
    // un tiers ne peut pas signaler la demande des autres (et ainsi l'ouvrir à l'équipe)
    expect(await fails(report(stranger, `select public.create_report('booking', $1, 'fraude')`, [booking]))).toMatch(/invalid_target/)
    // ni rattacher la demande d'autrui à un signalement d'artisan
    expect(await fails(report(stranger, `select public.create_report('artisan', $1, 'fraude', null, $2)`, [artisan, booking]))).toMatch(/invalid_target/)
    // un client n'est signalable que par quelqu'un qui a eu une demande avec lui
    expect(await fails(report(stranger, `select public.create_report('client', $1, 'harcelement')`, [client]))).toMatch(/invalid_target/)
    expect(await fails(report(client, `select public.create_report('client', $1, 'harcelement')`, [client]))).toMatch(/invalid_target/)
    expect(await fails(report(client, `select public.create_report('artisan', $1, 'autre', 'court')`, [artisan]))).toMatch(/details_required/)
    expect(await fails(report(client, `select public.create_report('artisan', $1, 'jalousie')`, [artisan]))).toMatch(/invalid_reason/)
    await report(client, `select public.create_report('artisan', $1, 'faux_profil')`, [artisan])
    expect(await fails(report(client, `select public.create_report('artisan', $1, 'fraude')`, [artisan]))).toMatch(/already_reported/)
    expect(await fails(report(client, `insert into public.reports (reporter_id, reported_user_id, target_type, target_id, reason) values ($1, $2, 'artisan', $2, 'fraude')`, [client, artisan]))).toMatch(/permission denied/)
  })

  it('« résolu + suspension » suspend le compte signalé dans la même opération', async () => {
    const client = await newUser(db)
    const artisan = await newArtisan(db)
    const [{ id: report }] = await as(db, { id: client }, run => run<{ id: string }>(`select public.create_report('artisan', $1, 'fraude') as id`, [artisan]))
    expect(await fails(as(db, { id: admin }, run => run(`select public.admin_update_report($1, 'in_review', 'suspension')`, [report])))).toMatch(/invalid_resolution/)
    await as(db, { id: admin }, run => run(`select public.admin_update_report($1, 'resolved', 'suspension')`, [report]))
    const [p] = await su(db, `select is_active from public.profiles where id = $1`, [artisan])
    expect(p).toEqual({ is_active: false })
    const [r] = await su<{ handled_by: string; handled: boolean }>(db, `select handled_by, handled_at is not null as handled from public.reports where id = $1`, [report])
    expect(r).toEqual({ handled_by: admin, handled: true })
  })
})

describe('suppression de compte', () => {
  it('purge_user est réservé au serveur (clé service)', async () => {
    const user = await newUser(db)
    expect(await fails(as(db, { id: user }, run => run(`select public.purge_user($1)`, [user])))).toMatch(/permission denied/)
    expect(await fails(as(db, { id: admin }, run => run(`select public.purge_user($1)`, [user])))).toMatch(/permission denied/)
    expect(await fails(as(db, {}, run => run(`select public.purge_user($1)`, [user])))).toMatch(/permission denied/)
  })

  it('efface ce que la personne a écrit, ferme ses demandes, puis la cascade emporte le reste', async () => {
    const client = await newUser(db, { name: 'Lina Cherif', phone: '213555300001' })
    const artisan = await newArtisan(db)
    const other = await newArtisan(db)
    // une demande close avec avis, une demande encore ouverte
    const done = await newBooking(db, client, artisan, '3 rue des Frères Bouadou')
    await as(db, { id: admin }, run => run(`select public.admin_set_booking_status($1, 'completed')`, [done]))
    await as(db, { id: client }, run => run(`select public.submit_review($1, 5, 'Merci beaucoup')`, [done]))
    await as(db, { id: client }, run => run(`select public.send_message($1, 'Mon digicode est 4521')`, [done]))
    const open = await newBooking(db, client, other, '3 rue des Frères Bouadou')

    await as(db, { role: 'service_role' }, run => run(`select public.purge_user($1)`, [client]))
    await su(db, `delete from auth.users where id = $1`, [client])

    expect(await su(db, `select 1 from public.profiles where id = $1`, [client])).toEqual([])
    expect(await su(db, `select 1 from public.user_contacts where user_id = $1`, [client])).toEqual([])
    const bookings = await su(db, `select b.status, b.client_id, b.description, p.address from public.bookings b join public.booking_private p on p.booking_id = b.id where b.id in ($1, $2) order by b.status`, [done, open])
    expect(bookings).toEqual([
      { status: 'cancelled', client_id: null, description: 'Demande supprimée avec le compte.', address: '' },
      { status: 'completed', client_id: null, description: 'Demande supprimée avec le compte.', address: '' },
    ])
    expect(await su(db, `select body, sender_id from public.messages where booking_id = $1`, [done])).toEqual([{ body: 'Message supprimé.', sender_id: null }])
    // la note reste (elle concerne l'artisan), sans le nom ni le texte de son auteur
    expect(await su(db, `select author_name, comment, rating, client_id from public.reviews where booking_id = $1`, [done])).toEqual([
      { author_name: 'Compte supprimé', comment: '', rating: 5, client_id: null },
    ])
    // l'artisan de la demande ouverte est prévenu
    expect((await su<{ type: string }>(db, `select type from public.notifications where user_id = $1 order by created_at`, [other])).map(n => n.type)).toContain('booking_cancelled')
  })

  it('supprimer un artisan retire sa vitrine mais garde le registre des abonnements', async () => {
    const artisan = await newArtisan(db, { name: 'Atelier Mourad' })
    const [{ id: sub }] = await as(db, { id: artisan }, run => run<{ id: string }>(`select public.request_subscription('basic', 'monthly') as id`))
    await as(db, { id: admin }, run => run(`select public.admin_review_subscription($1, true)`, [sub]))
    await as(db, { role: 'service_role' }, run => run(`select public.purge_user($1)`, [artisan]))
    await su(db, `delete from auth.users where id = $1`, [artisan])
    expect(await su(db, `select 1 from public.artisans where id = $1`, [artisan])).toEqual([])
    expect(await su(db, `select artisan_id, artisan_label, amount, status from public.subscriptions where id = $1`, [sub])).toEqual([
      { artisan_id: null, artisan_label: 'Atelier Mourad', amount: 2500, status: 'active' },
    ])
  })
})
