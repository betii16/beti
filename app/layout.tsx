import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'
import BottomTabBar from '@/components/BottomTabBar'
import { LangProvider } from '@/lib/LangContext'

// Viewport « application » : pas de zoom pinch, couvre l'encoche iPhone
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://beti-ten.vercel.app'),
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
    type: 'website', locale: 'fr_DZ', url: 'https://beti-ten.vercel.app',
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
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico"/>
        <link rel="manifest" href="/site.webmanifest"/>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="BETI"/>
        <meta name="theme-color" content="#0b0b12"/>
        {/* Theme init BEFORE React — prevents white flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var t = localStorage.getItem('beti-theme');
              if (t === 'light') document.documentElement.setAttribute('data-theme','light');
              else document.documentElement.setAttribute('data-theme','dark');
            } catch(e) {
              document.documentElement.setAttribute('data-theme','dark');
            }
          })();
        `}}/>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "BETI",
          "url": "https://beti-ten.vercel.app",
          "description": "Plateforme de services à domicile en Algérie.",
          "areaServed": "DZ",
        })}}/>
      </head>
      <body>
        <LangProvider>
          <Navigation/>
          {children}
          <BottomTabBar/>
        </LangProvider>
      </body>
    </html>
  )
}
