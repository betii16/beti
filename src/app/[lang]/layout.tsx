import type { Metadata, Viewport } from 'next'
import { Readex_Pro } from 'next/font/google'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { dirOf, isLocale, locales } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import '../globals.css'

// Une seule police, dessinée pour le latin et l'arabe, servie par le site lui-même.
const readex = Readex_Pro({ subsets: ['latin', 'arabic'], variable: '--font-readex', display: 'swap' })

export function generateStaticParams() {
  return locales.map(lang => ({ lang }))
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://beti-ten.vercel.app'),
  title: { default: 'BETI', template: '%s | BETI' },
  applicationName: 'BETI',
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
    <html lang={lang} dir={dirOf(lang)} className={readex.variable}>
      <body className="bg-paper text-ink antialiased">
        <SiteHeader lang={lang} t={dict.nav} />
        {children}
        <SiteFooter lang={lang} t={dict.footer} />
      </body>
    </html>
  )
}
