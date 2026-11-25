import type { Metadata, Viewport } from 'next'
import { Alexandria, Noto_Kufi_Arabic, Unbounded } from 'next/font/google'
import { notFound } from 'next/navigation'
import { NativeBridge } from '@/components/native-bridge'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { TabBar } from '@/components/tab-bar'
import { dirOf, isLocale, locales } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import '../globals.css'

// Identité « Le bloc » : Alexandria pour le texte (latin et arabe) ; Unbounded pour le logo et
// les titres, Noto Kufi Arabic pour leurs lettres arabes (Unbounded n'en a pas). Servies par le site.
const alexandria = Alexandria({ subsets: ['latin', 'arabic'], variable: '--font-alexandria', display: 'swap' })
const unbounded = Unbounded({ subsets: ['latin'], variable: '--font-unbounded', display: 'swap' })
const kufi = Noto_Kufi_Arabic({ subsets: ['arabic'], variable: '--font-kufi', display: 'swap' })

export function generateStaticParams() {
  return locales.map(lang => ({ lang }))
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://beti-ten.vercel.app'),
  title: { default: 'BETI', template: '%s | BETI' },
  applicationName: 'BETI',
  // Fiche d'installation (écran d'accueil du téléphone) : même adresse que du temps de la v1, pour que les applis déjà installées se mettent à jour.
  manifest: '/site.webmanifest',
  // Pas de champ « icons » ici : il remplacerait les icônes du dossier (icon.png, apple-icon.png), que Next relie lui-même.
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
}

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const dict = getDictionary(lang)
  return (
    <html lang={lang} dir={dirOf(lang)} className={`${alexandria.variable} ${unbounded.variable} ${kufi.variable}`}>
      {/* Sur téléphone, le bas de page laisse la place de la barre d'onglets. */}
      <body className="bg-paper pb-[calc(4rem+env(safe-area-inset-bottom))] text-ink antialiased sm:pb-0">
        <SiteHeader lang={lang} t={dict.nav} />
        {children}
        <SiteFooter lang={lang} t={dict.footer} />
        <TabBar lang={lang} t={dict.nav} />
        <NativeBridge />
      </body>
    </html>
  )
}
