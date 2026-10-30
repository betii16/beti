// app/robots.ts
import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

const PRIVATE = ['/admin', '/artisan-dashboard', '/mon-espace', '/facture', '/chat', '/api', '/suivi', '/notifications', '/compte', '/parametres', '/onboarding']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: PRIVATE }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
