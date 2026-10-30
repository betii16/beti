import type { Metadata } from 'next'

const D = "Découvrez sur la carte les artisans disponibles autour de vous en Algérie et contactez-les directement."
export const metadata: Metadata = {
  title: "Carte des artisans",
  description: D,
  alternates: { canonical: '/map' },
  openGraph: { title: "Carte des artisans | BETI", description: D, url: '/map' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
