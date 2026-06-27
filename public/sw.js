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

const VERSION = 'beti-v1'
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

  // Navigations (changements de page) : réseau d'abord, secours = dernière
  // page connue, sinon la coque '/'.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy)).catch(() => {})
          return res
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/')))
    )
    return
  }

  // Assets statiques (JS, CSS, polices, images) : réseau d'abord puis cache.
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
