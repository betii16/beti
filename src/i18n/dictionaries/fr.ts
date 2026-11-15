// Textes français : la référence. ar.ts doit porter exactement les mêmes clés,
// ce que le type Dictionary vérifie à la compilation.

import type { ErrorCode } from '@/lib/errors'

// Les chiffres cités (5 demandes, 7 jours, 60 jours, 20 signalements, 10 caractères)
// sont les limites fixées dans supabase/migrations/…300_api.sql.
const errors: Record<ErrorCode, string> = {
  not_authenticated: 'Connectez-vous pour continuer.',
  forbidden: 'Vous n’avez pas accès à cette action.',
  account_suspended: 'Votre compte est suspendu. Contactez l’assistance pour en savoir plus.',
  not_an_artisan: 'Cette action est réservée aux comptes artisan.',
  not_found: 'Introuvable : cet élément n’existe pas ou n’est plus disponible.',
  invalid_transition: 'Cette action n’est plus possible : la situation a changé entre-temps. Rechargez la page.',
  rate_limited: 'Trop d’envois en peu de temps. Patientez un peu avant de réessayer.',
  invalid_artisan: 'Vous ne pouvez pas vous envoyer une demande à vous-même.',
  artisan_unavailable: 'Cet artisan n’est plus disponible sur BETI.',
  too_many_pending: 'Vous avez déjà 5 demandes en attente. Attendez une réponse ou annulez-en une.',
  conversation_closed:
    'Cette conversation est fermée : la demande a été déclinée, annulée, ou terminée depuis plus de 7 jours.',
  not_sharing: 'Le partage de position n’est activé pour aucune demande en cours.',
  booking_not_completed: 'Vous pourrez laisser un avis une fois la prestation terminée.',
  review_window_closed: 'Le délai de 60 jours pour laisser un avis est dépassé.',
  already_reviewed: 'Vous avez déjà laissé un avis pour cette demande.',
  already_reported: 'Vous avez déjà signalé cet élément.',
  reports_limit: 'Vous avez déjà 20 signalements en cours d’examen. Attendez qu’ils soient traités.',
  details_required: 'Décrivez le problème en quelques mots (10 caractères au moins).',
  listing_missing: 'Créez d’abord votre profil d’artisan.',
  phone_required: 'Ajoutez votre numéro de téléphone avant de publier votre profil.',
  portfolio_limit: 'Vous avez atteint le nombre de réalisations prévu par votre formule.',
  already_pending: 'Une demande d’abonnement est déjà en attente de validation.',
  cannot_suspend_staff: 'Un membre de l’équipe ne peut pas être suspendu.',
  invalid_phone: 'Numéro de téléphone invalide. Vérifiez-le et réessayez.',
  invalid_photos: 'Les photos n’ont pas été acceptées. Retirez-les puis ajoutez-les de nouveau.',
  invalid_location: 'Position invalide. Placez le repère sur la carte, en Algérie.',
  invalid_input: 'Une information saisie n’est pas valide. Vérifiez le formulaire et réessayez.',
  network: 'Connexion impossible. Vérifiez votre réseau et réessayez.',
  unknown: 'Une erreur est survenue. Réessayez ; si elle se répète, contactez l’assistance.',
}

export const fr = {
  // Une clé par catégorie de la base (categories.slug), vérifié par tests/db/contract.test.ts.
  categories: {
    plomberie: 'Plomberie',
    electricite: 'Électricité',
    serrurerie: 'Serrurerie',
    menage: 'Ménage',
    peinture: 'Peinture',
    demenagement: 'Déménagement',
    jardinage: 'Jardinage',
    informatique: 'Informatique',
    coiffure: 'Coiffure',
    autre: 'Autre',
  },
  errors,
}

export type Dictionary = typeof fr
