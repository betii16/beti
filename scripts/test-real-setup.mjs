// Diagnostic de la configuration des tests reels. N'affiche AUCUN secret.
// Usage : npm run test:real:setup
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { checkTestEnv, envFilePath, PROD_REF } = require('./lib/test-env.cjs')

const r = checkTestEnv()
console.log('Diagnostic des tests reels BETI')
console.log('  fichier de config : ' + envFilePath())
if (!r.ok) {
  console.error('\nCONFIGURATION REFUSEE :')
  for (const p of r.problems) console.error('  - ' + p)
  console.error('\nRien n\'a ete contacte. Suis scripts/test-project-checklist.md.')
  process.exit(1)
}

const { url, anonKey, serviceKey } = r.env
const host = new URL(url).host
console.log('  projet de test    : ' + host + ' (reference de production ' + PROD_REF.slice(0, 4) + '... absente : OK)')
console.log('  cle anon          : presente')
console.log('  cle service_role  : presente (jamais affichee)')

let failed = false
const check = (ok, label, hint) => {
  console.log('  [' + (ok ? 'OK' : 'KO') + '] ' + label)
  if (!ok) { failed = true; if (hint) console.log('       -> ' + hint) }
}
const get = async (path, key) => {
  try {
    const res = await fetch(url + path, { headers: { apikey: key, Authorization: 'Bearer ' + key } })
    return { status: res.status, json: await res.json().catch(() => null) }
  } catch (e) { return { status: 0, json: null, err: e.cause?.code || e.message } }
}

console.log('\nConnectivite :')
const settings = await get('/auth/v1/settings', anonKey)
check(settings.status === 200, 'API Auth joignable avec la cle anon', settings.err ? 'Reseau : ' + settings.err : 'HTTP ' + settings.status + ' : cle anon ou URL incorrecte ?')
if (settings.status === 200) {
  check(settings.json?.external?.email !== false, 'Auth e-mail / mot de passe active', 'Authentication > Providers > Email : activer (necessaire a signInWithPassword)')
}
const admin = await get('/auth/v1/admin/users?per_page=1', serviceKey)
check(admin.status === 200, 'cle service_role acceptee (API admin)', 'HTTP ' + admin.status + ' : cle service_role incorrecte ?')
const bucket = await get('/storage/v1/bucket/beti-photos', serviceKey)
check(bucket.status === 200, 'bucket de stockage beti-photos present', 'Storage > New bucket > beti-photos (public)')
const prof = await get('/rest/v1/profiles?select=id&limit=1', serviceKey)
check(prof.status === 200, 'table profiles accessible', 'executer rls_policies.sql et le reste de la chaine SQL')
const priv = await get('/rest/v1/profile_private?select=id&limit=1', serviceKey)
check(priv.status === 200, 'table profile_private presente (privacy_hardening.sql applique)', 'sinon le test de masquage des telephones sera marque fixme')

console.log(failed ? '\nDiagnostic : des points sont a corriger avant de lancer npm run test:real.' : '\nDiagnostic : configuration prete. Lance npm run test:real.')
process.exit(failed ? 1 : 0)
