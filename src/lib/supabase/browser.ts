// Client Supabase du navigateur : temps réel (messages, notifications) et envoi
// de photos. Il partage la session (cookies) avec le serveur.

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '')
}
