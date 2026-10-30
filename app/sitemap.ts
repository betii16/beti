// app/sitemap.ts
// Sitemap XML dynamique — soumis à Google Search Console

import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export const revalidate = 3600

// Doivent rester identiques aux clés WILAYAS / CATEGORIES de app/artisans/[wilaya]/[category]/page.tsx
const SERVICES = ['plomberie','electricite','menage','demenagement','jardinage','peinture','serrurerie','informatique','coiffure']
const VILLES   = ['alger','oran','constantine','annaba','blida','batna','setif','tizi-ouzou','bejaia','tlemcen','sidi-bel-abbes','biskra','ouargla','boumerdes','tipaza']
const BASE     = SITE_URL

async function artisanPages(now: Date): Promise<MetadataRoute.Sitemap> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return []
  try {
    const res = await fetch(`${url}/rest/v1/artisans?select=id&limit=1000`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const rows: { id: string }[] = await res.json()
    return rows.filter((r) => r?.id).map((r) => ({
      url: `${BASE}/artisan/${r.id}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.6,
    }))
  } catch { return [] }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Pages principales
  const mainPages: MetadataRoute.Sitemap = [
    { url: `${BASE}`,               lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/recherche`,      lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/map`,            lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE}/auth/signup`,    lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/auth/login`,     lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ]

  // Pages service × ville (9 × 15)
  const seoPages: MetadataRoute.Sitemap = []
  for (const service of SERVICES) {
    for (const ville of VILLES) {
      seoPages.push({
        url: `${BASE}/artisans/${ville}/${service}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.85,
      })
    }
  }

  return [...mainPages, ...seoPages, ...(await artisanPages(now))]
}
