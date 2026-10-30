import type { Metadata } from 'next'

const D = "Trouvez et comparez des artisans près de chez vous en Algérie : plomberie, électricité, peinture et plus. Filtrez par métier, wilaya et note."
export const metadata: Metadata = {
  title: "Recherche d'artisans en Algérie",
  description: D,
  alternates: { canonical: '/recherche' },
  openGraph: { title: "Recherche d'artisans en Algérie | BETI", description: D, url: '/recherche' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
