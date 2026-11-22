// Hôte du projet Supabase : seul hôte externe autorisé pour les images et les
// connexions (API, temps réel).
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host
  } catch {
    return ''
  }
})()
const dev = process.env.NODE_ENV !== 'production'

// Politique de sécurité du contenu. Sans jeton par requête, Next a besoin de
// 'unsafe-inline' pour ses scripts d'amorçage : cette politique n'arrête donc pas
// un script injecté. Elle limite en revanche où une page peut envoyer des données
// (connect-src, img-src, form-action) et interdit l'affichage dans le cadre d'un
// autre site. shortcut: pas de nonce, à passer en CSP stricte quand les pages
// publiques n'auront plus besoin d'être statiques.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob:${supabaseHost ? ` https://${supabaseHost}` : ''}`,
  `font-src 'self' data:`,
  // tiles.openfreemap.org : fond de carte du suivi de position (src/components/live-map.tsx).
  `connect-src 'self' https://tiles.openfreemap.org${supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : ''}${dev ? ' ws: http://localhost:*' : ''}`,
  `worker-src 'self' blob:`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost.split(':')[0], pathname: '/storage/v1/object/public/**' }]
      : [],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(self), microphone=(), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ]
  },
}

export default nextConfig
