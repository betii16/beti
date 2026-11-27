// Recherche par mot-clé (migration …000900) : sans accents ni variantes de l'écriture arabe, et le métier est cherché aussi.

import { beforeAll, expect, it } from 'vitest'
import { as, createDb, newArtisan, su, type Db } from './harness'

let db: Db
beforeAll(async () => {
  db = await createDb()
  for (const [name, category, bio, skills] of [
    ['Karim Benali', 'plomberie', 'Fuites et chauffe-eau à Alger.', ['fuite']],
    ['Yacine Haddad', 'electricite', 'Électricien depuis 10 ans.', []],
    ['Mourad Saidi', 'menuiserie', 'إصلاح الأبواب والنوافذ', []],
  ] as const) {
    const id = await newArtisan(db, { name, category })
    await as(db, { id }, run =>
      run(`select public.save_listing(p_display_name => $1, p_category => $2, p_wilaya_code => 16, p_bio => $3, p_skills => $4)`, [
        name,
        category,
        bio,
        skills,
      ]),
    )
  }
})

const find = async (q: string) =>
  (await as(db, {}, run => run<{ display_name: string }>(`select display_name from public.search_artisans(p_q => $1)`, [q])))
    .map(r => r.display_name)
    .sort()

it('les accents et les majuscules ne comptent plus', async () => {
  expect(await find('electricien')).toEqual(['Yacine Haddad'])
  expect(await find('ÉLECTRICIEN')).toEqual(['Yacine Haddad'])
})

it('en arabe, hamza sur l’alif et voyelles ne comptent plus', async () => {
  expect(await find('اصلاح')).toEqual(['Mourad Saidi'])
  expect(await find('إِصلاح')).toEqual(['Mourad Saidi'])
})

it('le métier de l’artisan est cherché aussi', async () => {
  expect(await find('plomberie')).toEqual(['Karim Benali'])
  expect(await find('électricité')).toEqual(['Yacine Haddad'])
})

it('les caractères spéciaux du motif restent des lettres ordinaires', async () => {
  expect(await find('%')).toEqual([])
  expect(await find('_')).toEqual([])
})

it('private.fold reste interne', async () => {
  const [row] = await su<{ anon: boolean; auth: boolean }>(
    db,
    `select has_function_privilege('anon', 'private.fold(text)', 'EXECUTE') as anon,
            has_function_privilege('authenticated', 'private.fold(text)', 'EXECUTE') as auth`,
  )
  expect(row).toEqual({ anon: false, auth: false })
})
