import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')).trim(),l.slice(l.indexOf('=')+1).trim()]))
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, key)

const { data, error } = await sb
  .from('artisans')
  .select('id, category, rating_avg, rating_count, total_missions, is_available, plan, plan_until, created_at, profiles(full_name, phone)')
  .order('created_at', { ascending: true })

if (error) { console.log('ERREUR:', error.message); process.exit(1) }
console.log(`\n${data.length} artisan(s) réel(s) en base :\n`)
for (const a of data) {
  console.log(`- ${a.id}`)
  console.log(`    nom: ${a.profiles?.full_name || '(sans nom)'} | tel: ${a.profiles?.phone || '—'}`)
  console.log(`    cat: ${a.category} | note: ${a.rating_avg ?? 0} (${a.rating_count ?? 0} avis) | missions: ${a.total_missions ?? 0} | dispo: ${a.is_available}`)
  console.log(`    plan: ${a.plan || 'free'} | créé: ${a.created_at?.slice(0,10)}`)
}
console.log('')
