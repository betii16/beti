// Contrat entre la base et l'application.
// 1. Les types TypeScript de la base (src/lib/supabase/database.types.ts) sont
//    tirés ici du catalogue de la base des tests : mêmes tables et fonctions qu'en
//    production, sans les centaines de fonctions PostGIS que le générateur de
//    Supabase recopierait. Après une migration : npm run gen:types, relire le diff.
// 2. Chaque catégorie de la base a son libellé dans les deux langues.

import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeAll, expect, it } from 'vitest'
import { ar } from '@/i18n/dictionaries/ar'
import { fr } from '@/i18n/dictionaries/fr'
import type { Database } from '@/lib/supabase/database.types'
import { createDb, su, type Db } from './harness'

let db: Db
beforeAll(async () => {
  db = await createDb()
})

// Types Postgres connus. Un type absent arrête la génération : on l'ajoute ici
// en connaissance de cause, plutôt que de laisser passer un « unknown ».
const BASE: Record<string, string> = {
  uuid: 'string',
  text: 'string',
  date: 'string',
  'timestamp with time zone': 'string',
  boolean: 'boolean',
  smallint: 'number',
  integer: 'number',
  bigint: 'number',
  numeric: 'number',
  'double precision': 'number',
  jsonb: 'Json',
  void: 'undefined',
}

const list = (xs: string[]) => `[${xs.map(x => `'${x}'`).join(', ')}]`

