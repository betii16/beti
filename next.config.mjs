/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  experimental: {
    // N'importe que les icônes réellement utilisées.
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [
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
