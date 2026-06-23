import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')).trim(),l.slice(l.indexOf('=')+1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
// Sonde NON CONNECTEE (anon). Les tables privees doivent renvoyer 0 ligne.
async function probePrivate(t){
  const { data, error } = await sb.from(t).select('*').limit(5)
  if (error) { console.log(`  ${t} : ✅ verrouille (${error.message})`); return }
  const n = data?.length ?? 0
  console.log(`  ${t} :`, n === 0 ? '✅ 0 ligne (RLS OK)' : `🔴 ${n} ligne(s) LISIBLES par un visiteur !`)
}
async function probePublic(t, sensitive){
  const { data, error } = await sb.from(t).select('*').limit(1)
  if (error) { console.log(`  ${t} : ⚠️ illisible (${error.message})`); return }
  const row = data?.[0]
  const leak = row && sensitive ? sensitive.filter(c => row[c] != null) : []
  console.log(`  ${t} : lecture publique OK`, leak.length ? `🔴 expose : ${leak.join(', ')}` : '')
}
console.log('— TABLES PRIVEES (doivent renvoyer 0 ligne pour un anon) —')
for (const t of ['payments','notifications','bookings','messages','offers']) await probePrivate(t)
console.log('— TABLES PUBLIQUES (lecture attendue ; on traque les fuites) —')
await probePublic('profiles', ['phone'])
await probePublic('artisans', null)
await probePublic('reviews', null)
