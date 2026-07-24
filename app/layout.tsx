import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Instrument_Sans, Spline_Sans_Mono, Noto_Sans_Arabic } from 'next/font/google'
import './globals.css'

// Identité « Chaux & Zellige » — duo grotesque humaniste + mono « devis d'artisan ».
// Bricolage Grotesque : display (le nom même = bricolage/artisanat).
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})
// Instrument Sans : texte courant, chaleureux et lisible.
const body = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})
// Spline Sans Mono : prix, stats, labels — le « chiffré » du métier.
const mono = Spline_Sans_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

const arabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
})
import Navigation from '@/components/Navigation'
import BottomTabBar from '@/components/BottomTabBar'
import MobileHeader from '@/components/MobileHeader'
import BackgroundMesh from '@/components/BackgroundMesh'
import AlgeriaBackdrop from '@/components/AlgeriaBackdrop'
import GlassHover from '@/components/GlassHover'
import NativeBridge from '@/components/NativeBridge'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import AppIntro from '@/components/AppIntro'
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
    // L'image est générée par app/opengraph-image.tsx (convention App Router).
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BETI — Artisans certifiés à domicile en Algérie',
    description: 'Trouvez un artisan certifié près de chez vous. Paiement en cash.',
  },
  verification: {
    google: 'WDYNC_syGCExgMflHe9Og6UkYB9yiS_CTn3U2vYRVqo',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${display.variable} ${body.variable} ${mono.variable} ${arabic.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico"/>
        <link rel="manifest" href="/site.webmanifest"/>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="BETI"/>
        <meta name="theme-color" content="#F0ECE3"/>
        {/* Theme init BEFORE React — prevents flash. Défaut = clair (identité Chaux). */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var t = localStorage.getItem('beti-theme');
              document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
            } catch(e) {
              document.documentElement.setAttribute('data-theme','light');
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
        <BackgroundMesh/>
        <AlgeriaBackdrop/>
        <GlassHover/>
        <NativeBridge/>
        <ServiceWorkerRegister/>
        <LangProvider>
          <AppIntro/>
          <Navigation/>
          <MobileHeader/>
          {children}
          <BottomTabBar/>
        </LangProvider>
      </body>
    </html>
  )
}
