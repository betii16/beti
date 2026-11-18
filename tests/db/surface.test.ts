// Ce que l'API (rôles anon et authenticated) peut atteindre dans la base.
// Les listes ci-dessous sont écrites À LA MAIN : ajouter une table ou une fonction
// sans l'inscrire ici fait échouer le test. C'est voulu.

import { beforeAll, describe, expect, it } from 'vitest'
import { as, createDb, newArtisan, su, type Db } from './harness'

let db: Db
beforeAll(async () => {
  db = await createDb()
})

const ANON_TABLES = ['app_config', 'artisans', 'categories', 'plans', 'portfolio_posts', 'reviews']
const USER_TABLES = [
  ...ANON_TABLES,
  'artisan_live_location', 'audit_log', 'booking_private', 'bookings', 'messages', 'notifications',
  'profiles', 'report_notes', 'reports', 'subscriptions', 'user_contacts',
].sort()

const ANON_RPC = ['search_artisans']
const USER_RPC = [
  'add_portfolio_post', 'admin_overview', 'admin_review_subscription', 'admin_set_booking_status',
  'admin_set_launch_free_until', 'admin_set_listing', 'admin_set_review_visibility', 'admin_set_user_active',
  'admin_update_report', 'become_artisan', 'booking_contact', 'cancel_booking', 'cancel_subscription_request',
  'clear_notifications', 'complete_booking', 'create_booking', 'create_report', 'delete_portfolio_post',
  'finish_booking', 'mark_messages_read', 'mark_notifications_read', 'my_access', 'publish_listing',
  'push_location', 'reply_review', 'request_subscription', 'respond_booking', 'save_listing', 'save_profile',
  'send_message', 'set_availability', 'set_phone', 'set_sharing_location', 'submit_review',
]
const INTERNAL = ['booking_reported', 'distance_km', 'is_booking_party', 'is_staff', 'launch_free', 'shares_booking']

