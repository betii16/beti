// lib/payment-config.ts
// BETI ne prélève AUCUNE commission sur les prestations.
// Modèle économique = annuaire + abonnements artisans : le paiement de la
// prestation se fait en direct entre le client et l'artisan, BETI n'encaisse
// rien et ne prend aucune part. Ces helpers (identité) sont conservés pour
// rester compatibles avec le flux de paiement existant sans casser les imports.

/** Montant facturé au client = prix convenu (aucune commission ajoutée). */
export function clientCharge(amountDA: number): number {
  return amountDA
}

/** Montant reversé à l'artisan = prix convenu en entier (aucune part BETI). */
export function artisanPayout(amountDA: number): number {
  return amountDA
}
