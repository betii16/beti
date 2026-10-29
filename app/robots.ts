// app/robots.ts

import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/artisan-dashboard', '/mon-espace', '/facture', '/chat', '/api', '/suivi', '/notifications', '/compte', '/parametres', '/onboarding'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin', '/artisan-dashboard', '/mon-espace', '/facture', '/chat', '/api', '/suivi', '/notifications', '/compte', '/parametres', '/onboarding'],
      },
    ],
    sitemap: 'https://beti-ten.vercel.app/sitemap.xml',
  }
}
