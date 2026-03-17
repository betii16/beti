'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Types ─────────────────────────────────────────────────────────

type ArtisanMarker = {
  id: string
  name: string
  initials: string
  category: string
  rating: number
  price: number
  available: boolean
  color: string
  lat: number
  lng: number
  radius_km: number
}

type TrackingInfo = {
  artisan_id: string
  lat: number
  lng: number
  updated_at: string
}

// ── Données démo ──────────────────────────────────────────────────

const DEMO_ARTISANS: ArtisanMarker[] = [
  { id: '1', name: 'Jean Dupont',   initials: 'JD', category: 'Plombier',      rating: 4.9, price: 45, available: true,  color: '#C9A84C', lat: 48.8566, lng: 2.3522, radius_km: 15 },
  { id: '2', name: 'Marie Laurent', initials: 'ML', category: 'Électricienne', rating: 4.8, price: 55, available: true,  color: '#60a5fa', lat: 48.8640, lng: 2.3310, radius_km: 20 },
  { id: '3', name: 'Karim Seddik',  initials: 'KS', category: 'Peintre',       rating: 4.7, price: 40, available: false, color: '#a78bfa', lat: 48.8480, lng: 2.3700, radius_km: 10 },
  { id: '4', name: 'Amina Benali',  initials: 'AB', category: 'Ménage',        rating: 5.0, price: 25, available: true,  color: '#4ade80', lat: 48.8720, lng: 2.3450, radius_km: 25 },
  { id: '5', name: 'Thomas Petit',  initials: 'TP', category: 'Serrurier',     rating: 4.6, price: 60, available: true,  color: '#f97316', lat: 48.8400, lng: 2.3200, radius_km: 12 },
]

// ── Composant carte ───────────────────────────────────────────────

