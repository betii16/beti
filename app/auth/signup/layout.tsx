import type { Metadata } from 'next'

const D = "Créez votre compte BETI, client (code reçu par e-mail) ou artisan (code reçu sur votre téléphone), en quelques minutes."
export const metadata: Metadata = {
  title: "Inscription",
  description: D,
  alternates: { canonical: '/auth/signup' },
  openGraph: { title: "Inscription | BETI", description: D, url: '/auth/signup' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
