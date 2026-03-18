import type { Metadata } from 'next'
import { Navigation } from '@/components/Navigation'

export const metadata: Metadata = {
  metadataBase: new URL('https://beti.dz'),
  title: {
    default: 'BETI — Artisans à domicile en Algérie | Plombier, Électricien, Ménage',
    template: '%s | BETI Algérie',
  },
  description: 'Trouvez un artisan certifié près de chez vous en Algérie. Plombier, électricien, ménage, peinture, serrurerie — disponibles maintenant. Paiement en cash. Intervention en 30 min.',
  keywords: [
    'artisan algerie', 'plombier alger', 'electricien alger', 'menage domicile algerie',
    'serrurerie alger', 'peintre alger', 'artisan domicile', 'service domicile algerie',
    'beti artisan', 'plombier oran', 'electricien constantine', 'artisan certifié algerie',
    'dépannage plomberie alger', 'réparation électricité algerie', 'femme de ménage alger',
  ],
  authors: [{ name: 'BETI', url: 'https://beti.dz' }],
  creator: 'BETI',
  publisher: 'BETI',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_DZ',
    url: 'https://beti.dz',
    siteName: 'BETI',
    title: 'BETI — Artisans certifiés à domicile en Algérie',
    description: 'Trouvez un artisan certifié près de chez vous. Plombier, électricien, ménage, peinture — disponibles maintenant. Paiement en cash.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BETI — Artisans à domicile en Algérie' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BETI — Artisans certifiés à domicile en Algérie',
    description: 'Trouvez un artisan certifié près de chez vous en Algérie. Disponibles maintenant.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://beti.dz',
    languages: { 'fr-DZ': 'https://beti.dz' },
  },
  verification: {
    google: '<meta name="google-site-verification" content="WDYNC_syGCExgMflHe9Og6UkYB9yiS_CTn3U2vYRVqo" />',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Préchargement polices */}
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico"/>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
        <link rel="manifest" href="/site.webmanifest"/>

        {/* Données structurées globales — Organisation */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "BETI",
          "url": "https://beti.dz",
          "logo": "https://beti.dz/logo.png",
          "description": "Plateforme de services à domicile en Algérie. Artisans certifiés, disponibles maintenant.",
          "areaServed": "DZ",
          "serviceType": ["Plomberie", "Électricité", "Ménage", "Peinture", "Serrurerie", "Jardinage", "Informatique", "Coiffure"],
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer support",
            "availableLanguage": ["French", "Arabic"]
          },
          "sameAs": [
            "https://www.facebook.com/beti.dz",
            "https://www.instagram.com/beti.dz"
          ]
        })}}/>

        {/* Données structurées — LocalBusiness */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": "BETI — Services à domicile Algérie",
          "image": "https://beti.dz/og-image.png",
          "description": "Trouvez un artisan certifié près de chez vous en Algérie.",
          "url": "https://beti.dz",
          "telephone": "+213-XX-XX-XX-XX",
          "address": {
            "@type": "PostalAddress",
            "addressCountry": "DZ",
            "addressLocality": "Alger"
          },
          "priceRange": "1500 DA - 15000 DA/h",
          "openingHoursSpecification": {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
            "opens": "00:00",
            "closes": "23:59"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "reviewCount": "1200"
          }
        })}}/>
      </head>
      <body>
        <Navigation/>
        {children}
      </body>
    </html>
  )
}
