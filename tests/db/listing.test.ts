// Fiche de l'artisan : création, visibilité publique, abonnement, portfolio, recherche.

import { beforeAll, describe, expect, it } from 'vitest'
import { as, createDb, fails, newArtisan, newUser, su, type Db } from './harness'

let db: Db
beforeAll(async () => {
  db = await createDb()
})

const publicIds = (d: Db) => as(d, {}, async run => (await run<{ id: string }>(`select id from public.artisans`)).map(r => r.id))

describe('création de la fiche', () => {
  it('est réservée aux artisans', async () => {
    const client = await newUser(db)
    const msg = await fails(
      as(db, { id: client }, run => run(`select public.save_listing(p_display_name => 'Faux pro', p_category => 'plomberie', p_wilaya_code => 16)`)),
    )
    expect(msg).toMatch(/not_an_artisan/)
  })

  it('un client peut devenir artisan, puis créer sa fiche ; la position est arrondie à ~1 km', async () => {
    const id = await newUser(db, { name: 'Yacine Mansouri', phone: '213555010101' })
    await as(db, { id }, async run => {
      await run(`select public.become_artisan()`)
      await run(
        `select public.save_listing(p_display_name => 'Yacine Plomberie', p_category => 'plomberie', p_wilaya_code => 16,
                                    p_commune => 'Bab El Oued', p_skills => $1, p_hourly_rate => 1500, p_lat => 36.75384, p_lng => 3.05876)`,
        [['  Chauffe-eau ', 'chauffe-eau', 'Débouchage', 'x']],
      )
    })
    const [a] = await su(
      db,
      `select display_name, category, commune, skills, hourly_rate, lat::text as lat, lng::text as lng,
              published, plan, phone_verified, rating_count, jobs_done
         from public.artisans where id = $1`,
      [id],
    )
    expect(a).toEqual({
      display_name: 'Yacine Plomberie', category: 'plomberie', commune: 'Bab El Oued',
      skills: ['chauffe-eau', 'débouchage'], hourly_rate: 1500, lat: '36.75', lng: '3.06',
      published: false, plan: 'free', phone_verified: true, rating_count: 0, jobs_done: 0,
    })
  })

  it('valide chaque champ', async () => {
    const id = await newUser(db, { role: 'artisan', phone: '213555010202' })
    const call = (args: string) => as(db, { id }, run => run(`select public.save_listing(${args})`))
    const base = `p_display_name => 'Pro', p_category => 'plomberie', p_wilaya_code => 16`
    expect(await fails(call(`p_display_name => 'P', p_category => 'plomberie', p_wilaya_code => 16`))).toMatch(/invalid_display_name/)
    expect(await fails(call(`p_display_name => 'Pro', p_category => 'astrologie', p_wilaya_code => 16`))).toMatch(/invalid_category/)
    expect(await fails(call(`p_display_name => 'Pro', p_category => 'plomberie', p_wilaya_code => 59`))).toMatch(/invalid_wilaya/)
    expect(await fails(call(`${base}, p_hourly_rate => -5`))).toMatch(/invalid_rate/)
    expect(await fails(call(`${base}, p_lat => 48.85, p_lng => 2.35`))).toMatch(/invalid_location/)
    expect(await fails(call(`${base}, p_lat => 36.7`))).toMatch(/invalid_location/)
    expect(await fails(call(`${base}, p_cover_path => 'portfolio/00000000-0000-0000-0000-000000000000/a.jpg'`))).toMatch(/invalid_cover/)
  })
})

describe('ce que l’API ne montre pas d’une fiche', () => {
  it('l’abonnement ne se lit pas dans la fiche, même par l’artisan : il passe par subscriptions', async () => {
    const id = await newArtisan(db)
    const sub = (await as(db, { id }, run => run<{ id: string }>(`select public.request_subscription('premium', 'monthly') as id`)))[0].id
    await su(db, `update public.artisans set plan = 'premium', plan_until = now() + interval '30 days' where id = $1`, [id])

    for (const who of [{}, { id }, { id: await newUser(db) }]) {
      expect(await fails(as(db, who, run => run(`select plan from public.artisans`)))).toMatch(/permission denied/)
      expect(await fails(as(db, who, run => run(`select plan_until from public.artisans`)))).toMatch(/permission denied/)
      expect(await fails(as(db, who, run => run(`select * from public.artisans`)))).toMatch(/permission denied/)
    }

    // la fiche publique se lit toujours ; la recherche dit « mis en avant » sans donner la formule
    expect(await as(db, {}, run => run(`select display_name from public.artisans where id = $1`, [id]))).toHaveLength(1)
    const found = await as(db, {}, run => run<{ id: string; is_premium: boolean }>(`select * from public.search_artisans()`))
    expect(found.find(a => a.id === id)?.is_premium).toBe(true)
    expect(Object.keys(found[0])).not.toContain('plan')

    // l'artisan lit sa propre demande d'abonnement, un autre compte ne la voit pas
    expect(await as(db, { id }, run => run(`select plan, status from public.subscriptions where id = $1`, [sub]))).toEqual([{ plan: 'premium', status: 'pending' }])
    expect(await as(db, { id: await newUser(db) }, run => run(`select 1 from public.subscriptions where id = $1`, [sub]))).toEqual([])
  })
})

