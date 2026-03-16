import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BETI — Services à domicile',
  description: 'L\'artisan qu\'il vous faut, maintenant.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}