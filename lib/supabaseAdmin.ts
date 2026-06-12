// lib/supabaseAdmin.ts
// Client Supabase SERVICE-ROLE — SERVEUR UNIQUEMENT.
// ⚠️ La clé service-role contourne TOUTES les policies RLS. Ne jamais
//    l'importer côté client. Réservé aux Route Handlers de paiement, qui
//    écrivent la table payments et confirment les bookings de façon fiable.

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

let cached: SupabaseClient | null = null

export function getAdminClient(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error('Supabase admin non configuré (SUPABASE_SERVICE_ROLE_KEY manquante).')
  }
  if (!cached) {
    cached = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return cached
}