export default function BetiMap({
  trackingArtisanId,
  clientLat = 48.8566,
  clientLng = 2.3522,
  showAllArtisans = true,
}: {
  trackingArtisanId?: string
  clientLat?: number
  clientLng?: number
  showAllArtisans?: boolean
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const trackingMarkerRef = useRef<any>(null)
  const routeLayerRef = useRef<any>(null)
  const [selectedArtisan, setSelectedArtisan] = useState<ArtisanMarker | null>(null)
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [distance, setDistance] = useState<string>('')
  const [eta, setEta] = useState<string>('')

  // Calculer distance entre 2 points
  const calcDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  // Charger Leaflet dynamiquement
  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadLeaflet = async () => {
      // CSS Leaflet
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      // JS Leaflet
      if (!(window as any).L) {
        await new Promise<void>((resolve) => {
          const script = document.createElement('script')
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
          script.onload = () => resolve()
          document.head.appendChild(script)
        })
      }

      setMapLoaded(true)
    }

    loadLeaflet()
  }, [])

  // Initialiser la carte
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstance.current) return

    const L = (window as any).L

    // Créer la carte avec style sombre
    const map = L.map(mapRef.current, {
      center: [clientLat, clientLng],
      zoom: 13,
      zoomControl: false,
    })

    // Tuiles sombres (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap ©CartoDB',
      maxZoom: 19,
    }).addTo(map)

    // Contrôles zoom en bas à droite
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    mapInstance.current = map

    // Marqueur client (position de l'utilisateur)
    const clientIcon = L.divIcon({
      html: `<div style="
        width: 18px; height: 18px; border-radius: 50%;
        background: #C9A84C; border: 3px solid #0D0D12;
        box-shadow: 0 0 0 3px #C9A84C44, 0 0 20px #C9A84C66;
      "></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      className: '',
    })

    L.marker([clientLat, clientLng], { icon: clientIcon })
      .addTo(map)
      .bindPopup('<div style="font-family:Nexa,sans-serif;color:#0D0D12;font-weight:800">📍 Votre position</div>')

    // Ajouter les artisans
    if (showAllArtisans) {
      DEMO_ARTISANS.forEach(artisan => addArtisanMarker(artisan, map, L))
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [mapLoaded, clientLat, clientLng, showAllArtisans])

  const addArtisanMarker = (artisan: ArtisanMarker, map: any, L: any) => {
    // Zone d'intervention (cercle)
    const circle = L.circle([artisan.lat, artisan.lng], {
      radius: artisan.radius_km * 1000,
      color: artisan.color,
      fillColor: artisan.color,
      fillOpacity: 0.05,
      weight: 1,
      opacity: 0.3,
      dashArray: '4 4',
    }).addTo(map)

    // Marqueur artisan
    const icon = L.divIcon({
      html: `<div style="
        width: 40px; height: 40px; border-radius: 50%;
        background: ${artisan.color}22;
        border: 2px solid ${artisan.color};
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: 800; color: ${artisan.color};
        font-family: Nexa, sans-serif;
        box-shadow: 0 0 12px ${artisan.color}44;
        cursor: pointer;
        ${!artisan.available ? 'opacity: 0.5; filter: grayscale(0.5)' : ''}
      ">${artisan.initials}</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      className: '',
    })

    const marker = L.marker([artisan.lat, artisan.lng], { icon })
      .addTo(map)
      .on('click', () => {
        setSelectedArtisan(artisan)
        const dist = calcDistance(clientLat, clientLng, artisan.lat, artisan.lng)
        setDistance(dist.toFixed(1))
        setEta(Math.round(dist / 30 * 60) + ' min')
        drawRoute(artisan.lat, artisan.lng, map, L)
      })

    markersRef.current.push({ marker, circle, artisan })
  }

  // Dessiner l'itinéraire
  const drawRoute = (artLat: number, artLng: number, map: any, L: any) => {
    if (routeLayerRef.current) map.removeLayer(routeLayerRef.current)

    // Ligne pointillée entre artisan et client
    routeLayerRef.current = L.polyline(
      [[artLat, artLng], [clientLat, clientLng]],
      {
        color: '#C9A84C',
        weight: 2,
        opacity: 0.8,
        dashArray: '8 6',
      }
    ).addTo(map)

    // Centrer la vue sur l'itinéraire
    map.fitBounds([[artLat, artLng], [clientLat, clientLng]], { padding: [60, 60] })
  }

  // Suivi GPS temps réel
  useEffect(() => {
    if (!trackingArtisanId || !mapLoaded) return

    const L = (window as any).L
    const map = mapInstance.current
    if (!map || !L) return

    // Icône véhicule artisan
    const vehicleIcon = L.divIcon({
      html: `<div style="
        width: 44px; height: 44px; border-radius: 50%;
        background: #C9A84C; border: 3px solid #0D0D12;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
        box-shadow: 0 0 20px #C9A84C88;
        animation: pulse 1.5s ease-in-out infinite;
      ">🔧</div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      className: '',
    })

    // Simuler le mouvement GPS (en prod: lire depuis Supabase)
    let lat = DEMO_ARTISANS[0].lat + 0.02
    let lng = DEMO_ARTISANS[0].lng + 0.02

    if (!trackingMarkerRef.current) {
      trackingMarkerRef.current = L.marker([lat, lng], { icon: vehicleIcon }).addTo(map)
    }

    // Simuler déplacement vers le client
    const interval = setInterval(() => {
      lat += (clientLat - lat) * 0.05
      lng += (clientLng - lng) * 0.05
      trackingMarkerRef.current?.setLatLng([lat, lng])

      const dist = calcDistance(lat, lng, clientLat, clientLng)
      setDistance(dist.toFixed(1))
      setEta(Math.max(1, Math.round(dist / 30 * 60)) + ' min')

      if (routeLayerRef.current) map.removeLayer(routeLayerRef.current)
      routeLayerRef.current = (window as any).L.polyline(
        [[lat, lng], [clientLat, clientLng]],
        { color: '#C9A84C', weight: 2, opacity: 0.8, dashArray: '8 6' }
      ).addTo(map)

      setTrackingInfo({ artisan_id: trackingArtisanId, lat, lng, updated_at: new Date().toISOString() })
    }, 2000)

    // Écoute Supabase Realtime pour les vraies mises à jour GPS
    const channel = supabase
      .channel(`tracking-${trackingArtisanId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'artisans',
        filter: `id=eq.${trackingArtisanId}`,
      }, (payload: any) => {
        if (payload.new?.location) {
          // Parser la position PostGIS
          console.log('GPS update:', payload.new)
        }
      })
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [trackingArtisanId, mapLoaded, clientLat, clientLng])

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '0.5px solid #2a2a3a' }}>
      {/* Carte */}
      <div ref={mapRef} style={{ width: '100%', height: 520, background: '#0D0D12' }}>
        {!mapLoaded && (
          <div style={{
<<<<<<< Updated upstream
            position: 'absolute', zIndex: 1000, zIndex: 1000, inset: 0, display: 'flex',
=======
            position: 'absolute', inset: 0, display: 'flex',
>>>>>>> Stashed changes
            alignItems: 'center', justifyContent: 'center',
            background: '#0D0D12', color: '#555', fontSize: 14,
            fontFamily: 'Nexa, sans-serif',
          }}>
            Chargement de la carte...
          </div>
        )}
      </div>

      {/* Légende */}
      <div style={{
<<<<<<< Updated upstream
        position: 'absolute', zIndex: 1000, zIndex: 1000, top: 16, left: 16, zIndex: 1000,
=======
        position: 'absolute', top: 16, left: 16,
>>>>>>> Stashed changes
        background: 'rgba(9,9,15,0.92)', backdropFilter: 'blur(12px)',
        border: '0.5px solid #2a2a3a', borderRadius: 12, padding: '12px 16px',
      }}>
        <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 10 }}>
          LÉGENDE
        </div>
        {[
          { color: '#C9A84C', label: 'Vous' },
          { color: '#4ade80', label: 'Artisan disponible' },
          { color: '#555',    label: 'Artisan occupé' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }}/>
            <span style={{ fontSize: 12, color: '#888', fontWeight: 300 }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Tracking en temps réel */}
      {trackingArtisanId && (distance || eta) && (
        <div style={{
<<<<<<< Updated upstream
          position: 'absolute', zIndex: 1000, zIndex: 1000, top: 16, right: 16,
=======
          position: 'absolute', top: 16, right: 16,
>>>>>>> Stashed changes
          background: 'rgba(9,9,15,0.92)', backdropFilter: 'blur(12px)',
          border: '0.5px solid #C9A84C44', borderRadius: 12, padding: '16px 20px',
          minWidth: 200,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }}/>
            <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 800, letterSpacing: '0.08em' }}>
              ARTISAN EN ROUTE
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#C9A84C' }}>{distance} km</div>
              <div style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>Distance</div>
            </div>
            <div style={{ width: '0.5px', background: '#2a2a3a' }}/>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#F0EDE8' }}>{eta}</div>
              <div style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>Arrivée estimée</div>
            </div>
          </div>
        </div>
      )}

      {/* Fiche artisan sélectionné */}
      {selectedArtisan && (
        <div style={{
<<<<<<< Updated upstream
          position: 'absolute', zIndex: 1000, zIndex: 1000, bottom: 16, left: 16, right: 16,
=======
          position: 'absolute', bottom: 16, left: 16, right: 16,
>>>>>>> Stashed changes
          background: 'rgba(9,9,15,0.95)', backdropFilter: 'blur(16px)',
          border: `0.5px solid ${selectedArtisan.color}44`,
          borderRadius: 14, padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: selectedArtisan.color + '22',
            border: `2px solid ${selectedArtisan.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 800, color: selectedArtisan.color,
            flexShrink: 0,
          }}>
            {selectedArtisan.initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', marginBottom: 2 }}>
              {selectedArtisan.name}
            </div>
            <div style={{ fontSize: 11, color: selectedArtisan.color, letterSpacing: '0.06em', fontWeight: 800 }}>
              {selectedArtisan.category.toUpperCase()} · {distance ? `${distance} km` : ''} · ETA {eta}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#C9A84C', marginBottom: 8 }}>
              {selectedArtisan.price}€/h
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setSelectedArtisan(null)}
                style={{
                  padding: '8px 14px', borderRadius: 8, background: 'transparent',
                  border: '0.5px solid #2a2a3a', color: '#666', fontSize: 12,
                  cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300,
                }}
              >Fermer</button>
              <button style={{
                padding: '8px 16px', borderRadius: 8, background: '#C9A84C',
                border: 'none', color: '#0D0D12', fontSize: 12, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'Nexa, sans-serif',
              }}>
                Réserver
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 #C9A84C44; }
          50% { box-shadow: 0 0 0 12px transparent; }
        }
        .leaflet-container { background: #0D0D12 !important; }
        .leaflet-tile { filter: brightness(0.85) saturate(0.8); }
        .leaflet-popup-content-wrapper {
          background: #161620 !important; border: 0.5px solid #2a2a3a !important;
          border-radius: 10px !important; color: #F0EDE8 !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4) !important;
        }
        .leaflet-popup-tip { background: #161620 !important; }
        .leaflet-control-zoom a {
          background: #161620 !important; color: #F0EDE8 !important;
          border: 0.5px solid #2a2a3a !important;
        }
        .leaflet-control-zoom a:hover { background: #1e1e2a !important; }
        .leaflet-control-attribution { display: none; }
      `}</style>
    </div>
  )
}
