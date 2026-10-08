// lib/phones.ts
// Les téléphones vivent dans `profile_private` (RLS : soi, admin, parties d'une
// réservation). Ces helpers sont TOLÉRANTS : si la migration
// supabase/privacy_hardening.sql n'est pas encore passée (table absente) ou si
// la lecture est refusée, ils renvoient un résultat vide et l'appelant retombe
// sur l'ancienne valeur `profiles.phone` (qui existe tant que le SQL n'est pas
// exécuté, puis vaut toujours NULL).

import { supabase } from './supabase'

/** Téléphones lisibles par l'utilisateur courant, indexés par id de profil. */
export async function fetchPhones(ids: (string | null | undefined)[]): Promise<Record<string, string>> {
  const uniq = Array.from(new Set(ids.filter((x): x is string => !!x)))
  if (uniq.length === 0) return {}
  try {
    const { data, error } = await supabase.from('profile_private').select('id, phone').in('id', uniq)
    if (error || !data) return {}
    const out: Record<string, string> = {}
    for (const r of data as { id: string; phone: string | null }[]) if (r.phone) out[r.id] = r.phone
    return out
  } catch { return {} }
}

/** Téléphone de l'utilisateur connecté (chaîne vide si inconnu). */
export async function fetchMyPhone(uid: string, legacy?: string | null): Promise<string> {
  const m = await fetchPhones([uid])
  return m[uid] || legacy || ''
}

/**
 * Un AUTRE compte utilise-t-il déjà ce numéro ? (RPC security definer, booléen
 * uniquement). Repli sur l'ancienne requête directe si la RPC n'existe pas encore.
 */
export async function phoneTaken(phone: string, selfId?: string | null): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('phone_exists', { p_phone: phone })
    if (!error && typeof data === 'boolean') return data
  } catch { /* RPC absente -> repli */ }
  try {
    let q = supabase.from('profiles').select('id').eq('phone', phone)
    if (selfId) q = q.neq('id', selfId)
    const { data } = await q.limit(1)
    return !!(data && data.length > 0)
  } catch { return false }
}