describe('ce que l’artisan ne peut pas changer lui-même', () => {
  it('plan, note, compteurs, mention vérifiée : aucune écriture directe', async () => {
    const id = await newArtisan(db)
    const denied = /permission denied/
    const attempt = (set: string) => fails(as(db, { id }, run => run(`update public.artisans set ${set} where id = $1`, [id])))
    expect(await attempt(`plan = 'premium', plan_until = now() + interval '10 years'`)).toMatch(denied)
    expect(await attempt(`rating_avg = 5, rating_count = 400`)).toMatch(denied)
    expect(await attempt(`jobs_done = 999`)).toMatch(denied)
    expect(await attempt(`verified_at = now()`)).toMatch(denied)
    expect(await attempt(`suspended = false`)).toMatch(denied)
    // et enregistrer sa fiche ne remet rien de tout cela en jeu
    await su(db, `update public.artisans set plan = 'basic', plan_until = now() + interval '5 days', jobs_done = 3 where id = $1`, [id])
    await as(db, { id }, run => run(`select public.save_listing(p_display_name => 'Nouveau nom', p_category => 'peinture', p_wilaya_code => 31)`))
    const [a] = await su(db, `select display_name, plan, jobs_done, published from public.artisans where id = $1`, [id])
    expect(a).toEqual({ display_name: 'Nouveau nom', plan: 'basic', jobs_done: 3, published: true })
  })
})

describe('visibilité publique', () => {
  it('publier exige un numéro de téléphone', async () => {
    const id = await newUser(db, { role: 'artisan' })
    await as(db, { id }, run => run(`select public.save_listing(p_display_name => 'Sans numéro', p_category => 'menage', p_wilaya_code => 9)`))
    expect(await fails(as(db, { id }, run => run(`select public.publish_listing(true)`)))).toMatch(/phone_required/)
    await as(db, { id }, async run => {
      await run(`select public.set_phone('+213555010303')`)
      await run(`select public.publish_listing(true)`)
    })
    expect(await publicIds(db)).toContain(id)
  })

  it('suit : publication, suspension, puis abonnement une fois la période de lancement finie', async () => {
    const draft = await newArtisan(db, { publish: false })
    const listed = await newArtisan(db)
    const suspended = await newArtisan(db)
    const subscribed = await newArtisan(db)
    const expired = await newArtisan(db)
    await su(db, `update public.artisans set suspended = true where id = $1`, [suspended])
    await su(db, `update public.artisans set plan = 'basic', plan_until = now() + interval '20 days' where id = $1`, [subscribed])
    await su(db, `update public.artisans set plan = 'premium', plan_until = now() - interval '1 hour' where id = $1`, [expired])

    // période de lancement : tout artisan publié et non suspendu est visible
    await su(db, `update public.app_config set launch_free_until = now() + interval '30 days'`)
    let seen = await publicIds(db)
    expect(seen).toEqual(expect.arrayContaining([listed, subscribed, expired]))
    expect(seen).not.toContain(draft)
    expect(seen).not.toContain(suspended)

    // période finie : seuls les abonnés en cours restent
    await su(db, `update public.app_config set launch_free_until = now() - interval '1 day'`)
    seen = await publicIds(db)
    expect(seen).toContain(subscribed)
    expect(seen).not.toContain(listed)
    expect(seen).not.toContain(expired)

    // l'artisan voit toujours sa propre fiche
    const own = await as(db, { id: listed }, async run => (await run<{ id: string }>(`select id from public.artisans where id = $1`, [listed])).length)
    expect(own).toBe(1)
    await su(db, `update public.app_config set launch_free_until = now() + interval '30 days'`)
  })
})

describe('portfolio', () => {
  it('photos dans son dossier seulement ; 6 réalisations au plus hors Premium', async () => {
    const id = await newArtisan(db)
    const other = await newArtisan(db)
    const add = (photo: string) => as(db, { id }, run => run(`select public.add_portfolio_post('Salle de bain refaite', $1)`, [[photo]]))
    expect(await fails(add(`portfolio/${other}/a.jpg`))).toMatch(/invalid_photos/)
    expect(await fails(add(`https://exemple.test/a.jpg`))).toMatch(/invalid_photos/)
    for (let i = 0; i < 6; i++) await add(`portfolio/${id}/p${i}.jpg`)
    expect(await fails(add(`portfolio/${id}/p6.jpg`))).toMatch(/portfolio_limit/)

    await su(db, `update public.artisans set plan = 'premium', plan_until = now() + interval '30 days' where id = $1`, [id])
    await add(`portfolio/${id}/p6.jpg`)
    expect((await su<{ n: number }>(db, `select count(*)::int as n from public.portfolio_posts where artisan_id = $1`, [id]))[0].n).toBe(7)
  })

  it('on ne supprime que ses propres réalisations', async () => {
    const id = await newArtisan(db)
    const other = await newArtisan(db)
    const [{ post }] = await as(db, { id }, run => run<{ post: string }>(`select public.add_portfolio_post('', $1) as post`, [[`portfolio/${id}/x.jpg`]]))
    expect(await fails(as(db, { id: other }, run => run(`select public.delete_portfolio_post($1)`, [post])))).toMatch(/not_found/)
    expect(await fails(as(db, { id: other }, run => run(`delete from public.portfolio_posts where id = $1`, [post])))).toMatch(/permission denied/)
    await as(db, { id }, run => run(`select public.delete_portfolio_post($1)`, [post]))
    expect(await su(db, `select 1 from public.portfolio_posts where id = $1`, [post])).toEqual([])
  })
})

