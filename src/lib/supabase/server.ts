// Client Supabase côté serveur (composants serveur, actions, routes). Il agit
// avec la session de la personne connectée : les règles RLS s'appliquent.
// Un client par requête, jamais partagé.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Configuration Supabase absente : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  }
  const cookieStore = await cookies()
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Un composant serveur ne peut pas écrire de cookie : sans gravité, le
          // proxy (src/lib/supabase/session.ts) renouvelle la session à chaque page.
        }
      },
    },
  })
}