describe('surface exposée à l’API', () => {
  it('toutes les tables ont le RLS activé', async () => {
    const rows = await su(
      db,
      `select n.nspname || '.' || c.relname as t
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname in ('public', 'private') and c.relkind = 'r' and not c.relrowsecurity`,
    )
    expect(rows).toEqual([])
  })

  it('aucun droit d’écriture sur aucune table pour anon et authenticated', async () => {
    const rows = await su(
      db,
      `select r.rolname || ' ' || p.priv || ' ' || n.nspname || '.' || c.relname as found
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        cross join (values ('anon'), ('authenticated')) as r(rolname)
        cross join (values ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) as p(priv)
        where n.nspname in ('public', 'private') and c.relkind = 'r'
          and (has_table_privilege(r.rolname, c.oid, p.priv)
               or (p.priv in ('INSERT', 'UPDATE') and has_any_column_privilege(r.rolname, c.oid, p.priv)))`,
    )
    expect(rows).toEqual([])
  })

  it('lecture : seules les tables de la liste, et anon seulement les publiques', async () => {
    const readable = async (role: string) =>
      (
        await su<{ t: string }>(
          db,
          `select c.relname as t
             from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname in ('public', 'private') and c.relkind = 'r'
              and (has_table_privilege($1, c.oid, 'SELECT') or has_any_column_privilege($1, c.oid, 'SELECT'))
            order by 1`,
          [role],
        )
      ).map(r => r.t)
    expect(await readable('anon')).toEqual(ANON_TABLES)
    expect(await readable('authenticated')).toEqual(USER_TABLES)
  })

  // Le RLS choisit les lignes, pas les colonnes. Liste écrite À LA MAIN des colonnes
  // d'une table lisible que l'API ne sert pas : une colonne ajoutée à artisans ou à
  // reviews y apparaît d'office, et il faut alors décider de l'ouvrir ou non.
  it('colonnes fermées : ni qui a écrit un avis, ni l’abonnement d’un artisan', async () => {
    const hidden = async (role: string) =>
      (
        await su<{ c: string }>(
          db,
          `select c.relname || '.' || a.attname as c
             from pg_class c
             join pg_namespace n on n.oid = c.relnamespace
             join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
            where n.nspname = 'public' and c.relkind = 'r'
              and has_any_column_privilege($1, c.oid, 'SELECT')
              and not has_column_privilege($1, c.oid, a.attnum, 'SELECT')
            order by 1`,
          [role],
        )
      ).map(r => r.c)
    expect(await hidden('anon')).toEqual(['artisans.plan', 'artisans.plan_until', 'reviews.booking_id', 'reviews.client_id'])
    expect(await hidden('authenticated')).toEqual(['artisans.plan', 'artisans.plan_until', 'reviews.client_id'])
  })

  it('fonctions : seules celles de la liste sont appelables', async () => {
    const rows = await su<{ s: string; f: string; anon: boolean; auth: boolean }>(
      db,
      `select n.nspname as s, p.proname as f,
              has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
              has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'private')
        order by 1, 2`,
    )
    const callable = (schema: string, role: 'anon' | 'auth') => rows.filter(r => r.s === schema && r[role]).map(r => r.f)
    expect(callable('public', 'anon')).toEqual(ANON_RPC)
    expect(callable('public', 'auth')).toEqual([...USER_RPC, ...ANON_RPC].sort())
    expect(callable('private', 'anon')).toEqual(INTERNAL)
    expect(callable('private', 'auth')).toEqual(INTERNAL)
  })

  it('toutes les fonctions fixent leur search_path ; aucune fonction definer ne teste current_user', async () => {
    const rows = await su<{ f: string; definer: boolean; cfg: string | null; src: string }>(
      db,
      `select n.nspname || '.' || p.proname as f, p.prosecdef as definer, p.proconfig::text as cfg, p.prosrc as src
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'private')`,
    )
    expect(rows.length).toBeGreaterThan(50)
    for (const r of rows) {
      expect(r.cfg ?? '', r.f).toMatch(/search_path=/)
      // Dans une fonction definer, current_user vaut le propriétaire : un tel test ne protège rien.
      if (r.definer) expect(r.src, r.f).not.toMatch(/current_user|session_user/i)
    }
  })

  it('la règle RLS des fiches et private.artisan_visible() donnent le même résultat', async () => {
    const cases: { published: boolean; suspended: boolean; plan: string; until: string | null }[] = []
    for (const published of [true, false])
      for (const suspended of [true, false])
        for (const [plan, until] of [
          ['free', null],
          ['premium', `now() + interval '10 days'`],
          ['premium', `now() - interval '1 day'`],
          ['basic', null],
        ] as const)
          cases.push({ published, suspended, plan, until })

    const ids: string[] = []
    for (const c of cases) {
      const id = await newArtisan(db, { publish: false })
      await su(
        db,
        `update public.artisans set published = $2, suspended = $3, plan = $4, plan_until = ${c.until ?? 'null'} where id = $1`,
        [id, c.published, c.suspended, c.plan],
      )
      ids.push(id)
    }

    for (const launch of [`now() + interval '5 days'`, `now() - interval '5 days'`, 'null']) {
      await su(db, `update public.app_config set launch_free_until = ${launch}`)
      const viaFunction = (await su<{ id: string }>(db, `select id from public.artisans where private.artisan_visible(id) order by id`)).map(r => r.id)
      const viaRls = await as(db, {}, async run => (await run<{ id: string }>(`select id from public.artisans order by id`)).map(r => r.id))
      expect(viaRls, `launch_free_until = ${launch}`).toEqual(viaFunction)
      // garde-fou : la matrice doit contenir des fiches visibles ET des fiches cachées
      expect(viaRls.length).toBeGreaterThan(0)
      expect(viaRls.length).toBeLessThan(ids.length)
    }
  })
})
