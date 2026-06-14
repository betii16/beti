import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')).trim(),l.slice(l.indexOf('=')+1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
async function checkCols(table, cols){
  for (const c of cols){
    const { error } = await sb.from(table).select(c).limit(1)
    console.log(`  ${table}.${c} :`, error ? `❌ ${error.message}` : '✅')
  }
}
async function checkTable(t){
  const { error } = await sb.from(t).select('id').limit(1)
  console.log(`table ${t} :`, error ? `❌ ${error.message}` : '✅ existe')
}
console.log('— BOOKINGS (mode paiement / prix) —')
await checkCols('bookings', ['payment_method','price_agreed','category','scheduled_at'])
console.log('— OFFERS (négociation) —')
await checkTable('offers')
console.log('— PAYMENTS (séquestre/compta) —')
await checkTable('payments')
console.log('— MESSAGES (chat) —')
await checkTable('messages')
await checkCols('messages', ['sender_name','sender_role','content'])
