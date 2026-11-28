// Fin du service worker de la v1. La v1 installait /sw.js, qui affiche l'ancien site gardé en cache
// dès que le réseau tarde plus de 3 s. Le navigateur revérifie ce fichier : chez ceux qui ont encore
// l'ancien, celui-ci le remplace, vide les caches, se désinscrit et recharge les pages ouvertes.
// La v2 n'enregistre aucun service worker. Ne pas supprimer tant que des visiteurs de la v1 peuvent revenir.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map(key => caches.delete(key)))
      await self.registration.unregister()
      const pages = await self.clients.matchAll({ type: 'window' })
      for (const page of pages) page.navigate(page.url)
    })(),
  )
})
