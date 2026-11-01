import type { Metadata } from 'next'

const D = "Connectez-vous à BETI par e-mail (clients) ou par téléphone (artisans) pour réserver un artisan ou gérer votre activité."
export const metadata: Metadata = {
  title: "Connexion",
  description: D,
  alternates: { canonical: '/auth/login' },
  openGraph: { title: "Connexion | BETI", description: D, url: '/auth/login' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
