import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')).trim(),l.slice(l.indexOf('=')+1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function cols(table){
  const { data, error } = await sb.from(table).select('*').limit(1)
  if (error) return `ERREUR → ${error.message}`
  return data && data.length ? Object.keys(data[0]).join(', ') : '(table vide — colonnes inconnues via anon)'
}
console.log('reviews   :', await cols('reviews'))
console.log('bookings  :', await cols('bookings'))
console.log('artisans  :', await cols('artisans'))
const { error: pErr } = await sb.from('portfolio_posts').select('id').limit(1)
console.log('portfolio_posts existe ?', pErr ? `NON (${pErr.message})` : 'OUI')
const { data: st } = await sb.from('bookings').select('status')
console.log('statuts bookings présents :', st ? [...new Set(st.map(b=>b.status))].join(', ') || '(aucune ligne)' : 'n/a')
