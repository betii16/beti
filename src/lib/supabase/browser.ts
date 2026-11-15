// Client Supabase du navigateur : temps réel (messages, notifications) et envoi
// de photos. Il partage la session (cookies) avec le serveur.

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

export function createClient() {
  return createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '')
}
