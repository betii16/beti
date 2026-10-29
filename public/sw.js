/* BETI — Service Worker
 *
 * Stratégie « network-first » : on essaie TOUJOURS le réseau d'abord, et on ne
 * sert le cache qu'en secours (hors-ligne / réseau lent qui échoue). Ce choix est
 * volontaire : l'app mobile est une WebView qui doit afficher la dernière version
 * du site sans repasser par les stores. Un cache agressif (« cache-first ») figerait
 * l'app sur une vieille version — exactement ce qu'on veut éviter ici.
 *
 * Ce que ça apporte :
 *  - PWA réellement installable (critère Lighthouse).
 *  - Résilience hors-ligne : dernière page vue + page de secours.
 *  - Démarrage plus rapide sur réseau instable (secours instantané).
 */

const VERSION = 'beti-v2'

const PRIVATE_PREFIXES = [
  '/api', '/auth', '/admin', '/artisan-dashboard', '/mon-espace', '/compte', '/parametres',
  '/chat', '/facture', '/suivi', '/notifications', '/onboarding',
]
const PUBLIC_PREFIXES = ['/recherche', '/map', '/artisans', '/aide', '/cgu', '/confidentialite', '/mentions']
const inPrefix = (url, list) => list.some((p) => url.pathname === p || url.pathname.startsWith(p + '/'))
const isPrivate = (url) => inPrefix(url, PRIVATE_PREFIXES)
const isPublicPage = (url) => url.pathname === '/' || inPrefix(url, PUBLIC_PREFIXES)
const isStaticAsset = (url) =>
  url.pathname.startsWith('/_next/static/') ||
  /\.(?:png|jpe?g|webp|svg|ico|woff2?|webmanifest)$/.test(url.pathname)
const STATIC_CACHE = `${VERSION}-static`
const RUNTIME_CACHE = `${VERSION}-runtime`

// Ressources de coque mises en cache à l'installation (secours hors-ligne).
const PRECACHE = [
  '/',
  '/site.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // On ne touche qu'au même origine et aux requêtes GET.
  // Supabase, SATIM, tuiles de carte, POST/auth… passent direct au réseau.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // SECURITE : jamais de cache pour l'auth, les donnees, l'espace prive, les
  // requetes RSC/API. Elles passent TOUJOURS par le reseau (hors-ligne, elles
  // echouent proprement au lieu d'afficher une session/donnee perimee).
  if (isPrivate(url) || request.headers.get('RSC') || url.searchParams.has('_rsc')) return

  // Navigations publiques : reseau d'abord, secours = derniere page publique
  // connue, sinon la coque '/'.
  if (request.mode === 'navigate') {
    const cacheable = isPublicPage(url)
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (cacheable && res.status === 200) {
            const copy = res.clone()
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy)).catch(() => {})
          }
          return res
        })
        .catch(async () => (cacheable && (await caches.match(request))) || (await caches.match('/')))
    )
    return
  }

  // Assets statiques (JS, CSS, polices, images) : reseau d'abord puis cache.
  if (!isStaticAsset(url)) return
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone()
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy)).catch(() => {})
        }
        return res
      })
      .catch(() => caches.match(request))
  )
})