async function generate(): Promise<string> {
  const columns = await su<{ t: string; c: string; ty: string; nn: boolean }>(
    db,
    `select c.relname as t, a.attname as c, format_type(a.atttypid, null) as ty, a.attnotnull as nn
       from pg_attribute a join pg_class c on c.oid = a.attrelid
      where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped
        -- seulement ce que l'API peut lire : une colonne fermée n'existe pas pour l'application
        and has_column_privilege('authenticated', c.oid, a.attnum, 'select')
      order by c.relname, a.attnum`,
  )
  const tables = [...new Set(columns.map(x => x.t))]

  const ts = (pg: string): string => {
    if (pg.endsWith('[]')) return `${ts(pg.slice(0, -2))}[]`
    const name = pg.replace(/^public\./, '')
    if (tables.includes(name)) return `Database['public']['Tables']['${name}']['Row']`
    if (!BASE[name]) throw new Error(`Type Postgres sans équivalent TypeScript : ${pg} (compléter BASE)`)
    return BASE[name]
  }

  // check (col in ('a', 'b')) devient l'union 'a' | 'b' : le compilateur connaît les états possibles.
  const checks = await su<{ t: string; def: string }>(
    db,
    `select c.relname as t, pg_get_constraintdef(con.oid) as def
       from pg_constraint con join pg_class c on c.oid = con.conrelid
      where c.relnamespace = 'public'::regnamespace and con.contype = 'c'`,
  )
  const unions = new Map<string, string>()
  for (const { t, def } of checks) {
    const m = /^CHECK \(\((\w+) = ANY \(ARRAY\[(.+)\]\)\)\)$/.exec(def)
    if (m) unions.set(`${t}.${m[1]}`, [...m[2].matchAll(/'([^']+)'::text/g)].map(v => `'${v[1]}'`).join(' | '))
  }

  // Liens entre tables : le client s'en sert pour typer les lectures imbriquées.
  const fks = await su<{ t: string; name: string; ref: string; cols: string[]; refcols: string[]; one: boolean }>(
    db,
    `select c.relname as t, con.conname as name, r.relname as ref,
            (select json_agg(a.attname order by k.i) from unnest(con.conkey) with ordinality k(n, i)
               join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.n) as cols,
            (select json_agg(a.attname order by k.i) from unnest(con.confkey) with ordinality k(n, i)
               join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.n) as refcols,
            exists (select 1 from pg_index x
                     where x.indrelid = con.conrelid and x.indisunique and x.indpred is null
                       and (select array_agg(n order by n) from unnest(x.indkey::int2[]) n)
                         = (select array_agg(n order by n) from unnest(con.conkey) n)) as one
       from pg_constraint con
       join pg_class c on c.oid = con.conrelid
       join pg_class r on r.oid = con.confrelid
      where con.contype = 'f' and c.relnamespace = 'public'::regnamespace and r.relnamespace = 'public'::regnamespace
        and not exists (select 1 from unnest(con.conkey) k(n)
                         where not has_column_privilege('authenticated', con.conrelid, k.n, 'select'))
      order by c.relname, con.conname`,
  )

  const fns = await su<{
    name: string
    names: string[]
    modes: string[]
    types: string[] | null
    ndef: number
    setof: boolean
    ret: string
  }>(
    db,
    `select p.proname as name,
            coalesce(to_json(p.proargnames), '[]') as names,
            coalesce(to_json(p.proargmodes), '[]') as modes,
            (select json_agg(format_type(x.t, null) order by x.i)
               from unnest(coalesce(p.proallargtypes, p.proargtypes::oid[])) with ordinality x(t, i)) as types,
            p.pronargdefaults as ndef, p.proretset as setof, format_type(p.prorettype, null) as ret
       from pg_proc p
      where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
        and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
      order by p.proname`,
  )

  const tableBlocks = tables.flatMap(t => [
    `      ${t}: {`,
    '        Row: {',
    ...columns
      .filter(x => x.t === t)
      .map(x => `          ${x.c}: ${unions.get(`${t}.${x.c}`) ?? ts(x.ty)}${x.nn ? '' : ' | null'}`),
    '        }',
    '        Insert: never',
    '        Update: never',
    '        Relationships: [',
    ...fks
      .filter(k => k.t === t)
      .map(
        k =>
          `          { foreignKeyName: '${k.name}'; columns: ${list(k.cols)}; isOneToOne: ${k.one}; referencedRelation: '${k.ref}'; referencedColumns: ${list(k.refcols)} },`,
      ),
    '        ]',
    '      }',
  ])

  const seen = new Set<string>()
  const fnLines = fns.map(f => {
    // shortcut: une fonction par nom ; si une surcharge apparaît, émettre une union de signatures.
    if (seen.has(f.name)) throw new Error(`Fonction surchargée, non gérée ici : ${f.name}`)
    seen.add(f.name)
    const args = (f.types ?? []).map((ty, i) => ({ name: f.names[i], ty, mode: f.modes[i] ?? 'i' }))
    const ins = args.filter(a => a.mode === 'i')
    const outs = args.filter(a => a.mode === 't')
    if (ins.length + outs.length !== args.length || args.some(a => !a.name)) {
      throw new Error(`Signature non gérée ici : ${f.name}`)
    }
    // Les arguments qui ont une valeur par défaut sont les derniers.
    const firstOptional = ins.length - f.ndef
    const Args = ins.length
      ? `{ ${ins.map((a, i) => `${a.name}${i >= firstOptional ? '?' : ''}: ${ts(a.ty)}`).join('; ')} }`
      : 'never'
    // Colonnes d'un « returns table » : rien ne garantit qu'elles soient remplies.
    const Returns = outs.length
      ? `{ ${outs.map(a => `${a.name}: ${ts(a.ty)} | null`).join('; ')} }[]`
      : ts(f.ret) + (f.setof ? '[]' : '')
    return `      ${f.name}: { Args: ${Args}; Returns: ${Returns} }`
  })

  return [
    '// Généré par tests/db/contract.test.ts depuis le catalogue de la base : ne pas modifier à la main.',
    '// Après une migration : npm run gen:types.',
    '// Insert et Update valent never : l’API n’écrit jamais dans une table, toute écriture passe par une fonction.',
    '// Row ne contient que les colonnes lisibles par une personne connectée : une colonne fermée à l’API n’y figure pas.',
    '',
    'export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]',
    '',
    'export type Database = {',
    '  public: {',
    '    Tables: {',
    ...tableBlocks,
    '    }',
    '    Views: { [_ in never]: never }',
    '    Functions: {',
    ...fnLines,
    '    }',
    '  }',
    '}',
    '',
  ].join('\n')
}

it('les types de la base sont à jour (sinon : npm run gen:types)', async () => {
  await expect(await generate()).toMatchFileSnapshot('../../src/lib/supabase/database.types.ts')
})

it('chaque catégorie ouverte de la base a son libellé dans les deux langues, dans le même ordre', async () => {
  const slugs = (await su<{ slug: string }>(db, 'select slug from public.categories where is_active order by sort, slug')).map(r => r.slug)
  expect(Object.keys(fr.categories)).toEqual(slugs)
  expect(Object.keys(ar.categories)).toEqual(slugs)
})

// Jamais exécuté : c'est « npm run typecheck » qui le lit. Si les types générés
// cessaient de brider le client (écriture directe, fonction ou argument mal
// nommé), les lignes @ts-expect-error deviendraient des erreurs de compilation.
export function typesGuard(client: SupabaseClient<Database>) {
  // @ts-expect-error aucune écriture directe dans une table
  void client.from('bookings').insert({ description: 'x' })
  // @ts-expect-error fonction inconnue
  void client.rpc('give_me_premium')
  // @ts-expect-error argument mal nommé
  void client.rpc('respond_booking', { p_booking: 'x', p_accept: true })
  void client.rpc('respond_booking', { p_booking_id: 'x', p_accept: true })
  void client.rpc('become_artisan')
}
