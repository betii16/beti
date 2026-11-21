'use client'

// Navigation du panneau admin ; la section ouverte est signalée (aria-current).

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SECTIONS = [
  { path: '/fr/admin', label: 'Vue d’ensemble' },
  { path: '/fr/admin/signalements', label: 'Signalements' },
  { path: '/fr/admin/abonnements', label: 'Abonnements' },
  { path: '/fr/admin/artisans', label: 'Artisans' },
  { path: '/fr/admin/comptes', label: 'Comptes' },
  { path: '/fr/admin/demandes', label: 'Demandes' },
  { path: '/fr/admin/avis', label: 'Avis' },
  { path: '/fr/admin/journal', label: 'Journal' },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Sections du panneau admin" className="flex flex-wrap gap-1.5">
      {SECTIONS.map(section => {
        const current = pathname === section.path
        return (
          <Link
            key={section.path}
            href={section.path}
            aria-current={current ? 'page' : undefined}
            className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-[15px] font-semibold whitespace-nowrap transition-colors ${current ? 'bg-ink text-paper' : 'bg-mist hover:bg-sage'}`}
          >
            {section.label}
          </Link>
        )
      })}
    </nav>
  )
}
