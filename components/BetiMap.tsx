'use client'

// components/BetiMap.tsx
// Carte BETI sur MapLibre GL (vectoriel, look « glass ») via components/ui/mapcn.
// - Marqueurs artisans avec PHOTO DE PROFIL, cliquables → popup glass (note, prix,
//   Réserver / Suivre).
// - Suivi temps réel façon Uber : puck qui glisse, rotation, vraie route (OSRM),
//   caméra qui suit. Interface (props) identique à l'ancienne version Leaflet.

import { useEffect, useRef, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { isDemoArtisan } from '@/lib/contactArtisan'
import { isPremium } from '@/lib/subscription'
import PremiumBadge from '@/components/PremiumBadge'
import { Star, Navigation, Route } from 'lucide-react'
import {
  Map, MapMarker, MarkerContent, MarkerPopup, MapControls, MapRoute, type MapRef,
} from '@/components/ui/mapcn-marker-popup'

type ArtisanMarker = {
  id: string; name: string; initials: string; avatar: string | null
  category: string; rating: number; price: number; available: boolean
  color: string; lat: number; lng: number
  plan?: string | null; plan_until?: string | null
}

const CAT_COLORS: Record<string, string> = {
  plomberie: '#3b82f6', electricite: '#f59e0b', menage: '#10b981',
  demenagement: '#7C5CFF', jardinage: '#22c55e', peinture: '#ef4444',
  serrurerie: '#f97316', informatique: '#5A3DF0', coiffure: '#ec4899', autre: '#a78bfa',
}

const DEMO: ArtisanMarker[] = [
  { id: 'd1', name: 'Karim Benali', initials: 'KB', avatar: null, category: 'plomberie', rating: 4.9, price: 3500, available: true, color: '#3b82f6', lat: 36.7538, lng: 3.0588 },
  { id: 'd2', name: 'Sofiane Amrani', initials: 'SA', avatar: null, category: 'electricite', rating: 4.8, price: 4000, available: true, color: '#f59e0b', lat: 36.7700, lng: 3.0310 },
  { id: 'd3', name: 'Amina Kaci', initials: 'AK', avatar: null, category: 'menage', rating: 5.0, price: 2000, available: true, color: '#10b981', lat: 36.7400, lng: 3.0900 },
  { id: 'd4', name: 'Riad Hamdi', initials: 'RH', avatar: null, category: 'serrurerie', rating: 4.6, price: 4500, available: false, color: '#f97316', lat: 36.7200, lng: 3.0200 },
  { id: 'd5', name: 'Nadia Bouzid', initials: 'NB', avatar: null, category: 'coiffure', rating: 4.9, price: 1500, available: true, color: '#ec4899', lat: 36.7600, lng: 3.1200 },
]

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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
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
}: {
  trackingArtisanId?: string
  clientLat?: number
  clientLng?: number
  showAllArtisans?: boolean
  categoryFilter?: string
  focusOffsetY?: number
}) {
  const theme = useBetiTheme()
  const mapRef = useRef<MapRef | null>(null)
  const [artisans, setArtisans] = useState<ArtisanMarker[]>(DEMO)

  // Suivi
  const [puck, setPuck] = useState<{ lng: number; lat: number } | null>(null)
  const [heading, setHeading] = useState(0)
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([])
  const [distance, setDistance] = useState('')
  const [eta, setEta] = useState('')

  // ── Charger artisans (avec avatar + plan) ──
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from('artisans')
          .select('id, category, hourly_rate, is_available, rating_avg, lat, lng, plan, plan_until, profiles(full_name, avatar_url)')
          .not('lat', 'is', null).not('lng', 'is', null)
        if (data && data.length > 0) {
          setArtisans(data.map((a: any) => ({
            id: a.id,
            name: a.profiles?.full_name || 'Artisan',
            initials: (a.profiles?.full_name || 'A').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
            avatar: a.profiles?.avatar_url || null,
            category: a.category || 'autre',
            rating: a.rating_avg || 0,
            price: a.hourly_rate || 0,
            available: a.is_available,
            color: CAT_COLORS[a.category] || '#5A3DF0',
            lat: a.lat, lng: a.lng, plan: a.plan, plan_until: a.plan_until,
          })))
        }
      } catch { /* garde les démos */ }
    }
    load()
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
        const channel = supabase.channel(`track-${trackingArtisanId}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'artisans', filter: `id=eq.${trackingArtisanId}` }, (payload: any) => {
            const { lat, lng } = payload.new
            if (!lat || !lng) return
            animateTo(lng, lat)
            if (calcDist(lastRouteAt.lat, lastRouteAt.lng, lat, lng) > 0.12) { lastRouteAt = { lng, lat }; setRouteFrom(lat, lng) }
          })
          .subscribe()
        cleanupChannel = () => supabase.removeChannel(channel)
      }
    }

    let cleanupChannel: (() => void) | null = null
    const map = mapRef.current
    if (map && (map as any).isStyleLoaded?.()) start()
    else map?.once('load', start)

    return () => {
      aborted = true
      if (raf) cancelAnimationFrame(raf)
      if (simTimer) clearTimeout(simTimer)
      if (cleanupChannel) cleanupChannel()
    }
  }, [trackingArtisanId, artisans, clientLat, clientLng])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <style>{`
        .maplibregl-popup-content { background: transparent !important; padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
        .maplibregl-popup-tip { display: none !important; }
        .maplibregl-ctrl-attrib, .maplibregl-ctrl-logo { opacity: 0.5; }
        @keyframes bmDot { 0% { transform: scale(1); opacity: 0.55; } 70% { transform: scale(2.4); opacity: 0; } 100% { opacity: 0; } }
      `}</style>

      <Map ref={mapRef} theme={theme} center={[clientLng, clientLat]} zoom={13}>
        {/* Position client */}
        <MapMarker longitude={clientLng} latitude={clientLat}>
          <MarkerContent>
            <div style={{ position: 'relative', width: 18, height: 18 }}>
              <div style={{ position: 'absolute', inset: -7, borderRadius: '50%', background: 'rgba(90,61,240,0.35)', animation: 'bmDot 2s infinite' }} />
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#5A3DF0', border: '3px solid #fff', boxShadow: '0 0 0 2px rgba(90,61,240,0.4)' }} />
            </div>
          </MarkerContent>
        </MapMarker>

        {/* Artisans cliquables avec photo de profil */}
        {showAllArtisans && shown.map(a => (
          <MapMarker key={a.id} longitude={a.lng} latitude={a.lat}>
            <MarkerContent>
              <div style={{ position: 'relative', transform: 'translateY(-4px)', opacity: a.available ? 1 : 0.55 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', padding: 3, background: `linear-gradient(135deg, ${a.color}, #7C5CFF)`, boxShadow: '0 6px 16px rgba(0,0,0,0.35)' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '2px solid #fff', background: '#13131e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {a.avatar
                      ? <img src={a.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>{a.initials}</span>}
                  </div>
                </div>
                <div style={{ position: 'absolute', bottom: -3, left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: 10, height: 10, background: '#7C5CFF', borderBottomRightRadius: 2 }} />
                {a.available && <div style={{ position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: '#10b981', border: '2px solid #fff' }} />}
              </div>
            </MarkerContent>

            <MarkerPopup className="!bg-transparent !border-0 !p-0 !shadow-none">
              <div style={{ width: 250, borderRadius: 18, overflow: 'hidden', background: 'var(--glass-bg)', border: '1px solid var(--glass-edge)', backdropFilter: 'blur(18px) saturate(180%)', WebkitBackdropFilter: 'blur(18px) saturate(180%)', boxShadow: '0 16px 48px rgba(0,0,0,0.45)', fontFamily: 'Nexa, sans-serif' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: a.color + '22', border: `1.5px solid ${a.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {a.avatar ? <img src={a.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: a.color, fontWeight: 800 }}>{a.initials}</span>}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                      {isPremium(a) && <PremiumBadge size="sm" />}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', color: a.color, textTransform: 'uppercase' }}>{a.category}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Star size={14} fill="#f59e0b" strokeWidth={0} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)' }}>{a.rating.toFixed(1)}</span>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>{a.price.toLocaleString('fr-DZ')} <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>DA/h</span></span>
                </div>
                <div style={{ display: 'flex', gap: 8, padding: '0 12px 12px' }}>
                  <a href={`/artisan/${a.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                    <button style={{ width: '100%', padding: '10px 0', borderRadius: 11, border: 'none', background: 'var(--gradient)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Navigation size={13} /> Réserver
                    </button>
                  </a>
                  <a href={`/suivi/${a.id}`} aria-label="Suivre" style={{ textDecoration: 'none' }}>
                    <button style={{ width: 40, padding: '10px 0', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--tx2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Route size={15} />
                    </button>
                  </a>
                </div>
              </div>
            </MarkerPopup>
          </MapMarker>
        ))}

        {/* Suivi : route + puck directionnel */}
        {trackingArtisanId && routeCoords.length > 1 && <MapRoute coordinates={routeCoords} color="#7C5CFF" width={5} />}
        {trackingArtisanId && puck && (
          <MapMarker longitude={puck.lng} latitude={puck.lat}>
            <MarkerContent>
              <div style={{ position: 'relative', width: 46, height: 46 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(124,92,255,0.3)', animation: 'bmDot 2s infinite' }} />
                <div style={{ position: 'absolute', top: 7, left: 7, width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#5A3DF0,#7C5CFF)', border: '3px solid #fff', boxShadow: '0 3px 12px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `rotate(${heading}deg)`, transition: 'transform 0.45s ease' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 2 L19.5 21 L12 16.2 L4.5 21 Z" /></svg>
                </div>
              </div>
            </MarkerContent>
          </MapMarker>
        )}

        <MapControls showZoom showLocate />
      </Map>

      {/* Bandeau ETA en mode suivi */}
      {trackingArtisanId && (distance || eta) && (
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 20, background: 'var(--glass-bg)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid var(--glass-edge)', borderRadius: 14, padding: '14px 18px', fontFamily: 'Nexa, sans-serif', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 800, letterSpacing: '0.08em' }}>ARTISAN EN ROUTE</span>
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
