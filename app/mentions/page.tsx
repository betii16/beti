import type { Metadata } from 'next'
import LegalPage, { type LegalSection } from '@/components/LegalPage'

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales de la plateforme BETI — éditeur, hébergement et contact.',
  robots: { index: true, follow: true },
}

const sections: LegalSection[] = [
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

export default function MentionsPage() {
  return (
    <LegalPage
      eyebrow="INFORMATIONS LÉGALES"
      title="Mentions légales"
      updated="Dernière mise à jour : juin 2026"
      note="Modèle de départ à faire valider par un professionnel du droit avant le lancement. Le statut d’auto-entrepreneur doit être effectivement déclaré auprès de l’ANAE, et les champs entre crochets [ ] complétés avec les informations réelles de l’éditeur."
      sections={sections}
    />
  )
}
