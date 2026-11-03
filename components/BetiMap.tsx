'use client'

// components/BetiMap.tsx
// Carte BETI sur MapLibre GL (vectoriel, surfaces mates Chaux & Zellige) via components/ui/mapcn.
// - Marqueurs artisans avec PHOTO DE PROFIL, cliquables → popup (note, prix,
//   Réserver / Suivre).
// - Suivi temps réel façon Uber : puck qui glisse, rotation, vraie route (OSRM),
//   caméra qui suit. Interface (props) identique à l'ancienne version Leaflet.

import { useEffect, useRef, useState, useMemo } from 'react'
import type { StyleSpecification } from 'maplibre-gl'

type LiveRow = { lat?: number | null; lng?: number | null }
type LivePayload = { new: LiveRow | null }
import { supabase } from '@/lib/supabase'
import { isDemoArtisan } from '@/lib/contactArtisan'
import { isPremium, isListed } from '@/lib/subscription'
import PremiumBadge from '@/components/PremiumBadge'
import { CATEGORY_COLOR, CategoryIcon } from '@/components/icons'
import { useLang } from '@/lib/LangContext'
import { loadBetiStyle } from '@/components/betiMapStyle'
import { logError } from '@/lib/logError'
import { Star, Navigation, Route } from 'lucide-react'
import {
  Map, MapMarker, MarkerContent, MarkerPopup, MapControls, MapRoute, useMap, type MapRef,
} from '@/components/ui/mapcn-marker-popup'

import { fetchArtisanMarkers, type ArtisanMarker } from '@/lib/artisanMarker'

// Palette unique « Chaux & Zellige » (components/icons)
const CAT_COLORS: Record<string, string> = CATEGORY_COLOR

const calcDist = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
const bearingDeg = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180, Δλ = (lng2 - lng1) * Math.PI / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}
// OSRM (démo public) → coords en [lng, lat] (ordre GeoJSON, prêt pour MapRoute).
async function fetchRoute(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
    const r = (await (await fetch(url)).json())?.routes?.[0]
    if (!r) return null
    return { coords: r.geometry.coordinates as [number, number][], distanceKm: r.distance / 1000, durationMin: Math.max(1, Math.round(r.duration / 60)) }
  } catch { return null }
}

