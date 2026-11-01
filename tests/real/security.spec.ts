// ATTAQUES : chacune doit ECHOUER cote serveur (RLS / triggers / policies storage).
// Les attaques utilisent la vraie cle anon + la session d'un utilisateur ordinaire,
// exactement comme un attaquant avec l'application. La cle service_role ne sert
// qu'a PREPARER les donnees et a VERIFIER l'etat reel de la base.
// Chaque test comporte un temoin (action legitime qui doit, elle, reussir) afin de
// ne pas passer "au vert" parce que l'API est simplement en panne.
import {
  test, expect, admin, anonClient, clientFor, createTestUser, signInAndGetSession,
  seedArtisan, tableExists, RUN_ID,
} from './fixtures'

const EMERGENCY = 'supabase/emergency_hardening.sql non appliqué sur le projet de test'
const PRIVACY = 'supabase/privacy_hardening.sql non appliqué sur le projet de test'

// PNG 1x1 valide (le bucket n'accepte que jpeg/png/webp apres emergency_hardening).
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

test.describe('attaques de securite (doivent echouer)', () => {
  test('un client ne peut pas se promouvoir admin par UPDATE profiles', async ({ world }) => {
    void world
    const victim = await createTestUser('client')
    const c = clientFor(await signInAndGetSession(victim))

    // Temoin : la modification legitime de son propre profil fonctionne.
    const newName = `Renomme ${RUN_ID}`
    const ok = await c.from('profiles').update({ full_name: newName }).eq('id', victim.id)
    expect(ok.error, 'temoin : un utilisateur doit pouvoir modifier son propre nom').toBeNull()

    // Attaque.
    await c.from('profiles').update({ role: 'admin' }).eq('id', victim.id)
    await c.from('profiles').update({ role: 'admin', is_verified: true }).eq('id', victim.id)

    const { data } = await admin.from('profiles').select('role, is_verified, full_name').eq('id', victim.id).single()
    expect(data?.full_name, 'temoin : le nom doit avoir change').toBe(newName)
    expect(data?.role, `ESCALADE DE PRIVILEGE : le role est devenu ${data?.role} (${EMERGENCY})`).toBe('client')
    expect(data?.is_verified, `auto-verification possible (${EMERGENCY})`).not.toBe(true)
  })

  test("l'inscription avec metadata role=admin donne un compte client", async ({ world }) => {
    void world
    const evil = await createTestUser('client', { metadataRole: 'admin' })
    const { data } = await admin.from('profiles').select('role').eq('id', evil.id).single()
    expect(data?.role, `inscription en admin possible via user_metadata (${EMERGENCY})`).toBe('client')

    // Temoin : le role artisan, lui, reste accepte a l'inscription.
    const art = await createTestUser('client', { metadataRole: 'artisan' })
    const { data: a } = await admin.from('profiles').select('role').eq('id', art.id).single()
    expect(a?.role, "temoin : l'inscription artisan doit rester possible").toBe('artisan')
  })

  test("un artisan ne peut pas s'attribuer le plan premium (INSERT ni UPDATE)", async ({ world }) => {
    void world
    const attacker = await createTestUser('artisan')
    const control = await createTestUser('artisan')
    const base = (id: string) => ({ id, category: 'plomberie', hourly_rate: 2500, bio: 'QA plan', location_city: 'Alger', lat: 36.75, lng: 3.05, is_available: true })

    // Temoin : un insert normal (plan free) passe pour un artisan ordinaire.
    const ctl = await clientFor(await signInAndGetSession(control)).from('artisans').insert(base(control.id))
    expect(ctl.error, 'temoin : un artisan doit pouvoir creer sa fiche (sinon test non concluant)').toBeNull()

    // Attaque 1 : INSERT avec plan premium + validite lointaine + statistiques truquees.
    const c = clientFor(await signInAndGetSession(attacker))
    await c.from('artisans').insert({ ...base(attacker.id), plan: 'premium', plan_until: '2099-01-01T00:00:00Z', rating_avg: 5, rating_count: 999, total_missions: 999 })
    const { data: row } = await admin.from('artisans').select('plan, plan_until, rating_avg, rating_count, total_missions').eq('id', attacker.id).maybeSingle()
    if (row) {
      expect(row.plan, `PREMIUM GRATUIT par INSERT (${EMERGENCY})`).toBe('free')
      expect(row.plan_until).toBeNull()
      expect(Number(row.rating_count), `statistiques falsifiables a l'INSERT (${EMERGENCY})`).toBe(0)
      expect(Number(row.total_missions)).toBe(0)
    } // pas de ligne : l'insert a ete refuse, c'est aussi une protection valide

    // Attaque 2 : UPDATE du plan sur sa propre fiche.
    await seedArtisan(attacker)
    await c.from('artisans').update({ plan: 'premium', plan_until: '2099-01-01T00:00:00Z' }).eq('id', attacker.id)
    const { data: after } = await admin.from('artisans').select('plan').eq('id', attacker.id).single()
    expect(after?.plan, 'PREMIUM GRATUIT par UPDATE (trigger guard_artisan_plan, supabase/subscriptions_schema.sql / security_hardening.sql)').toBe('free')
  })

  test("storage : impossible de supprimer, remplacer ou lister l'objet d'un autre", async ({ world }) => {
    void world
    const victim = await createTestUser('client')
    const attacker = await createTestUser('client')
    const v = clientFor(await signInAndGetSession(victim))
    const a = clientFor(await signInAndGetSession(attacker))
    const path = `${victim.id}/qa-${RUN_ID}.png`

    const up = await v.storage.from('beti-photos').upload(path, PNG, { contentType: 'image/png' })
    expect(up.error, 'temoin : le proprietaire doit pouvoir deposer sa photo (bucket beti-photos public cree ?)').toBeNull()
    const sizeOf = async () => {
      const { data } = await admin.storage.from('beti-photos').download(path)
      return data ? (await data.arrayBuffer()).byteLength : -1
    }
    expect(await sizeOf()).toBe(PNG.length)

    // Suppression par un autre.
    await a.storage.from('beti-photos').remove([path])
    expect(await sizeOf(), `L'OBJET D'UN AUTRE A ETE SUPPRIME (${EMERGENCY})`).toBe(PNG.length)

    // Remplacement (upsert) par un autre, avec un contenu different.
    const evil = Buffer.concat([PNG, Buffer.from('EVIL')])
    await a.storage.from('beti-photos').upload(path, evil, { contentType: 'image/png', upsert: true })
    expect(await sizeOf(), `L'OBJET D'UN AUTRE A ETE REMPLACE (${EMERGENCY})`).toBe(PNG.length)

    // Listage du dossier d'un autre par un connecte.
    const ls = await a.storage.from('beti-photos').list(victim.id)
    expect(ls.data ?? [], `un connecte liste le dossier d'un autre (${EMERGENCY})`).toHaveLength(0)
  })

  test('storage : le listage anonyme du bucket beti-photos est refuse', async ({ world }) => {
    void world
    const victim = await createTestUser('client')
    const v = clientFor(await signInAndGetSession(victim))
    const path = `${victim.id}/qa-list-${RUN_ID}.png`
    const up = await v.storage.from('beti-photos').upload(path, PNG, { contentType: 'image/png' })
    expect(up.error, 'temoin : depot de la photo').toBeNull()

    const root = await anonClient().storage.from('beti-photos').list('')
    expect(root.data ?? [], `listage anonyme de la racine du bucket (${EMERGENCY})`).toHaveLength(0)
    const dir = await anonClient().storage.from('beti-photos').list(victim.id)
    expect(dir.data ?? [], `listage anonyme d'un dossier utilisateur (${EMERGENCY})`).toHaveLength(0)
    // Temoin : la lecture publique par URL directe, elle, reste possible (affichage des avatars).
    const pub = anonClient().storage.from('beti-photos').getPublicUrl(path).data.publicUrl
    expect((await fetch(pub)).status, 'temoin : une photo publique doit rester affichable').toBe(200)
  })

  test("RPC update_artisan_location refusee sur la fiche d'un autre (et sans connexion)", async ({ world }) => {
    void world
    const owner = await createTestUser('artisan')
    const attacker = await createTestUser('artisan')
    await seedArtisan(owner)
    await seedArtisan(attacker)
    const o = clientFor(await signInAndGetSession(owner))
    const a = clientFor(await signInAndGetSession(attacker))
    const move = { latitude: 10.0, longitude: 10.0 }

    // Temoin : le proprietaire peut deplacer sa propre position.
    const own = await o.rpc('update_artisan_location', { artisan_id: owner.id, ...move })
    expect(own.error?.message, 'temoin : la RPC doit fonctionner pour le proprietaire (fonction hors depot SQL absente ? PostGIS ?)').toBeUndefined()

    const before = (await admin.from('artisans').select('location').eq('id', owner.id).single()).data
    const hit = await a.rpc('update_artisan_location', { artisan_id: owner.id, latitude: 0.5, longitude: 0.5 })
    expect(hit.error, `ATTAQUE ACCEPTEE : position d'un autre artisan modifiee (${EMERGENCY})`).not.toBeNull()
    expect(hit.error?.code, 'la RPC est introuvable : test non concluant').not.toBe('PGRST202')
    const after = (await admin.from('artisans').select('location').eq('id', owner.id).single()).data
    expect(after).toEqual(before)

    const anon = await anonClient().rpc('update_artisan_location', { artisan_id: owner.id, latitude: 0.5, longitude: 0.5 })
    expect(anon.error, `RPC appelable sans connexion (${EMERGENCY})`).not.toBeNull()
  })

  test("profiles.phone d'un autre utilisateur est masque", async ({ world }) => {
    void world
    test.fixme(!(await tableExists('profile_private')), `${PRIVACY} : la table profile_private est absente, les telephones sont encore lisibles par tous.`)
    const victim = await createTestUser('artisan')
    const attacker = await createTestUser('client')
    const phone = '0555' + String(Date.now()).slice(-6)
    await admin.from('profile_private').upsert({ id: victim.id, phone })
    await admin.from('profiles').update({ phone }).eq('id', victim.id)
    const a = clientFor(await signInAndGetSession(attacker))

    const prof = await a.from('profiles').select('phone').eq('id', victim.id).maybeSingle()
    expect(prof.data?.phone ?? null, `TELEPHONE D'UN AUTRE LISIBLE dans profiles.phone (${PRIVACY})`).toBeNull()
    const priv = await a.from('profile_private').select('phone').eq('id', victim.id)
    expect(priv.data ?? [], `TELEPHONE D'UN AUTRE LISIBLE dans profile_private (${PRIVACY})`).toHaveLength(0)

    // Temoin : la victime lit son propre numero.
    const own = await clientFor(await signInAndGetSession(victim)).from('profile_private').select('phone').eq('id', victim.id).maybeSingle()
    expect(own.data?.phone, 'temoin : le proprietaire doit lire son telephone').toBe(phone)
  })
})
