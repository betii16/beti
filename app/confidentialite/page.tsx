import type { Metadata } from 'next'
import LegalPage, { type LegalSection } from '@/components/LegalPage'

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Comment BETI collecte, utilise et protège vos données personnelles.',
  robots: { index: true, follow: true },
}

const sections: LegalSection[] = [
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

export default function ConfidentialitePage() {
  return (
    <LegalPage
      eyebrow="VOS DONNÉES"
      title="Politique de confidentialité"
      updated="Dernière mise à jour : juin 2026"
      intro="Votre confiance compte. Cette page explique quelles données BETI collecte, pourquoi, et les droits dont vous disposez."
      note="Modèle de départ à faire valider par un professionnel du droit avant le lancement, en cohérence avec la réglementation algérienne sur la protection des données personnelles (loi n° 18-07)."
      sections={sections}
    />
  )
}
