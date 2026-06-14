// lib/payment-config.ts
// Règles de commission BETI — partagées client ET serveur (aucun secret ici).
// Le SERVEUR recalcule toujours ces montants à partir du prix en base ; les
// valeurs côté client ne servent qu'à l'affichage.

// Taux de commission sur les paiements par CARTE uniquement (le cash = 0%).
export const COMMISSION_RATE = 0.10

// Paiement carte (SATIM) activé ? Tant que le compte marchand SATIM n'est pas
// en place, on lance en CASH-ONLY : l'option carte est masquée et le cash est
// le mode par défaut. Le jour où SATIM est prêt, mettre NEXT_PUBLIC_CARD_ENABLED
// = 'true' dans Vercel (Production) — aucun changement de code nécessaire.
export const CARD_ENABLED = process.env.NEXT_PUBLIC_CARD_ENABLED === 'true'

// Lancement + 3 mois gratuits : aucune commission n'est prélevée avant cette
// date. Configurable SANS toucher au code via la variable d'environnement
// NEXT_PUBLIC_LAUNCH_DATE (format ISO, ex. « 2026-07-01 »). À défaut, on
// retombe sur la date ci-dessous. ⚠️ Mets la VRAIE date de lancement le jour J.
const LAUNCH_FALLBACK = '2026-06-12T00:00:00Z'
const launchRaw = process.env.NEXT_PUBLIC_LAUNCH_DATE || LAUNCH_FALLBACK
const launchParsed = new Date(launchRaw)
export const LAUNCH_DATE = isNaN(launchParsed.getTime()) ? new Date(LAUNCH_FALLBACK) : launchParsed
export const FREE_UNTIL = new Date(LAUNCH_DATE)
FREE_UNTIL.setMonth(FREE_UNTIL.getMonth() + 3)

// Qui supporte la commission ?
//   false (défaut) → déduite de la part artisan. Le client paie le prix affiché,
//                     donc la carte ne coûte PAS plus cher que le cash.
//   true           → ajoutée au montant du client (il paie prix + commission).
// Recommandé : false, pour ne pas pénaliser le paiement carte vs cash.
export const COMMISSION_ON_TOP = false

/** Commission BETI en DZD pour un montant donné (0 pendant la période gratuite). */
export function commissionFor(amountDA: number, now: Date = new Date()): number {
  if (now < FREE_UNTIL) return 0
  return Math.round(amountDA * COMMISSION_RATE)
}

/** Montant réellement facturé au client (selon COMMISSION_ON_TOP). */
export function clientCharge(amountDA: number, now: Date = new Date()): number {
  return COMMISSION_ON_TOP ? amountDA + commissionFor(amountDA, now) : amountDA
}

/** Montant reversé à l'artisan. */
export function artisanPayout(amountDA: number, now: Date = new Date()): number {
  return COMMISSION_ON_TOP ? amountDA : amountDA - commissionFor(amountDA, now)
}

export function isFreePeriod(now: Date = new Date()): boolean {
  return now < FREE_UNTIL
}
