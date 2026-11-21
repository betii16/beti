import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AdminNav } from '@/components/admin-nav'

// Pas de contrôle d'accès ici : chaque page appelle requireStaff() (un layout n'est pas rejoué à chaque navigation).
export const metadata: Metadata = { title: { template: '%s | Admin BETI', default: 'Admin BETI' }, robots: { index: false, follow: false } }

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main id="contenu" className="px-4 pb-6 sm:px-10">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6 pt-4">
        <AdminNav />
        {children}
      </div>
    </main>
  )
}
