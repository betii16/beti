// Diagnostic upload photo de profil — exécute les mêmes appels que le navigateur (clé anon)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// 1. Le bucket existe-t-il ?
const { data: list, error: listErr } = await supabase.storage.from('beti-photos').list('avatars', { limit: 3 })
console.log('1. LIST bucket beti-photos/avatars:', listErr ? `ERREUR → ${listErr.message}` : `OK (${list.length} fichiers visibles)`)

// 2. Upload anonyme d'un fichier test (reproduit le code du composant)
const blob = new Blob(['diag'], { type: 'image/png' })
const path = `avatars/diag_${Date.now()}.png`
const { error: upErr } = await supabase.storage.from('beti-photos').upload(path, blob, { upsert: true })
console.log('2. UPLOAD test (anonyme):', upErr ? `ERREUR → ${upErr.message}` : 'OK (!! upload anonyme autorisé)')
if (!upErr) await supabase.storage.from('beti-photos').remove([path])

// 3. RLS sur profiles : un anonyme peut-il lire / écrire ?
const { data: profs, error: selErr } = await supabase.from('profiles').select('id, avatar_url').limit(1)
console.log('3. SELECT profiles (anonyme):', selErr ? `ERREUR → ${selErr.message}` : `OK (${profs.length} ligne, RLS lecture ouverte ou désactivée)`)
if (profs?.length) {
  const { data: upd, error: updErr } = await supabase.from('profiles').update({ avatar_url: profs[0].avatar_url }).eq('id', profs[0].id).select()
  // Avec RLS actif, l'UPDATE anonyme ne renvoie pas d'erreur : il touche simplement 0 ligne.
  const verdict = updErr ? `ERREUR → ${updErr.message} (RLS actif ✅)`
    : (upd && upd.length > 0) ? 'OK, 1 ligne modifiée (!! écriture anonyme autorisée — RLS ABSENT ❌)'
    : '0 ligne modifiée (RLS actif ✅ — la policy filtre les anonymes)'
  console.log('4. UPDATE profiles (anonyme):', verdict)
}
