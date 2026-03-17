import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'BETI — L\'artisan qu\'il vous faut, maintenant.',
  description: 'Trouvez un artisan certifié BETI près de chez vous. Plombier, électricien, ménage, déménagement et plus encore.',
  keywords: 'artisan, plombier, électricien, ménage, service à domicile, BETI',
  openGraph: {
    title: 'BETI — Services à domicile',
    description: 'Des professionnels vérifiés, proches de vous, disponibles maintenant.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Navigation />
        {children}
      </body>
    </html>
  )
}
