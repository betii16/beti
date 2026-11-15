// Banc d'essai de la base : un vrai Postgres embarqué (PGlite), ce que Supabase
// fournit (supabase/tests/supabase_stub.sql), puis nos migrations dans l'ordre.
// Chaque test agit « comme l'API » : rôle Postgres + jeton de l'appelant.

import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const MIGRATIONS = join(ROOT, 'supabase', 'migrations')

export type Db = PGlite
export type Role = 'authenticated' | 'anon' | 'service_role'
export type Run = <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>

export async function createDb(): Promise<Db> {
  const db = new PGlite()
  await db.exec(readFileSync(join(ROOT, 'supabase', 'tests', 'supabase_stub.sql'), 'utf8'))
  for (const file of readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort()) {
    try {
      await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'))
    } catch (e) {
      throw new Error(`Migration ${file} : ${(e as Error).message}`)
    }
  }
  return db
}

/** Requête en super-utilisateur : pour préparer un cas, jamais pour le vérifier. */
export async function su<T = Record<string, unknown>>(db: Db, sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query(sql, params)).rows as T[]
}

/** Exécute fn comme l'API le ferait pour cet appelant. Les écritures réussies sont gardées. */
export async function as<T>(db: Db, who: { id?: string | null; role?: Role }, fn: (run: Run) => Promise<T>): Promise<T> {
  const role: Role = who.role ?? (who.id ? 'authenticated' : 'anon')
  await db.exec('begin')
  try {
    await db.exec(`set local role ${role}`)
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: who.id ?? null, role })])
    const run = (async (sql: string, params: unknown[] = []) => (await db.query(sql, params)).rows) as Run
    const out = await fn(run)
    await db.exec('commit')
    return out
  } catch (e) {
    await db.exec('rollback')
    throw e
  }
}

/** Renvoie le message d'erreur ; échoue si la requête passe. */
export async function fails(p: Promise<unknown>): Promise<string> {
  try {
    await p
  } catch (e) {
    return (e as Error).message
  }
  throw new Error('la requête aurait dû être refusée')
}

let seq = 0

/** Crée un compte comme le fait l'inscription : une ligne auth.users, le déclencheur fait le reste. */
export async function newUser(
  db: Db,
  opts: { role?: string; name?: string; phone?: string; phoneConfirmed?: boolean; metaPhone?: string } = {},
): Promise<string> {
  seq += 1
  const meta: Record<string, string> = { full_name: opts.name ?? `Utilisateur ${seq}` }
  if (opts.role) meta.role = opts.role
  if (opts.metaPhone) meta.phone = opts.metaPhone
  const confirmedAt = opts.phone && opts.phoneConfirmed !== false ? new Date().toISOString() : null
  const rows = await su<{ id: string }>(
    db,
    `insert into auth.users (email, phone, phone_confirmed_at, raw_user_meta_data)
     values ($1, $2, $3::timestamptz, $4::jsonb) returning id`,
    [`u${seq}@test.local`, opts.phone ?? null, confirmedAt, JSON.stringify(meta)],
  )
  return rows[0].id
}

/** Artisan avec numéro confirmé et fiche enregistrée (publiée sauf demande contraire). */
export async function newArtisan(
  db: Db,
  opts: { name?: string; category?: string; wilaya?: number; publish?: boolean; lat?: number; lng?: number } = {},
): Promise<string> {
  seq += 1
  const id = await newUser(db, { role: 'artisan', name: opts.name ?? `Artisan ${seq}`, phone: `21355500${1000 + seq}` })
  await as(db, { id }, async run => {
    await run(
      `select public.save_listing(p_display_name => $1, p_category => $2, p_wilaya_code => $3, p_lat => $4, p_lng => $5)`,
      [opts.name ?? `Artisan ${seq}`, opts.category ?? 'plomberie', opts.wilaya ?? 16, opts.lat ?? null, opts.lng ?? null],
    )
    if (opts.publish !== false) await run(`select public.publish_listing(true)`)
  })
  return id
}

export async function makeStaff(db: Db, id: string, role: 'admin' | 'moderator' = 'admin'): Promise<void> {
  await su(db, `insert into private.staff (user_id, role) values ($1, $2)`, [id, role])
}

/** Demande ouverte entre un client et un artisan ; renvoie son identifiant. */
export async function newBooking(db: Db, clientId: string, artisanId: string, address = '12 rue Didouche Mourad'): Promise<string> {
  return as(db, { id: clientId }, async run => {
    const rows = await run<{ id: string }>(
      `select public.create_booking(p_artisan_id => $1, p_description => $2, p_wilaya_code => 16, p_address => $3) as id`,
      [artisanId, 'Fuite sous l’évier de la cuisine, à réparer vite.', address],
    )
    return rows[0].id
  })
}
