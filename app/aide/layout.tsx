import type { Metadata } from 'next'

const D = "Questions fréquentes et contact du support BETI : réservation, paiement, compte artisan."
export const metadata: Metadata = {
  title: "Aide et contact",
  description: D,
  alternates: { canonical: '/aide' },
  openGraph: { title: "Aide et contact | BETI", description: D, url: '/aide' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