function useBetiTheme(): 'dark' | 'light' {
  // Lecture IMMÉDIATE du thème (composant chargé en ssr:false → document dispo).
  // Avant : 'dark' par défaut puis bascule en 'light' juste après la création de
  // la carte → setStyle() pendant le chargement du style (« Unable to perform
  // style diff… Rebuilding ») → tuiles manquantes (trou rectangulaire) en clair.
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark')
  useEffect(() => {
    const read = () => setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark')
    read()
    const obs = new MutationObserver(read)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return theme
}

export default function BetiMap({
  trackingArtisanId,
  clientLat = 36.7538,
  clientLng = 3.0588,
  showAllArtisans = true,
  categoryFilter = '',
  selectedId = null,
  onSelect,
  onLocate,
  bottomInset = 0,
  artisansData,
  onRefresh,
}: {
  trackingArtisanId?: string
  clientLat?: number
  clientLng?: number
  showAllArtisans?: boolean
  categoryFilter?: string
  focusOffsetY?: number
  /** Artisan sélectionné (pin mis en avant, carte centrée au-dessus du panneau). */
  selectedId?: string | null
  /** Si fourni : un clic sur un pin appelle onSelect (la page affiche sa propre fiche) au lieu du popup. */
  onSelect?: (id: string | null) => void
  onLocate?: (c: { longitude: number; latitude: number }) => void
  /** Hauteur (px) occupée en bas par le panneau, pour cadrer la sélection. */
  bottomInset?: number
  /** Marqueurs déjà chargés par la page (évite une 2e requête identique). */
  artisansData?: ArtisanMarker[]
  /** Appelé sur un changement realtime quand la page fournit les données. */
  onRefresh?: () => void
}) {
  const { t, lang } = useLang()
  const theme = useBetiTheme()
  const mapRef = useRef<MapRef | null>(null)
  const [styles, setStyles] = useState<{ light?: StyleSpecification; dark?: StyleSpecification } | null>(null)
  useEffect(() => {
    let off = false
    setStyles(null)
    Promise.all([loadBetiStyle('light', lang === 'ar' ? 'ar' : 'fr'), loadBetiStyle('dark', lang === 'ar' ? 'ar' : 'fr')])
      .then(([light, dark]) => { if (!off) setStyles({ light, dark }) })
      .catch(() => { if (!off) setStyles({}) }) // repli : styles CARTO d'origine
    return () => { off = true }
  }, [lang])
  const [ownArtisans, setArtisans] = useState<ArtisanMarker[]>([])
  const artisans = artisansData ?? ownArtisans
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh
  const external = artisansData !== undefined

  // Suivi
  const [puck, setPuck] = useState<{ lng: number; lat: number } | null>(null)
  const [heading, setHeading] = useState(0)
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([])
  const [distance, setDistance] = useState('')
  const [eta, setEta] = useState('')

  // ── Charger artisans (avec avatar + plan) ──
  useEffect(() => {
    const load = async () => {
      if (external) { onRefreshRef.current?.(); return }
      // Suivi seul : on ne charge que l'artisan suivi (pas tout l'annuaire).
      const rows = await fetchArtisanMarkers(showAllArtisans ? undefined : trackingArtisanId)
      if (rows) setArtisans(rows)
    }
    if (!external) load()
    const channel = supabase.channel('artisans-map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'artisans' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const shown = useMemo(
    () => (categoryFilter ? artisans.filter(a => a.category === categoryFilter) : artisans),
    [artisans, categoryFilter],
  )

  // ── Suivi temps réel façon Uber ──
  useEffect(() => {
    if (!trackingArtisanId) { setPuck(null); setRouteCoords([]); return }
    const artisan = artisans.find(a => a.id === trackingArtisanId) || artisans[0]
    if (!artisan) return

    let aborted = false, raf: number | null = null, simTimer: ReturnType<typeof setTimeout> | null = null
    let curr = { lng: artisan.lng, lat: artisan.lat }
    setPuck(curr)

    const follow = (lng: number, lat: number) => { try { mapRef.current?.setCenter([lng, lat]) } catch {} }

    const animateTo = (tLng: number, tLat: number) => {
      if (raf) cancelAnimationFrame(raf)
      const start = { ...curr }
      if (calcDist(start.lat, start.lng, tLat, tLng) > 0.005) setHeading(bearingDeg(start.lat, start.lng, tLat, tLng))
      const t0 = performance.now(), dur = 1100
      const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / dur), e = ease(k)
        curr = { lng: start.lng + (tLng - start.lng) * e, lat: start.lat + (tLat - start.lat) * e }
        setPuck(curr); follow(curr.lng, curr.lat)
        if (k < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }

    const setRouteFrom = async (fromLat: number, fromLng: number) => {
      const r = await fetchRoute(fromLat, fromLng, clientLat, clientLng)
      if (aborted) return
      if (r) { setRouteCoords(r.coords); setDistance(r.distanceKm.toFixed(1)); setEta(r.durationMin + ' min') }
      else {
        setRouteCoords([[fromLng, fromLat], [clientLng, clientLat]])
        const d = calcDist(fromLat, fromLng, clientLat, clientLng)
        setDistance(d.toFixed(1)); setEta(Math.max(1, Math.round(d / 30 * 60)) + ' min')
      }
    }

    const start = () => {
      if (aborted) return
      try { mapRef.current?.easeTo({ center: [curr.lng, curr.lat], zoom: 14.5, duration: 700 }) } catch {}
      if (isDemoArtisan(trackingArtisanId)) {
        // DÉMO : simuler le déplacement le long de la vraie route jusqu'au client.
        fetchRoute(curr.lat, curr.lng, clientLat, clientLng).then(r => {
          if (aborted) return
          const pts = r ? r.coords : [[curr.lng, curr.lat], [clientLng, clientLat]] as [number, number][]
          setRouteCoords(pts)
          const totalKm = r ? r.distanceKm : calcDist(curr.lat, curr.lng, clientLat, clientLng)
          const totalMin = r ? r.durationMin : Math.max(1, Math.round(totalKm / 30 * 60))
          setDistance(totalKm.toFixed(1)); setEta(totalMin + ' min')
          let i = 0; const stepN = Math.max(1, Math.floor(pts.length / 45))
          const advance = () => {
            if (aborted) return
            i = Math.min(i + stepN, pts.length - 1)
            animateTo(pts[i][0], pts[i][1])
            setRouteCoords(pts.slice(i))
            const frac = 1 - i / (pts.length - 1 || 1)
            setDistance((totalKm * frac).toFixed(1)); setEta(Math.max(1, Math.round(totalMin * frac)) + ' min')
            if (i < pts.length - 1) simTimer = setTimeout(advance, 1600)
          }
          simTimer = setTimeout(advance, 1200)
        })
      } else {
        setRouteFrom(curr.lat, curr.lng)
        let lastRouteAt = { ...curr }
        // Position exacte : artisan_live_location (RLS : client d'une réservation active).
        // Repli : artisans.lat/lng (arrondi) si la table est absente / vide / inaccessible.
        let liveSeen = false
        const onPos = (lat: number, lng: number) => {
          animateTo(lng, lat)
          if (calcDist(lastRouteAt.lat, lastRouteAt.lng, lat, lng) > 0.12) { lastRouteAt = { lng, lat }; setRouteFrom(lat, lng) }
        }
        ;(async () => {
          try {
            const { data, error } = await supabase.from('artisan_live_location').select('lat, lng').eq('artisan_id', trackingArtisanId).maybeSingle()
            if (error) logError('map.liveLocation', error) // repli sur artisans.lat/lng (arrondi) via le realtime ci-dessous
            else if (!aborted && data && data.lat && data.lng) { liveSeen = true; onPos(data.lat, data.lng) }
          } catch (e) { logError('map.liveLocation', e) }
        })()
        const channel = supabase.channel(`track-${trackingArtisanId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'artisan_live_location', filter: `artisan_id=eq.${trackingArtisanId}` }, (payload: LivePayload) => {
            const { lat, lng } = payload.new || {}
            if (!lat || !lng) return
            liveSeen = true
            onPos(lat, lng)
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'artisans', filter: `id=eq.${trackingArtisanId}` }, (payload: { new: LiveRow }) => {
            if (liveSeen) return
            const { lat, lng } = payload.new
            if (!lat || !lng) return
            onPos(lat, lng)
          })
          .subscribe()
        cleanupChannel = () => supabase.removeChannel(channel)
      }
    }

    let cleanupChannel: (() => void) | null = null
    const map = mapRef.current
    if (map && map.isStyleLoaded()) start()
    else map?.once('load', start)

    return () => {
      aborted = true
      if (raf) cancelAnimationFrame(raf)
      if (simTimer) clearTimeout(simTimer)
      if (cleanupChannel) cleanupChannel()
    }
  }, [trackingArtisanId, artisans, clientLat, clientLng])

  // Cadre la sélection au-dessus du panneau du bas.
  useEffect(() => {
    if (!selectedId) return
    const a = artisans.find(x => x.id === selectedId)
    const map = mapRef.current
    if (!a || !map) return
    try {
      map.easeTo({ center: [a.lng, a.lat], zoom: Math.max(map.getZoom(), 14), padding: { top: 120, bottom: bottomInset + 24, left: 0, right: 0 }, duration: 500 })
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, artisans])

  const mapLabels = { zoomIn: t('map2.zoomIn'), zoomOut: t('map2.zoomOut'), locate: t('map2.locate') }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <style>{`
        .maplibregl-popup-content { background: transparent !important; padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
        .maplibregl-popup-tip { display: none !important; }
        .maplibregl-ctrl-attrib { opacity: 0.7; }
        .maplibregl-ctrl-logo { display: none !important; }
        @keyframes bmDot { 0% { transform: scale(1); opacity: 0.55; } 70% { transform: scale(2.4); opacity: 0; } 100% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .bm-pulse { animation: none !important; } }
      `}</style>

      {!styles && (
        <div role="status" aria-label={t('map2.mapLoading')} style={{ position: 'absolute', inset: 0, zIndex: 5, background: 'var(--bg)' }}>
          <div className="skeleton" style={{ position: 'absolute', inset: 0, borderRadius: 0, opacity: 0.5 }} />
        </div>
      )}

      {styles && (
      <Map key={lang} ref={mapRef} theme={theme} styles={styles} center={[clientLng, clientLat]} zoom={13}>
        {/* Position client */}
        <MapMarker longitude={clientLng} latitude={clientLat}>
          <MarkerContent>
            <div role="img" aria-label={t('map2.you')} style={{ position: 'relative', width: 18, height: 18 }}>
              <div className="bm-pulse" style={{ position: 'absolute', inset: -7, borderRadius: '50%', background: 'rgba(23,92,196,0.35)', animation: 'bmDot 2s infinite' }} />
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#175CC4', border: '3px solid #fff', boxShadow: '0 0 0 2px rgba(23,92,196,0.4)' }} />
            </div>
          </MarkerContent>
        </MapMarker>

        {showAllArtisans && <ArtisanLayer shown={shown} selectedId={selectedId} onSelect={onSelect} />}

        {/* Suivi : route + puck directionnel */}
        {trackingArtisanId && routeCoords.length > 1 && <MapRoute coordinates={routeCoords} color="#1E6FD6" width={5} />}
        {trackingArtisanId && puck && (
          <MapMarker longitude={puck.lng} latitude={puck.lat}>
            <MarkerContent>
              <div style={{ position: 'relative', width: 46, height: 46 }}>
                <div className="bm-pulse" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(30,111,214,0.3)', animation: 'bmDot 2s infinite' }} />
                <div style={{ position: 'absolute', top: 7, insetInlineStart: 7, width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-fill)', border: '3px solid #fff', boxShadow: '0 3px 12px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `rotate(${heading}deg)`, transition: 'transform 0.45s ease' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 2 L19.5 21 L12 16.2 L4.5 21 Z" /></svg>
                </div>
              </div>
            </MarkerContent>
          </MapMarker>
        )}

        <MapControls showZoom showLocate labels={mapLabels} onLocate={onLocate} />
      </Map>
      )}

      {/* Bandeau ETA en mode suivi */}
      {trackingArtisanId && (distance || eta) && (
        <div style={{ position: 'absolute', top: 16, insetInlineEnd: 16, zIndex: 20, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', boxShadow: '0 18px 40px -16px rgba(14,25,34,0.55)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
            <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 800, letterSpacing: '0.08em' }}>ARTISAN EN ROUTE</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{distance} km</div><div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>Distance</div></div>
            <div style={{ width: '0.5px', background: 'var(--border)' }} />
            <div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tx)' }}>{eta}</div><div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>Arrivée</div></div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Pins et regroupements ────────────────────────────────────────
type Cluster = { key: string; lat: number; lng: number; items: ArtisanMarker[] }

function ArtisanPin({ a, selected }: { a: ArtisanMarker; selected: boolean }) {
  const size = selected ? 46 : 40
  return (
    <div style={{ position: 'relative', width: size, height: size + 8, transform: `translateY(${-(size + 8) / 2 + 4}px)`, zIndex: selected ? 5 : 1 }}>
      {/* corps du pin : goutte (cercle + pointe) */}
      <div style={{
        position: 'absolute', top: 0, insetInlineStart: 0, width: size, height: size,
        borderRadius: '50% 50% 50% 4px', transform: 'rotate(-45deg)',
        background: a.color, border: `3px solid ${selected ? 'var(--tx)' : '#fff'}`,
        boxShadow: selected ? '0 8px 18px rgba(14,25,34,0.45)' : '0 4px 10px rgba(14,25,34,0.35)',
        opacity: a.available ? 1 : 0.72,
      }} />
      <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CategoryIcon id={a.category} size={selected ? 22 : 19} color="#fff" strokeWidth={2.2} />
      </div>
      {a.available && (
        <span aria-hidden style={{ position: 'absolute', top: -3, insetInlineEnd: -3, width: 14, height: 14, borderRadius: '50%', background: '#16A34A', border: '2.5px solid #fff' }} />
      )}
    </div>
  )
}

function ArtisanLayer({ shown, selectedId, onSelect }: { shown: ArtisanMarker[]; selectedId: string | null; onSelect?: (id: string | null) => void }) {
  const { map } = useMap()
  const { t } = useLang()
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!map) return
    const bump = () => setTick(x => x + 1)
    map.on('zoomend', bump)
    map.on('load', bump)
    return () => { map.off('zoomend', bump); map.off('load', bump) }
  }, [map])

  const clusters = useMemo<Cluster[]>(() => {
    if (!map) return shown.map(a => ({ key: a.id, lat: a.lat, lng: a.lng, items: [a] }))
    const zoom = map.getZoom()
    const pts = shown.map(a => ({ a, p: map.project([a.lng, a.lat]) }))
    const used = new Set<string>()
    const out: Cluster[] = []
    for (const { a, p } of pts) {
      if (used.has(a.id)) continue
      used.add(a.id)
      const group = [a]
      if (a.id !== selectedId && zoom < 17) {
        for (const o of pts) {
          if (used.has(o.a.id) || o.a.id === selectedId) continue
          if (Math.hypot(o.p.x - p.x, o.p.y - p.y) < 48) { used.add(o.a.id); group.push(o.a) }
        }
      }
      const lat = group.reduce((x, g) => x + g.lat, 0) / group.length
      const lng = group.reduce((x, g) => x + g.lng, 0) / group.length
      out.push({ key: group.length === 1 ? a.id : 'c-' + group.map(g => g.id).sort().join('|'), lat, lng, items: group })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, shown, selectedId, tick])

  const zoomInto = (c: Cluster) => {
    if (!map) return
    const lngs = c.items.map(i => i.lng), lats = c.items.map(i => i.lat)
    map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 90, maxZoom: 17, duration: 500 })
  }

  return (
    <>
      {clusters.map(c => c.items.length > 1 ? (
        <MapMarker key={c.key} longitude={c.lng} latitude={c.lat} onClick={() => zoomInto(c)}>
          <MarkerContent>
            <button type="button" aria-label={t('map2.cluster').replace('{n}', String(c.items.length))}
              style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--accent-fill)', color: 'var(--on-accent)', border: '3px solid #fff', boxShadow: '0 6px 14px rgba(14,25,34,0.4)', fontWeight: 800, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}>
              {c.items.length}
            </button>
          </MarkerContent>
        </MapMarker>
      ) : (() => {
        const a = c.items[0]
        return (
          <MapMarker key={c.key} longitude={a.lng} latitude={a.lat} onClick={() => onSelect?.(selectedId === a.id ? null : a.id)}>
            <MarkerContent>
              <ArtisanPin a={a} selected={selectedId === a.id} />
            </MarkerContent>
            {!onSelect && (
              <MarkerPopup className="!bg-transparent !border-0 !p-0 !shadow-none">
                <div style={{ width: 240, borderRadius: 16, background: 'var(--bg2)', border: '1px solid var(--border)', boxShadow: '0 18px 40px -16px rgba(14,25,34,0.55)', padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                    {isPremium(a) && <PremiumBadge size="sm" />}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: `color-mix(in srgb, ${a.color} 68%, var(--tx))`, marginBottom: 8 }}>{t(`categories.${a.category}`)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 800, color: 'var(--tx)' }}><Star size={14} fill="var(--star)" strokeWidth={0} />{a.rating.toFixed(1)}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)' }}>{a.price.toLocaleString('fr-DZ')} {t('common.da')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a href={`/artisan/${a.id}`} className="btn-primary" style={{ flex: 1 }}><Navigation size={13} /> {t('map2.book')}</a>
                    <a href={`/suivi/${a.id}`} aria-label="Suivre" className="btn-ghost" style={{ width: 44, padding: 0 }}><Route size={15} /></a>
                  </div>
                </div>
              </MarkerPopup>
            )}
          </MapMarker>
        )
      })())}
    </>
  )
}
