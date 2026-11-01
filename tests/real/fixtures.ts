// Fixtures des tests reels : comptes, sessions, donnees et nettoyage.
// Tout passe par le projet Supabase de TEST (voir scripts/lib/test-env.cjs qui
// REFUSE la production). La cle service_role n'est utilisee qu'ici (Node), jamais
// envoyee au navigateur, jamais journalisee.
import { test as base, expect, type BrowserContext, type Page } from '@playwright/test'
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { loadTestEnv } from '../../scripts/lib/test-env.cjs'

export { expect }

export type Role = 'client' | 'artisan' | 'admin'
export interface TestUser {
  id: string
  email: string
  password: string
  role: Role
  fullName: string
}

const env = loadTestEnv() as { url: string; anonKey: string; serviceKey: string }
export const SUPABASE_URL = env.url
export const STORAGE_KEY = 'beti-auth' // lib/supabase.ts : auth.storageKey

/** Identifiant unique de l'execution (pose par global-setup, sinon genere). */
export const RUN_ID = process.env.BETI_RUN_ID || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6))
export const EMAIL_DOMAIN = 'beti-test.invalid'

const noPersist = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }

/** Client service_role : contourne le RLS. A reserver aux fixtures et verifications. */
export const admin: SupabaseClient = createClient(env.url, env.serviceKey, noPersist)
/** Client anonyme (sans session). */
export const anonClient = (): SupabaseClient => createClient(env.url, env.anonKey, noPersist)

/** Client authentifie comme `session` (RLS applique, comme le navigateur). */
export function clientFor(session: Session): SupabaseClient {
  return createClient(env.url, env.anonKey, {
    ...noPersist,
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  })
}

const created: TestUser[] = []
let counter = 0

export async function createTestUser(role: Role, opts: { fullName?: string; metadataRole?: string } = {}): Promise<TestUser> {
  counter += 1
  const email = `qa+${RUN_ID}-${role}-${counter}@${EMAIL_DOMAIN}`
  const password = `Pw-${RUN_ID}-${Math.random().toString(36).slice(2, 10)}!`
  const fullName = opts.fullName ?? `QA ${role} ${counter}`
  // Seul 'artisan' est une valeur d'inscription legitime ; 'admin' est promu apres coup.
  const metaRole = opts.metadataRole ?? (role === 'artisan' ? 'artisan' : 'client')
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: fullName, role: metaRole },
  })
  if (error || !data.user) throw new Error(`createUser(${role}) a echoue : ${error?.message ?? 'pas d\'utilisateur'}`)
  const user: TestUser = { id: data.user.id, email, password, role, fullName }
  created.push(user) // enregistre AVANT toute suite : le cleanup le supprimera meme si la suite echoue

  await waitForProfile(user.id)
  if (role === 'admin') {
    // Promotion explicite par la cle service (le trigger de garde ne s'applique pas a service_role).
    const { error: upErr } = await admin.from('profiles').update({ role: 'admin' }).eq('id', user.id)
    if (upErr) throw new Error(`promotion admin impossible : ${upErr.message}`)
  }
  return user
}

async function waitForProfile(id: string) {
  for (let i = 0; i < 20; i++) {
    const { data } = await admin.from('profiles').select('id').eq('id', id).maybeSingle()
    if (data) return
    await new Promise(r => setTimeout(r, 250))
  }
  throw new Error('profil non cree par le trigger handle_new_user (supabase/profile_trigger.sql / rls_policies.sql non appliques sur le projet de test ?)')
}

export async function signInAndGetSession(user: TestUser): Promise<Session> {
  const { data, error } = await anonClient().auth.signInWithPassword({ email: user.email, password: user.password })
  if (error || !data.session) {
    throw new Error(`signInWithPassword a echoue (${error?.message ?? 'pas de session'}) : Auth e-mail/mot de passe active sur le projet de test ?`)
  }
  return data.session
}

/** Ecrit la session dans le localStorage (cle beti-auth) avant tout script de la page. */
export async function injectSession(target: Page | BrowserContext, session: Session) {
  await target.addInitScript(([key, value]) => {
    try {
      window.localStorage.setItem(key as string, value as string)
      window.localStorage.setItem('beti-lang', 'fr') // les selecteurs des tests sont en francais
    } catch { /* ignore */ }
  }, [STORAGE_KEY, JSON.stringify(session)])
}

