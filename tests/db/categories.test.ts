// Métiers revus le 2026-11-24 (migration …000800) : métiers retirés fermés, leurs artisans rangés dans « Autre ».

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, expect, it } from 'vitest'
import { as, createDb, fails, newArtisan, su, type Db } from './harness'

let db: Db
beforeAll(async () => {
  db = await createDb()
})

it('une fiche ne peut plus choisir un métier retiré, mais peut choisir un nouveau', async () => {
  const id = await newArtisan(db, { category: 'climatisation' })
  const msg = await fails(
    as(db, { id }, run => run(`select public.save_listing(p_display_name => 'Ancien informaticien', p_category => 'informatique', p_wilaya_code => 16)`)),
  )
  expect(msg).toMatch(/invalid_category/)
})

it('rejouée, la migration range dans « Autre » les artisans d’un métier retiré, leur métier gardé en spécialité', async () => {
  const informaticien = await newArtisan(db)
  const plein = await newArtisan(db)
  const douze = Array.from({ length: 12 }, (_, i) => `spécialité ${i}`)
  await su(db, `update public.artisans set category = 'informatique', skills = '{Réseau}' where id = $1`, [informaticien])
  await su(db, `update public.artisans set category = 'coiffure', skills = $2 where id = $1`, [plein, douze])

  await db.exec(readFileSync(join(process.cwd(), 'supabase', 'migrations', '20261124000800_categories.sql'), 'utf8'))

  const rows = await su<{ id: string; category: string; skills: string[] }>(
    db,
    `select id, category, skills from public.artisans where id in ($1, $2)`,
    [informaticien, plein],
  )
  const byId = Object.fromEntries(rows.map(r => [r.id, r]))
  expect(byId[informaticien]).toMatchObject({ category: 'autre', skills: ['Réseau', 'Informatique'] })
  expect(byId[plein]).toMatchObject({ category: 'autre', skills: douze })
})
