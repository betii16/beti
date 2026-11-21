// Coordonnées où l'artisan paie son abonnement (RIB, CCP, BaridiMob…), montrées
// avec le formulaire de demande. Le propriétaire ne les a pas encore fixées (la v1
// affichait « RIB / CCP : [à compléter] ») : tant qu'elles valent null, la demande
// d'abonnement est fermée. Pendant le lancement gratuit, personne n'a à payer.

export const PAYMENT_DETAILS: { fr: string; ar: string } | null = null
