import type { Metadata } from 'next'
import LegalPage, { type LegalSection } from '@/components/LegalPage'

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation",
  description: "Conditions Générales d'Utilisation de la plateforme BETI — mise en relation entre clients et artisans en Algérie.",
  robots: { index: true, follow: true },
}

const sections: LegalSection[] = [
  {
    h: 'Objet',
    body: [
      'Les présentes Conditions Générales d’Utilisation (« CGU ») définissent les modalités d’accès et d’utilisation de la plateforme BETI, qui met en relation des clients particuliers avec des artisans indépendants pour des services à domicile en Algérie (plomberie, électricité, serrurerie, ménage, peinture, déménagement, etc.).',
      'BETI est un service de mise en relation et de référencement. La Plateforme n’intervient pas dans le paiement des prestations, ne perçoit aucune commission sur celles-ci et ne détient aucun fonds échangé entre le client et l’artisan.',
      'En créant un compte ou en utilisant la Plateforme, l’utilisateur accepte sans réserve les présentes CGU.',
    ],
  },
  {
    h: 'Définitions',
    body: [
      '« Client » : utilisateur qui recherche et réserve une prestation.',
      '« Artisan » : prestataire indépendant qui propose ses services via la Plateforme.',
      '« Plateforme » : le site et l’application BETI assurant la mise en relation.',
    ],
  },
  {
    h: 'Rôle de BETI',
    body: [
      'BETI est un intermédiaire technique de mise en relation. BETI n’est ni l’employeur ni le mandataire des artisans, n’exécute aucune prestation et n’est pas partie au contrat conclu entre le client et l’artisan.',
      'BETI ne perçoit aucune commission sur les prestations et ne touche jamais l’argent échangé entre le client et l’artisan.',
      'BETI ne garantit pas la disponibilité d’un artisan pour une demande donnée, ni le résultat de la prestation, qui relèvent de la seule responsabilité de l’artisan.',
    ],
  },
  {
    h: 'Inscription et compte',
    body: [
      'L’inscription se fait par numéro de téléphone, validé par un code à usage unique (OTP) envoyé par SMS ou WhatsApp. L’utilisateur s’engage à fournir des informations exactes et à maintenir son compte à jour.',
      'L’utilisateur est responsable de la confidentialité de l’accès à son compte et de toute activité réalisée depuis celui-ci. Un compte est réservé à un usage personnel.',
      'L’accès à la Plateforme est réservé aux personnes majeures.',
    ],
  },
  {
    h: 'Obligations de l’artisan',
    body: [
      'L’artisan déclare exercer son activité de manière régulière et disposer des autorisations, qualifications et assurances requises par la réglementation algérienne.',
      'L’artisan s’engage à fournir des informations exactes (services, tarifs, zone d’intervention), à honorer les réservations acceptées et à réaliser les prestations dans les règles de l’art.',
    ],
  },
  {
    h: 'Obligations du client',
    body: [
      'Le client s’engage à décrire son besoin de bonne foi, à fournir une adresse exacte et à régler le prix convenu pour une prestation effectivement réalisée.',
      'Tout comportement abusif, frauduleux ou contraire à la loi peut entraîner la suspension du compte.',
    ],
  },
  {
    h: 'Mise en relation et paiement des prestations',
    body: [
      'La Plateforme permet au client de contacter directement l’artisan. Le prix et les modalités de la prestation sont convenus librement entre le client et l’artisan, sur la base des tarifs indicatifs affichés.',
      'Le paiement de la prestation s’effectue directement entre le client et l’artisan (espèces, virement ou tout autre moyen convenu entre eux). BETI ne participe pas à ce paiement, ne l’encaisse pas et ne prélève aucune commission sur les prestations.',
    ],
  },
  {
    h: 'Abonnements des artisans',
    body: [
      'L’utilisation de la Plateforme est gratuite pour les clients. Les revenus de BETI proviennent uniquement des abonnements souscrits par les artisans pour être référencés et recevoir des demandes.',
      'Une période de lancement gratuite est offerte aux artisans. À l’issue de cette période, l’artisan choisit une formule d’abonnement (Standard ou Premium) selon les tarifs en vigueur affichés sur la Plateforme.',
      'L’abonnement est payable par les moyens proposés sur la Plateforme (carte Edahabia / CIB, virement ou dépôt bancaire). Il donne accès aux fonctionnalités de la formule choisie ; il ne couvre que le référencement et les outils associés, à l’exclusion de toute prestation à domicile.',
    ],
  },
  {
    h: 'Avis et contenus',
    body: [
      'Les clients peuvent laisser un avis et des photos après une prestation terminée. Les contenus doivent être honnêtes, respectueux et conformes à la loi.',
      'BETI se réserve le droit de retirer tout contenu manifestement faux, diffamatoire, illicite ou contraire aux présentes CGU.',
    ],
  },
  {
    h: 'Responsabilité',
    body: [
      'La responsabilité de la qualité, de la sécurité et de la conformité des prestations incombe exclusivement à l’artisan. Tout litige relatif à une prestation se règle entre le client et l’artisan ; BETI peut faciliter le dialogue sans y être partie.',
      'BETI ne saurait être tenue responsable des dommages directs ou indirects résultant des prestations ou d’une interruption du service.',
    ],
  },
  {
    h: 'Suspension et résiliation',
    body: [
      'L’utilisateur peut supprimer son compte à tout moment. BETI peut suspendre ou clôturer un compte en cas de manquement aux présentes CGU ou d’usage frauduleux.',
    ],
  },
  {
    h: 'Modification des CGU',
    body: [
      'BETI peut faire évoluer les présentes CGU. La version applicable est celle en vigueur au moment de l’utilisation de la Plateforme.',
    ],
  },
  {
    h: 'Droit applicable',
    body: [
      'Les présentes CGU sont régies par le droit algérien. À défaut de résolution amiable, tout litige relève des juridictions compétentes en Algérie.',
    ],
  },
]

export default function CguPage() {
  return (
    <LegalPage
      eyebrow="CONDITIONS D’UTILISATION"
      title="Conditions Générales d’Utilisation"
      updated="Dernière mise à jour : juin 2026"
      intro="Bienvenue sur BETI. Ces conditions encadrent l’utilisation de la plateforme de mise en relation entre clients et artisans de confiance en Algérie."
      note="Modèle de départ à faire valider par un professionnel du droit avant le lancement, en cohérence avec la réglementation algérienne applicable."
      sections={sections}
    />
  )
}
