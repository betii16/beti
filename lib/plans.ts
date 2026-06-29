// lib/plans.ts
// Source de vérité des abonnements artisans BETI (modèle annuaire + abonnements,
// aucune commission sur les prestations — cf. lib/payment-config.ts).
// Deux formules : Basic et Premium, payables au mois ou à l'année (économie).
// Période de lancement : gratuite pour les artisans jusqu'à LAUNCH + 2 mois.

export type PlanId = 'basic' | 'premium'
export type BillingCycle = 'monthly' | 'yearly'

export interface Plan {
  id: PlanId
  name: string
  tagline: string
  monthly: number // DA / mois
  yearly: number  // DA / an
  highlighted: boolean
}

export const PLANS: Record<PlanId, Plan> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    tagline: 'L’essentiel pour être trouvé et recevoir des clients.',
    monthly: 2500,
    yearly: 20000,
    highlighted: false,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    tagline: 'Plus de visibilité, plus de clients, plus d’outils.',
    monthly: 5000,
    yearly: 50000,
    highlighted: true,
  },
}

export const PLAN_LIST: Plan[] = [PLANS.basic, PLANS.premium]

// Matrice des avantages. `true` = inclus, `false` = non inclus, string = détail.
export interface Feature {
  label: string
  basic: boolean | string
  premium: boolean | string
}

export const FEATURES: Feature[] = [
  { label: 'Profil professionnel vérifié',                  basic: true,    premium: true },
  { label: 'Présence dans l’annuaire et la recherche',      basic: true,    premium: true },
  { label: 'Demandes clients illimitées (messages & appels)', basic: true,  premium: true },
  { label: 'Avis et notes clients',                          basic: true,   premium: true },
  { label: 'Photos de réalisations',                         basic: '6 max', premium: 'Illimité' },
  { label: 'Priorité d’affichage dans les résultats',       basic: false,   premium: true },
  { label: 'Badge Premium',                                  basic: false,  premium: true },
  { label: 'Mise en avant sur la carte et l’accueil',        basic: false,  premium: true },
  { label: 'Statistiques détaillées (vues, demandes, taux de réponse)', basic: false, premium: true },
  { label: 'Support prioritaire',                            basic: false,  premium: true },
]

/** Prix affiché pour une formule selon le cycle choisi. */
export function priceFor(plan: Plan, cycle: BillingCycle): number {
  return cycle === 'monthly' ? plan.monthly : plan.yearly
}

/** Économie annuelle vs 12 mois, en DA. */
export function yearlySavings(plan: Plan): number {
  return plan.monthly * 12 - plan.yearly
}

/** Économie annuelle exprimée en « mois offerts » (arrondi). */
export function freeMonths(plan: Plan): number {
  return Math.round(yearlySavings(plan) / plan.monthly)
}

// ── Période de lancement gratuite (2 mois) ───────────────────────────────────
const LAUNCH_FALLBACK = '2026-07-01T00:00:00Z'
const launchRaw = process.env.NEXT_PUBLIC_LAUNCH_DATE || LAUNCH_FALLBACK
const launchParsed = new Date(launchRaw)
export const LAUNCH_DATE = isNaN(launchParsed.getTime()) ? new Date(LAUNCH_FALLBACK) : launchParsed
export const SUB_FREE_UNTIL = new Date(LAUNCH_DATE)
SUB_FREE_UNTIL.setMonth(SUB_FREE_UNTIL.getMonth() + 2)

/** Les artisans sont-ils encore en période gratuite de lancement ? */
export function isLaunchFree(now: Date = new Date()): boolean {
  return now < SUB_FREE_UNTIL
}
