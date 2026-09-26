import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')).trim(),l.slice(l.indexOf('=')+1).trim()]))
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!key) { console.log('SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local'); process.exit(1) }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, key)

// Comptes de test à retirer des listings (on ne touche qu'à la table `artisans`,
// les profils/auth restent — réversible via l'onboarding artisan).
const IDS = [
  '0fff1b34-81b3-45dc-97cb-d4a436c852c1', // belabrikabderaouf902 (cat autre, 0 avis)
  '41a58164-6b52-42a6-b192-4002e582b06f', // salah (plomberie test, num FR, 0 avis)
]

const apply = process.argv.includes('--apply')

// Vérifs de sécurité : refuser si un de ces artisans a des réservations/avis réels.
for (const id of IDS) {
  const { count: bk } = await sb.from('bookings').select('id', { count: 'exact', head: true }).eq('artisan_id', id)
  const { count: rv } = await sb.from('reviews').select('id', { count: 'exact', head: true }).eq('artisan_id', id)
  console.log(`${id} → ${bk ?? 0} réservation(s), ${rv ?? 0} avis`)
  if ((bk ?? 0) > 0 || (rv ?? 0) > 0) {
    console.log('  ⚠ a de l\'activité réelle → ignoré par sécurité')
    IDS.splice(IDS.indexOf(id), 1)
  }
}

if (!apply) {
  console.log('\n(dry-run) Relance avec --apply pour supprimer les lignes artisans ci-dessus.')
  process.exit(0)
}

const { error } = await sb.from('artisans').delete().in('id', IDS)
if (error) { console.log('ERREUR suppression:', error.message); process.exit(1) }
console.log(`\n✓ ${IDS.length} ligne(s) artisans supprimée(s). Les profils/auth sont conservés.`)