/** Fiche artisan complete (Alger), visible dans l'annuaire. */
export async function seedArtisan(user: TestUser, over: Record<string, unknown> = {}) {
  if (user.role !== 'artisan') throw new Error('seedArtisan : le compte doit avoir le role artisan')
  const row = {
    id: user.id,
    category: 'plomberie',
    hourly_rate: 3000,
    bio: 'Plombier QA : fuites, sanitaires, chauffe-eau. Intervention rapide a Alger.',
    location_city: 'Alger',
    lat: 36.7538 + (Math.random() - 0.5) * 0.02,
    lng: 3.0588 + (Math.random() - 0.5) * 0.02,
    years_experience: 8,
    intervention_radius_km: 25,
    is_available: true,
    ...over,
  }
  const { error } = await admin.from('artisans').upsert(row)
  if (error) throw new Error(`seed artisan impossible : ${error.message}`)
  return row
}

/** Reservation en attente entre un client et un artisan (comme BookingFlow). */
export async function seedBooking(client: TestUser, artisan: TestUser, over: Record<string, unknown> = {}) {
  const { data, error } = await admin.from('bookings').insert({
    client_id: client.id,
    artisan_id: artisan.id,
    category: 'plomberie',
    title: 'Fuite QA',
    description: 'Fuite sous evier (donnee de test)',
    address: 'Alger centre',
    scheduled_at: new Date(Date.now() + 3600_000).toISOString(),
    status: 'pending',
    price_agreed: 3000,
    payment_method: 'cash',
    ...over,
  }).select('id').single()
  if (error || !data) throw new Error(`seed reservation impossible : ${error?.message}`)
  return data.id as string
}

/** Suppression d'une table filtree, tolerante (table absente = ignoree). */
async function purge(table: string, col: string, ids: string[]) {
  if (!ids.length) return
  const { error } = await admin.from(table).delete().in(col, ids)
  if (error && !/does not exist|schema cache|relation/i.test(error.message)) {
    console.warn(`[cleanup] ${table}.${col} : ${error.message}`)
  }
}

/** Supprime TOUS les comptes crees par cette execution et leurs donnees. */
export async function cleanup(): Promise<void> {
  const users = created.splice(0)
  if (!users.length) return
  const ids = users.map(u => u.id)
  const { data: bks } = await admin.from('bookings').select('id').or(`client_id.in.(${ids.join(',')}),artisan_id.in.(${ids.join(',')})`)
  const bookingIds = (bks ?? []).map((b: { id: string }) => b.id)
  for (const t of ['reviews', 'messages', 'offers', 'payments', 'notifications']) await purge(t, 'booking_id', bookingIds)
  await purge('bookings', 'id', bookingIds)
  for (const [t, c] of [
    ['reviews', 'artisan_id'], ['reviews', 'client_id'], ['messages', 'sender_id'],
    ['notifications', 'user_id'], ['subscriptions', 'artisan_id'], ['portfolio', 'artisan_id'],
    ['artisan_live_location', 'artisan_id'], ['artisans', 'id'], ['profile_private', 'id'],
  ] as const) await purge(t, c, ids)

  const failures: string[] = []
  for (const u of users) {
    const { error } = await admin.auth.admin.deleteUser(u.id)
    if (error && !/not.?found/i.test(error.message)) failures.push(`${u.email} : ${error.message}`)
  }
  // storage : fichiers deposes par les comptes de test
  for (const u of users) {
    const { data: files } = await admin.storage.from('beti-photos').list(u.id)
    if (files?.length) await admin.storage.from('beti-photos').remove(files.map(f => `${u.id}/${f.name}`))
  }
  if (failures.length) throw new Error(`cleanup incomplet, comptes restants dans le projet de test :\n${failures.join('\n')}`)
}

/** Balayage de securite : supprime les comptes de CETTE execution encore presents. */
export async function sweepRun(): Promise<number> {
  let n = 0
  for (let page = 1; page < 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data.users.length) break
    for (const u of data.users) {
      if (u.email?.startsWith(`qa+${RUN_ID}-`) && u.email.endsWith(`@${EMAIL_DOMAIN}`)) {
        await admin.auth.admin.deleteUser(u.id)
        n++
      }
    }
    if (data.users.length < 200) break
  }
  return n
}

/** Verifie une table optionnelle (migration non appliquee => false). */
export async function tableExists(table: string): Promise<boolean> {
  const { error } = await admin.from(table).select('*', { head: true, count: 'exact' }).limit(1)
  return !error
}

/**
 * Fixture Playwright : `world` expose les helpers et garantit le cleanup apres chaque
 * test, que le test reussisse ou echoue.
 */
export const test = base.extend<{ world: { newUser: typeof createTestUser } }>({
  world: async ({}, use) => {
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      await use({ newUser: createTestUser })
    } finally {
      await cleanup()
    }
  },
})