describe('demande d’abonnement', () => {
  it('le montant vient de la table des tarifs, pas du navigateur ; une seule demande en attente', async () => {
    const id = await newArtisan(db)
    const [{ sub }] = await as(db, { id }, run => run<{ sub: string }>(`select public.request_subscription('premium', 'yearly', 'ccp', ' 0012345 ') as sub`))
    const [s] = await su(db, `select plan, cycle, amount, status, payment_method, payment_ref from public.subscriptions where id = $1`, [sub])
    expect(s).toEqual({ plan: 'premium', cycle: 'yearly', amount: 50000, status: 'pending', payment_method: 'ccp', payment_ref: '0012345' })
    expect(await fails(as(db, { id }, run => run(`select public.request_subscription('basic', 'monthly')`)))).toMatch(/already_pending/)
    expect(await fails(as(db, { id }, run => run(`select public.request_subscription('gold', 'monthly')`)))).toMatch(/invalid_plan|already_pending/)
    // la demande ne change pas le plan : seule la validation par l'équipe le fait
    expect((await su<{ plan: string }>(db, `select plan from public.artisans where id = $1`, [id]))[0].plan).toBe('free')
    // ni insertion ni activation directes
    expect(await fails(as(db, { id }, run => run(`update public.subscriptions set status = 'active' where id = $1`, [sub])))).toMatch(/permission denied/)
    expect(
      await fails(as(db, { id }, run => run(`insert into public.subscriptions (artisan_id, artisan_label, plan, cycle, amount, status) values ($1, 'x', 'premium', 'yearly', 1, 'active')`, [id]))),
    ).toMatch(/permission denied/)
  })
})

describe('recherche', () => {
  it('ne renvoie que les fiches visibles : Premium d’abord, puis la plus proche', async () => {
    const fresh = await createDb()
    const near = await newArtisan(fresh, { name: 'Proche', category: 'electricite', lat: 36.76, lng: 3.06 })
    const far = await newArtisan(fresh, { name: 'Loin', category: 'electricite', lat: 36.9, lng: 3.4 })
    const premium = await newArtisan(fresh, { name: 'Premium', category: 'electricite', lat: 36.95, lng: 3.5 })
    const hidden = await newArtisan(fresh, { name: 'Brouillon', category: 'electricite', publish: false })
    const otherCategory = await newArtisan(fresh, { name: 'Peintre', category: 'peinture', lat: 36.76, lng: 3.06 })
    await su(fresh, `update public.artisans set plan = 'premium', plan_until = now() + interval '30 days' where id = $1`, [premium])

    const rows = await as(fresh, {}, run =>
      run<{ id: string; is_premium: boolean; distance_km: string | null }>(
        `select id, is_premium, distance_km::text as distance_km from public.search_artisans(p_category => 'electricite', p_lat => 36.75, p_lng => 3.05)`,
      ),
    )
    expect(rows.map(r => r.id)).toEqual([premium, near, far])
    expect(rows[0].is_premium).toBe(true)
    expect(Number(rows[1].distance_km)).toBeLessThan(Number(rows[2].distance_km))
    expect(rows.map(r => r.id)).not.toContain(hidden)
    expect(rows.map(r => r.id)).not.toContain(otherCategory)
  })

  it('cherche dans le nom et les compétences, sans laisser passer de joker', async () => {
    const fresh = await createDb()
    const id = await newUser(fresh, { role: 'artisan', phone: '213555020202' })
    await as(fresh, { id }, async run => {
      await run(`select public.save_listing(p_display_name => 'Atelier Rachid', p_category => 'autre', p_wilaya_code => 16, p_skills => $1)`, [['soudure', 'ferronnerie']])
      await run(`select public.publish_listing(true)`)
    })
    await newArtisan(fresh, { name: 'Autre pro', category: 'autre' })
    const search = (q: string) => as(fresh, {}, async run => (await run<{ id: string }>(`select id from public.search_artisans(p_q => $1)`, [q])).map(r => r.id))
    expect(await search('rachid')).toEqual([id])
    expect(await search('Ferronn')).toEqual([id])
    expect(await search('%')).toEqual([])
    expect(await search('_')).toEqual([])
  })
})
