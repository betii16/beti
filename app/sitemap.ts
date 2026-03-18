// app/sitemap.ts
// Sitemap XML dynamique — soumis à Google Search Console

import { MetadataRoute } from 'next'

const SERVICES = ['plombier','electricien','menage','peintre','serrurier','jardinier','demenageur','informaticien','coiffeur']
const VILLES   = ['alger','oran','constantine','annaba','blida','setif','batna','tizi-ouzou','bejaia','tlemcen','sidi-bel-abbes','biskra','boumerdes','tipaza','medea','ghardaia','ouargla','mostaganem','chlef','jijel','skikda','el-oued','djelfa','guelma','souk-ahras']

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  // Pages principales
  const mainPages: MetadataRoute.Sitemap = [
    { url: 'https://beti.dz',               lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: 'https://beti.dz/recherche',      lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: 'https://beti.dz/map',            lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: 'https://beti.dz/auth/signup',    lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://beti.dz/auth/login',     lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ]

  // Pages service × ville — 225 pages SEO
  const seoPages: MetadataRoute.Sitemap = []
  for (const service of SERVICES) {
    for (const ville of VILLES) {
      seoPages.push({
        url: `https://beti.dz/${service}/${ville}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.85,
      })
    }
  }

  return [...mainPages, ...seoPages]
}
