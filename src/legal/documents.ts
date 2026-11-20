// Textes juridiques repris TELS QUELS de la v1 (branche main, app/<page>/page.tsx), en français
// seulement. Ne pas les traduire ni les réécrire sans relecture humaine (CLAUDE.md) ; un juriste
// doit les valider avant le lancement. Seule la présentation a changé.

export type LegalSection = { h: string; body: string[] }
export type LegalDocument = {
  title: string
  description: string
  updated: string
  intro?: string
  note?: string
  sections: LegalSection[]
}

const cguSections: LegalSection[] = [
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

const cgu: LegalDocument = {
  title: 'Conditions Générales d’Utilisation',
  description: "Conditions Générales d'Utilisation de la plateforme BETI — mise en relation entre clients et artisans en Algérie.",
  updated: 'Dernière mise à jour : juin 2026',
  intro: 'Bienvenue sur BETI. Ces conditions encadrent l’utilisation de la plateforme de mise en relation entre clients et artisans en Algérie.',
  note: 'Modèle de départ à faire valider par un professionnel du droit avant le lancement, en cohérence avec la réglementation algérienne applicable.',
  sections: cguSections,
}

const confidentialiteSections: LegalSection[] = [
  {
    h: 'Responsable du traitement',
    body: [
      'Les données personnelles collectées sur BETI sont traitées par l’éditeur de la Plateforme (voir Mentions légales). Pour toute question relative à vos données : support@beti.dz.',
    ],
  },
  {
    h: 'Données que nous collectons',
    body: [
      'Compte : numéro de téléphone, nom, rôle (client ou artisan), et pour les comptes existants l’email éventuel.',
      'Utilisation : adresse et localisation indiquées pour une demande, catégorie de service, réservations, messages échangés avec un artisan, avis et photos publiés.',
      'Artisans : informations professionnelles (services, tarifs, zone d’intervention, expérience, portfolio).',
      'Techniques : préférences locales (thème, langue) stockées sur votre appareil, et données strictement nécessaires à la session.',
    ],
  },
  {
    h: 'Finalités',
    body: [
      'Créer et sécuriser votre compte (vérification par code OTP envoyé par SMS ou WhatsApp).',
      'Assurer la mise en relation : afficher les artisans, permettre les réservations, la messagerie et les notifications.',
      'Améliorer le service, prévenir la fraude et les abus, et répondre à vos demandes de support.',
    ],
  },
  {
    h: 'Base et consentement',
    body: [
      'Le traitement repose sur l’exécution du service que vous demandez (mise en relation) et sur votre consentement lors de la création du compte. Vous pouvez retirer votre consentement en supprimant votre compte.',
    ],
  },
  {
    h: 'Partage des données',
    body: [
      'Mise en relation : lorsque vous contactez un artisan (ou inversement), les informations nécessaires à la prestation (nom, adresse, demande, messages) sont partagées entre le client et l’artisan concernés.',
      'Prestataires techniques : hébergement et base de données (Supabase, Vercel) et fournisseur d’envoi des codes OTP (SMS / WhatsApp), agissant pour notre compte.',
      'Nous ne vendons pas vos données personnelles.',
    ],
  },
  {
    h: 'Conservation',
    body: [
      'Les données sont conservées le temps nécessaire à la fourniture du service et au respect de nos obligations. À la suppression de votre compte, vos données personnelles sont effacées ou anonymisées, sauf obligation légale de conservation.',
    ],
  },
  {
    h: 'Sécurité',
    body: [
      'L’accès aux données est protégé par des règles d’autorisation au niveau de la base (chaque utilisateur n’accède qu’à ses propres données) et par des connexions chiffrées. Aucune méthode n’étant infaillible, nous vous invitons à protéger l’accès à votre appareil.',
    ],
  },
  {
    h: 'Vos droits',
    body: [
      'Vous disposez d’un droit d’accès, de rectification et de suppression de vos données, ainsi que du droit de vous opposer à certains traitements.',
      'Pour exercer ces droits, écrivez à support@beti.dz. Vous pouvez également modifier vos informations depuis vos paramètres et supprimer votre compte.',
    ],
  },
  {
    h: 'Stockage local et cookies',
    body: [
      'BETI utilise le stockage local de votre navigateur pour des préférences (thème clair/sombre, langue) et le maintien de votre session. Aucun cookie publicitaire de suivi tiers n’est utilisé.',
    ],
  },
  {
    h: 'Modifications',
    body: [
      'Cette politique peut être mise à jour. La version applicable est celle publiée sur cette page.',
    ],
  },
]

const confidentialite: LegalDocument = {
  title: 'Politique de confidentialité',
  description: 'Comment BETI collecte, utilise et protège vos données personnelles.',
  updated: 'Dernière mise à jour : juin 2026',
  intro: 'Votre confiance compte. Cette page explique quelles données BETI collecte, pourquoi, et les droits dont vous disposez.',
  note: 'Modèle de départ à faire valider par un professionnel du droit avant le lancement, en cohérence avec la réglementation algérienne sur la protection des données personnelles (loi n° 18-07).',
  sections: confidentialiteSections,
}

const mentionsSections: LegalSection[] = [
  {
    h: 'Éditeur du site',
    body: [
      'Le site et l’application BETI (« BETI », « la Plateforme ») sont édités par [Nom et prénom de l’éditeur], exerçant sous le statut d’auto-entrepreneur (personne physique).',
      'Adresse : [adresse complète à compléter], Algérie.',
      'N° de carte d’auto-entrepreneur (ANAE) : [à compléter]. Numéro d’Identification Fiscale (NIF) : [à compléter].',
      'Directeur de la publication : [Nom et prénom de l’éditeur].',
    ],
  },
  {
    h: 'Contact',
    body: [
      'Email : support@beti.dz',
      'Pour toute question relative au fonctionnement de la Plateforme, vous pouvez aussi passer par la page Aide du site.',
    ],
  },
  {
    h: 'Hébergement',
    body: [
      'L’application est hébergée par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis (vercel.com).',
      'Les données (comptes, réservations, messages) sont gérées via Supabase. Voir la Politique de confidentialité pour le détail du traitement des données personnelles.',
    ],
  },
  {
    h: 'Propriété intellectuelle',
    body: [
      'La marque BETI, le logo, la charte graphique, les textes et les éléments d’interface sont la propriété de l’éditeur. Toute reproduction ou réutilisation sans autorisation écrite préalable est interdite.',
      'Les contenus publiés par les artisans (photos de réalisations, descriptions, avis) restent la responsabilité de leurs auteurs.',
    ],
  },
  {
    h: 'Responsabilité',
    body: [
      'BETI est une plateforme de mise en relation entre des clients et des artisans indépendants. BETI n’est pas partie au contrat de prestation conclu entre le client et l’artisan et n’exécute aucune prestation de services à domicile.',
      'L’éditeur s’efforce d’assurer l’exactitude des informations diffusées mais ne saurait être tenu responsable des erreurs, indisponibilités ou dommages résultant de l’usage du site.',
    ],
  },
  {
    h: 'Droit applicable',
    body: [
      'Les présentes mentions sont régies par le droit algérien. Tout litige relève des juridictions compétentes en Algérie.',
    ],
  },
]

const mentions: LegalDocument = {
  title: 'Mentions légales',
  description: 'Mentions légales de la plateforme BETI — éditeur, hébergement et contact.',
  updated: 'Dernière mise à jour : juin 2026',
  note: 'Modèle de départ à faire valider par un professionnel du droit avant le lancement. Le statut d’auto-entrepreneur doit être effectivement déclaré auprès de l’ANAE, et les champs entre crochets [ ] complétés avec les informations réelles de l’éditeur.',
  sections: mentionsSections,
}

export const LEGAL = { cgu, confidentialite, mentions }
