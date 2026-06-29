// lib/subscription.ts
// Couche données des abonnements artisans (cf. supabase/subscriptions_schema.sql,
// lib/plans.ts). Tout passe par RLS : l'artisan ne voit/insère que les siens,
// seul l'admin valide. Le plan EFFECTIF est lu sur artisans.plan / plan_until.

import { supabase } from './supabase'
import type { PlanId, BillingCycle } from './plans'

export type SubStatus = 'pending' | 'active' | 'rejected' | 'expired' | 'cancelled'

export interface Subscription {
  id: string
  artisan_id: string
  plan: PlanId
  cycle: BillingCycle
  amount: number
  status: SubStatus
  payment_method: string
  payment_ref: string | null
  note: string | null
  started_at: string | null
  expires_at: string | null
  reviewed_at: string | null
  created_at: string
}

/** Plan effectif d'un artisan à partir de sa ligne `artisans` (défensif : si la
 *  colonne plan n'existe pas encore ou est expirée → 'free'). */
export function effectivePlan(artisan: { plan?: string | null; plan_until?: string | null } | null): 'free' | PlanId {
  if (!artisan?.plan || artisan.plan === 'free') return 'free'
  if (artisan.plan_until && new Date(artisan.plan_until) < new Date()) return 'free'
  return artisan.plan === 'premium' ? 'premium' : 'basic'
}

export function isPremium(artisan: { plan?: string | null; plan_until?: string | null } | null): boolean {
  return effectivePlan(artisan) === 'premium'
}

/** Crée une demande d'abonnement (status 'pending'), à valider par un admin. */
export async function submitSubscriptionRequest(opts: {
  artisanId: string
  plan: PlanId
  cycle: BillingCycle
  amount: number
  method?: string
  ref?: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.from('subscriptions').insert({
    artisan_id: opts.artisanId,
    plan: opts.plan,
    cycle: opts.cycle,
    amount: opts.amount,
    payment_method: opts.method || 'transfer',
    payment_ref: opts.ref || null,
    status: 'pending',
  })
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

/** Plan effectif de plusieurs artisans d'un coup (lecture publique de artisans.plan).
 *  Sert à prioriser/afficher les Premium dans les listings sans toucher au RPC. */
export async function fetchPlans(ids: string[]): Promise<Record<string, 'free' | PlanId>> {
  const map: Record<string, 'free' | PlanId> = {}
  const unique = Array.from(new Set(ids.filter(Boolean)))
  if (unique.length === 0) return map
  const { data, error } = await supabase.from('artisans').select('id, plan, plan_until').in('id', unique)
  if (error || !data) return map
  for (const row of data as { id: string; plan?: string | null; plan_until?: string | null }[]) {
    map[row.id] = effectivePlan(row)
  }
  return map
}

/** Dernière demande/abonnement de l'artisan connecté (pour afficher son statut). */
export async function getMyLatestSubscription(artisanId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('artisan_id', artisanId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return (data as Subscription) || null
}
