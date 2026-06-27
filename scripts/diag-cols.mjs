import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')).trim(),l.slice(l.indexOf('=')+1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// Colonnes que prelaunch_schema.sql doit garantir, par table
const checks = {
  profiles:      ['avatar_url','notif_email','notif_sms'],
  bookings:      ['category','title','description','address','price_agreed','scheduled_at'],
  messages:      ['sender_name','sender_role','content'],
  notifications: ['message','is_read'],
  reviews:       ['photos','comment'],
}

for (const [table, columns] of Object.entries(checks)) {
  for (const col of columns) {
    const { error } = await sb.from(table).select(col).limit(1)
    const ok = !error
    const tag = ok ? 'OK    ' : 'MANQUE'
    console.log(`${tag}  ${table}.${col}${ok ? '' : '  → ' + error.message}`)
  }
}
