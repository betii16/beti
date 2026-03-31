import type { Metadata } from 'next'
import Navigation from '@/components/Navigation'
import { LangProvider } from '@/lib/LangContext'

export const metadata: Metadata = {
  metadataBase: new URL('https://beti-ok8c.vercel.app'),
  title: {
    default: 'BETI — Artisans à domicile en Algérie | Plombier, Électricien, Ménage',
    template: '%s | BETI Algérie',
  },
  description: 'Trouvez un artisan certifié près de chez vous en Algérie. Plombier, électricien, ménage, peinture, serrurerie — disponibles maintenant. Paiement en cash. Intervention en 30 min.',
  keywords: [
    'artisan algerie', 'plombier alger', 'electricien alger', 'menage domicile algerie',
    'serrurerie alger', 'peintre alger', 'artisan domicile', 'service domicile algerie',
    'beti artisan', 'plombier oran', 'electricien constantine', 'artisan certifié algerie',
  ],
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website', locale: 'fr_DZ', url: 'https://beti-ok8c.vercel.app',
    siteName: 'BETI',
    title: 'BETI — Artisans certifiés à domicile en Algérie',
    description: 'Trouvez un artisan certifié près de chez vous. Paiement en cash.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  verification: {
    google: 'WDYNC_syGCExgMflHe9Og6UkYB9yiS_CTn3U2vYRVqo',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/favicon.ico"/>
        <link rel="manifest" href="/site.webmanifest"/>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "BETI",
          "url": "https://beti-ok8c.vercel.app",
          "description": "Plateforme de services à domicile en Algérie.",
          "areaServed": "DZ",
        })}}/>
      </head>
      <body>
        <LangProvider>
          <Navigation/>
          {children}
        </LangProvider>
      </body>
    </html>
  )
}
