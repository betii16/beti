// lib/photos.ts
// Emplacements photo : un fichier déposé dans public/photos/ (ou public/intro/)
// apparaît tout seul. La liste des fichiers présents est calculée au démarrage
// / au build par next.config.mjs (variable NEXT_PUBLIC_BETI_PHOTOS), donc
// aucune requête réseau pour tester l'existence et aucun clignotement.
// Voir public/photos/README.md pour les noms attendus.

let cache: Record<string, string> | null = null

function table(): Record<string, string> {
  if (cache) return cache
  try {
    cache = JSON.parse(process.env.NEXT_PUBLIC_BETI_PHOTOS || '{}') as Record<string, string>
  } catch {
    cache = {} // variable absente ou illisible : aucune photo, repli sur l'affichage actuel
  }
  return cache
}

/** Chemin public de la photo (ex. "/photos/plomberie.jpg") ou null si absente. */
export function photoSrc(slot: string): string | null {
  const f = table()[slot]
  return f ? `/photos/${f}` : null
}

/** Photos de l'intro (public/intro/1.jpg…) réellement présentes. */
export function introSrc(n: number): string | null {
  const f = table()[`intro-${n}`]
  return f ? `/intro/${f}` : null
}
