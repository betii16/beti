import { readdirSync } from 'node:fs'
import { join } from 'node:path'

// Photos officielles : liste des fichiers présents (voir lib/photos.ts).
function scan(dir, rx, keyOf) {
  const out = {}
  try {
    for (const f of readdirSync(join(process.cwd(), 'public', dir))) {
      const m = rx.exec(f)
      if (m) out[keyOf(m)] = f
    }
  } catch { /* dossier absent : aucune photo */ }
  return out
}
const BETI_PHOTOS = JSON.stringify({
  ...scan('photos', /^([a-z-]+)\.(jpe?g|webp)$/i, m => m[1].toLowerCase()),
  ...scan('intro', /^([1-3])\.(jpe?g|webp)$/i, m => `intro-${m[1]}`),
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { NEXT_PUBLIC_BETI_PHOTOS: BETI_PHOTOS },
  poweredByHeader: false,
  compress: true,
  experimental: {
    // N'importe que les icônes réellement utilisées.
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(self), microphone=(), payment=()' },
        ],
      },
      {
        // Le service worker ne doit jamais être servi périmé par le CDN/navigateur.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
}

export default nextConfig
