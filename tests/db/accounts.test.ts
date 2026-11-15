// Comptes : inscription, fiche privée, téléphone, suspension.

import { beforeAll, describe, expect, it } from 'vitest'
import { as, createDb, fails, newUser, su, type Db } from './harness'

let db: Db
beforeAll(async () => {
  db = await createDb()
})

describe('inscription', () => {
  it('crée la fiche ; un rôle « admin » demandé à l’inscription devient client', async () => {
    const id = await newUser(db, { role: 'admin', name: '  Samia Haddad  ' })
    const [p] = await su<{ role: string; full_name: string; is_active: boolean }>(
      db,
      `select role, full_name, is_active from public.profiles where id = $1`,
      [id],
    )
    expect(p).toEqual({ role: 'client', full_name: 'Samia Haddad', is_active: true })
    expect(await su(db, `select 1 from private.staff where user_id = $1`, [id])).toEqual([])
  })

  it('accepte le rôle artisan', async () => {
    const id = await newUser(db, { role: 'artisan' })
    const [p] = await su<{ role: string }>(db, `select role from public.profiles where id = $1`, [id])
    expect(p.role).toBe('artisan')
  })

  it('un numéro confirmé par code est « vérifié », un numéro seulement déclaré ne l’est pas', async () => {
    const confirmed = await newUser(db, { phone: '213555000111' })
    const declared = await newUser(db, { metaPhone: '+213555000222' })
    const garbage = await newUser(db, { metaPhone: '0555 12' })
    const contact = async (id: string) =>
      (await su<{ phone: string | null; phone_verified: boolean }>(
        db,
        `select phone, phone_verified from public.user_contacts where user_id = $1`,
        [id],
      ))[0]
    expect(await contact(confirmed)).toEqual({ phone: '+213555000111', phone_verified: true })
    expect(await contact(declared)).toEqual({ phone: '+213555000222', phone_verified: false })
    expect(await contact(garbage)).toEqual({ phone: null, phone_verified: false })
  })
})

describe('écriture directe dans les tables', () => {
  it('est refusée sur profiles, user_contacts et staff', async () => {
    const id = await newUser(db)
    const denied = /permission denied/
    expect(await fails(as(db, { id }, run => run(`update public.profiles set role = 'artisan' where id = $1`, [id])))).toMatch(denied)
    expect(await fails(as(db, { id }, run => run(`update public.profiles set is_active = true where id = $1`, [id])))).toMatch(denied)
    expect(await fails(as(db, { id }, run => run(`update public.user_contacts set phone_verified = true where user_id = $1`, [id])))).toMatch(denied)
    expect(await fails(as(db, { id }, run => run(`insert into private.staff (user_id) values ($1)`, [id])))).toMatch(denied)
    expect(await fails(as(db, { id }, run => run(`delete from public.profiles where id = $1`, [id])))).toMatch(denied)
  })

  it('est refusée sans connexion, y compris par les fonctions', async () => {
    expect(await fails(as(db, {}, run => run(`select * from public.profiles`)))).toMatch(/permission denied/)
    expect(await fails(as(db, {}, run => run(`select public.save_profile('Pirate')`)))).toMatch(/permission denied/)
    expect(await fails(as(db, {}, run => run(`select public.my_access()`)))).toMatch(/permission denied/)
  })
})

describe('lecture', () => {
  it('chacun ne lit que sa fiche et son numéro', async () => {
    const a = await newUser(db, { phone: '213555000333' })
    const b = await newUser(db, { phone: '213555000444' })
    const seen = await as(db, { id: a }, async run => ({
      profiles: (await run<{ id: string }>(`select id from public.profiles`)).map(r => r.id),
      contacts: (await run<{ user_id: string }>(`select user_id from public.user_contacts`)).map(r => r.user_id),
    }))
    expect(seen.profiles).toEqual([a])
    expect(seen.contacts).toEqual([a])
    expect(seen.profiles).not.toContain(b)
  })

  it('my_access décrit l’appelant, sans rôle d’équipe par défaut', async () => {
    const id = await newUser(db, { role: 'artisan' })
    const [row] = await as(db, { id }, run => run<{ a: Record<string, unknown> }>(`select public.my_access() as a`))
    expect(row.a).toEqual({ user_id: id, role: 'artisan', is_active: true, staff_role: null })
  })
})

describe('save_profile et set_phone', () => {
  it('valident les valeurs et refusent un avatar hors du dossier de l’utilisateur', async () => {
    const id = await newUser(db)
    const other = await newUser(db)
    const call = (sql: string, params: unknown[] = []) => as(db, { id }, run => run(sql, params))
    expect(await fails(call(`select public.save_profile('A')`))).toMatch(/invalid_full_name/)
    expect(await fails(call(`select public.save_profile('Karim', 99)`))).toMatch(/invalid_wilaya/)
    expect(await fails(call(`select public.save_profile('Karim', 16, 'Alger', 'en')`))).toMatch(/invalid_lang/)
    expect(await fails(call(`select public.save_profile('Karim', 16, 'Alger', 'fr', $1)`, [`avatars/${other}/moi.jpg`]))).toMatch(/invalid_avatar/)
    expect(await fails(call(`select public.save_profile('Karim', 16, 'Alger', 'fr', 'https://exemple.test/x.jpg')`))).toMatch(/invalid_avatar/)

    await call(`select public.save_profile('  Karim Benali ', 16, ' Alger-Centre ', 'ar', $1)`, [`avatars/${id}/moi.jpg`])
    const [p] = await su(db, `select full_name, wilaya_code, commune, lang, avatar_path from public.profiles where id = $1`, [id])
    expect(p).toEqual({ full_name: 'Karim Benali', wilaya_code: 16, commune: 'Alger-Centre', lang: 'ar', avatar_path: `avatars/${id}/moi.jpg` })
  })

  it('set_phone contrôle le format et ne marque jamais « vérifié » un numéro simplement saisi', async () => {
    const id = await newUser(db)
    expect(await fails(as(db, { id }, run => run(`select public.set_phone('0555123456')`)))).toMatch(/invalid_phone/)
    await as(db, { id }, run => run(`select public.set_phone('+213 555 12 34 56')`))
    const [c] = await su(db, `select phone, phone_verified from public.user_contacts where user_id = $1`, [id])
    expect(c).toEqual({ phone: '+213555123456', phone_verified: false })
  })

  it('set_phone reconnaît le numéro déjà confirmé par code', async () => {
    const id = await newUser(db, { phone: '213555000555' })
    await as(db, { id }, run => run(`select public.set_phone('+213555999000')`))
    expect((await su<{ phone_verified: boolean }>(db, `select phone_verified from public.user_contacts where user_id = $1`, [id]))[0].phone_verified).toBe(false)
    await as(db, { id }, run => run(`select public.set_phone('+213555000555')`))
    expect((await su<{ phone_verified: boolean }>(db, `select phone_verified from public.user_contacts where user_id = $1`, [id]))[0].phone_verified).toBe(true)
  })
})

describe('compte suspendu', () => {
  it('ne peut plus rien écrire, mais lit encore ses données', async () => {
    const id = await newUser(db)
    await su(db, `update public.profiles set is_active = false where id = $1`, [id])
    expect(await fails(as(db, { id }, run => run(`select public.save_profile('Karim')`)))).toMatch(/account_suspended/)
    expect(await fails(as(db, { id }, run => run(`select public.become_artisan()`)))).toMatch(/account_suspended/)
    const rows = await as(db, { id }, run => run<{ is_active: boolean }>(`select is_active from public.profiles where id = $1`, [id]))
    expect(rows).toEqual([{ is_active: false }])
  })
})
