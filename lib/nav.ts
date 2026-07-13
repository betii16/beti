// lib/nav.ts
// Navigation GPS externe. On délègue le turn-by-turn à Waze (itinéraire réel,
// trafic, très utilisé en Algérie) plutôt que de le réimplémenter — comme la
// concurrence. Dans l'app native (Capacitor), le lien universel ouvre Waze
// installé sur le téléphone ; sinon, Waze web / le store.

export function wazeUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
}

/** Vraies coordonnées exploitables pour lancer une navigation ? */
export function hasCoords(o?: { lat?: number | null; lng?: number | null } | null): boolean {
  return !!o && typeof o.lat === 'number' && typeof o.lng === 'number' && !Number.isNaN(o.lat) && !Number.isNaN(o.lng)
}

/** Ouvre Waze vers le point (no-op si coordonnées absentes). */
export function openWaze(lat?: number | null, lng?: number | null): void {
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) return
  window.open(wazeUrl(lat, lng), '_blank')
}
