import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { dirOf, isLocale, locales } from '@/i18n/config'
import '../globals.css'

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
}

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  return (
    <html lang={lang} dir={dirOf(lang)}>
      <body>{children}</body>
    </html>
  )
}
