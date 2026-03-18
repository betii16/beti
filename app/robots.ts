// app/robots.ts

import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/artisan-dashboard', '/mon-espace', '/facture', '/chat', '/api'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin', '/artisan-dashboard', '/mon-espace', '/facture', '/chat', '/api'],
      },
    ],
    sitemap: 'https://beti.dz/sitemap.xml',
    host: 'https://beti.dz',
  }
}
