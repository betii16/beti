/* eslint-disable */
// Chargement SECURISE de la configuration du projet Supabase de TEST.
// Regles :
//  - tout vient de `.env.test.local` (fichier ignore par git), jamais de process.env,
//    pour qu'une cle de production exportee dans le shell ne soit jamais utilisee ;
//  - refus immediat (exit 1) si la reference de production apparait n'importe ou
//    (URL, cles JWT, contenu du fichier) ou si une cle n'appartient pas au projet de l'URL ;
//  - aucune valeur secrete n'est jamais affichee.
const fs = require('node:fs')
const path = require('node:path')

const PROD_REF = 'cqsejaarturvbilyvbfs'
const REQUIRED = ['TEST_SUPABASE_URL', 'TEST_SUPABASE_ANON_KEY', 'TEST_SUPABASE_SERVICE_ROLE_KEY']

function envFilePath() {
  return path.resolve(process.env.BETI_TEST_ENV_FILE || path.join(process.cwd(), '.env.test.local'))
}

function parseEnv(text) {
  const out = {}
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    else v = v.replace(/\s+#.*$/, '')
    out[m[1]] = v
  }
  return out
}

function jwtRef(token) {
  try {
    const p = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
    return typeof p.ref === 'string' ? p.ref : null
  } catch { return null }
}

/** Retourne { ok, problems: string[], env, file }. N'affiche rien, ne quitte pas. */
function checkTestEnv() {
  const file = envFilePath()
  const problems = []
  if (!fs.existsSync(file)) {
    problems.push(`Fichier de configuration absent : ${file}`)
    problems.push('Copie .env.test.local.example en .env.test.local et renseigne le projet Supabase de TEST (voir scripts/test-project-checklist.md).')
    return { ok: false, problems, env: null, file }
  }
  const text = fs.readFileSync(file, 'utf8')
  if (text.includes(PROD_REF)) problems.push(`REFUSE : le fichier contient la reference de PRODUCTION (${PROD_REF}). Ce harnais ne tourne que contre un projet de TEST.`)
  const vars = parseEnv(text)
  const missing = REQUIRED.filter(k => !vars[k])
  if (missing.length) problems.push(`Variables manquantes ou vides : ${missing.join(', ')}`)
  if (!missing.includes('TEST_SUPABASE_URL')) {
    let host = ''
    try { host = new URL(vars.TEST_SUPABASE_URL).hostname } catch { problems.push("TEST_SUPABASE_URL n'est pas une URL valide.") }
    const urlRef = host.endsWith('.supabase.co') ? host.split('.')[0] : null
    for (const k of ['TEST_SUPABASE_ANON_KEY', 'TEST_SUPABASE_SERVICE_ROLE_KEY']) {
      if (!vars[k]) continue
      const r = jwtRef(vars[k])
      if (r === PROD_REF) problems.push(`REFUSE : ${k} appartient au projet de PRODUCTION.`)
      else if (urlRef && r && r !== urlRef) problems.push(`${k} n'appartient pas au projet de TEST_SUPABASE_URL (references differentes).`)
    }
  }
  if (vars.TEST_SUPABASE_ANON_KEY && vars.TEST_SUPABASE_ANON_KEY === vars.TEST_SUPABASE_SERVICE_ROLE_KEY) {
    problems.push('TEST_SUPABASE_ANON_KEY et TEST_SUPABASE_SERVICE_ROLE_KEY sont identiques.')
  }
  if (problems.length) return { ok: false, problems, env: null, file }
  return {
    ok: true, problems: [], file,
    env: {
      url: vars.TEST_SUPABASE_URL.replace(/\/+$/, ''),
      anonKey: vars.TEST_SUPABASE_ANON_KEY,
      serviceKey: vars.TEST_SUPABASE_SERVICE_ROLE_KEY,
    },
  }
}

/** Version qui quitte le process (exit 1) avec un message clair si la config est refusee. */
function loadTestEnv() {
  const r = checkTestEnv()
  if (!r.ok) {
    console.error("\n[tests/real] CONFIGURATION REFUSEE - aucun test n'est execute.")
    for (const p of r.problems) console.error('  - ' + p)
    console.error('')
    process.exit(1)
  }
  return r.env
}

module.exports = { PROD_REF, REQUIRED, envFilePath, checkTestEnv, loadTestEnv }
