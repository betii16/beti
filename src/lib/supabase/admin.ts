// Client Supabase avec la clé service : il contourne toutes les règles d'accès.
// Serveur uniquement, et pour une seule chose : la suppression de compte
// (deleteAccount, src/lib/auth/actions.ts). Ne l'importer nulle part ailleurs.

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/** null si la clé n'est pas configurée (SUPABASE_SERVICE_ROLE_KEY, jamais préfixée NEXT_PUBLIC_). */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
