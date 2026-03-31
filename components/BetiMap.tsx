'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'



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

const CAT_COLORS: Record<string, string> = {
  plomberie: '#3b82f6', electricite: '#f59e0b', menage: '#10b981',
  demenagement: '#8b5cf6', jardinage: '#22c55e', peinture: '#ef4444',
  serrurerie: '#f97316', informatique: '#6366f1', coiffure: '#ec4899',
  autre: '#a78bfa',
}

export default function BetiMap({
  trackingArtisanId,
  clientLat = 36.7538,
  clientLng = 3.0588,
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
  const [mapLoaded, setMapLoaded] = useState(false)
const [mapReady, setMapReady] = useState(false)
  const [distance, setDistance] = useState('')
  const [eta, setEta] = useState('')
  const [artisans, setArtisans] = useState<ArtisanMarker[]>([])

  const calcDist = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  // Charger les vrais artisans depuis Supabase
  useEffect(() => {
    const loadArtisans = async () => {
      const { data } = await supabase
        .from('artisans')
        .select('id, category, hourly_rate, is_available, rating_avg, intervention_radius_km, lat, lng, profiles(full_name)')
        .not('lat', 'is', null)
        .not('lng', 'is', null)

      if (data && data.length > 0) {
        setArtisans(data.map((a: any) => ({
          id: a.id,
          name: a.profiles?.full_name || 'Artisan',
          initials: (a.profiles?.full_name || 'A').split(' ').map((n: string) => n[0]).join('').toUpperCase(),
          category: a.category || 'autre',
          rating: a.rating_avg || 0,
          price: a.hourly_rate || 0,
          available: a.is_available,
          color: CAT_COLORS[a.category] || '#C9A84C',
          lat: a.lat,
          lng: a.lng,
          radius_km: a.intervention_radius_km || 20,
        })))
      } else {
        // Données démo si aucun artisan avec coordonnées
        setArtisans([
          { id: '1', name: 'Karim Benali',   initials: 'KB', category: 'plomberie',   rating: 4.9, price: 3500, available: true,  color: '#3b82f6', lat: 36.7538, lng: 3.0588,  radius_km: 15 },
          { id: '2', name: 'Sofiane Amrani', initials: 'SA', category: 'electricite', rating: 4.8, price: 4000, available: true,  color: '#f59e0b', lat: 36.7700, lng: 3.0310,  radius_km: 20 },
          { id: '3', name: 'Amina Kaci',     initials: 'AK', category: 'menage',      rating: 5.0, price: 2000, available: true,  color: '#10b981', lat: 36.7400, lng: 3.0900,  radius_km: 10 },
          { id: '4', name: 'Riad Hamdi',     initials: 'RH', category: 'serrurerie',  rating: 4.6, price: 4500, available: false, color: '#f97316', lat: 36.7200, lng: 3.0200,  radius_km: 25 },
          { id: '5', name: 'Nadia Bouzid',   initials: 'NB', category: 'coiffure',    rating: 4.9, price: 1500, available: true,  color: '#ec4899', lat: 36.7600, lng: 3.1200,  radius_km: 8  },
        ])
      }
    }
    loadArtisans()

    // Écoute temps réel — nouveaux artisans
    const channel = supabase
      .channel('artisans-map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'artisans' }, loadArtisans)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Charger Leaflet
  useEffect(() => {
    if (typeof window === 'undefined') return
    const loadLeaflet = async () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'; link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }
      if (!(window as any).L) {
        await new Promise<void>(resolve => {
          const s = document.createElement('script')
          s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
          s.onload = () => resolve()
          document.head.appendChild(s)
        })
      }
      setMapLoaded(true)
    }
    loadLeaflet()
  }, [])

  // Init carte
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstance.current) return
    const L = (window as any).L

    const map = L.map(mapRef.current, { center: [clientLat, clientLng], zoom: 13, zoomControl: false })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Marqueur client
    const clientIcon = L.divIcon({
      html: `<div style="width:18px;height:18px;border-radius:50%;background:#C9A84C;border:3px solid #0D0D12;box-shadow:0 0 0 3px #C9A84C44,0 0 20px #C9A84C66"></div>`,
      iconSize: [18, 18], iconAnchor: [9, 9], className: '',
    })
    L.marker([clientLat, clientLng], { icon: clientIcon }).addTo(map)
      .bindPopup('<div style="font-family:sans-serif;font-weight:800;color:#0D0D12">📍 Votre position</div>')

    mapInstance.current = map
  }, [mapLoaded, clientLat, clientLng])

  // Ajouter marqueurs artisans quand les données chargent
  useEffect(() => {
    if (!mapReady || !mapInstance.current || artisans.length === 0) return
    const map = mapInstance.current
    const L = (window as any).L

    // Nettoyer anciens marqueurs
    markersRef.current.forEach(({ marker, circle }) => { map.removeLayer(marker); map.removeLayer(circle) })
    markersRef.current = []

    artisans.forEach(artisan => {
      // Zone d'intervention
      const circle = L.circle([artisan.lat, artisan.lng], {
        radius: artisan.radius_km * 1000,
        color: artisan.color, fillColor: artisan.color,
        fillOpacity: 0.05, weight: 1, opacity: 0.3, dashArray: '4 4',
      }).addTo(map)

      // Marqueur
      const icon = L.divIcon({
        html: `<div style="width:40px;height:40px;border-radius:50%;background:${artisan.color}22;border:2px solid ${artisan.color};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:${artisan.color};box-shadow:0 0 12px ${artisan.color}44;cursor:pointer;${!artisan.available ? 'opacity:0.5;filter:grayscale(0.5)' : ''}">${artisan.initials}</div>`,
        iconSize: [40, 40], iconAnchor: [20, 20], className: '',
      })

      const marker = L.marker([artisan.lat, artisan.lng], { icon })
        .addTo(map)
        .on('click', () => {
          setSelectedArtisan(artisan)
          const dist = calcDist(clientLat, clientLng, artisan.lat, artisan.lng)
          setDistance(dist.toFixed(1))
          setEta(Math.round(dist / 30 * 60) + ' min')
          if (routeLayerRef.current) map.removeLayer(routeLayerRef.current)
          routeLayerRef.current = L.polyline([[artisan.lat, artisan.lng], [clientLat, clientLng]], { color: artisan.color, weight: 2, opacity: 0.8, dashArray: '8 6' }).addTo(map)
          map.fitBounds([[artisan.lat, artisan.lng], [clientLat, clientLng]], { padding: [60, 60] })
        })

      markersRef.current.push({ marker, circle })
    })
  }, [artisans, mapReady, clientLat, clientLng])

  // Suivi GPS artisan
  useEffect(() => {
    if (!trackingArtisanId || !mapLoaded || !mapInstance.current) return
    const L = (window as any).L
    const map = mapInstance.current

    const artisan = artisans.find(a => a.id === trackingArtisanId) || artisans[0]
    if (!artisan) return

    let lat = artisan.lat + 0.02, lng = artisan.lng + 0.02

    const vehicleIcon = L.divIcon({
      html: `<div style="width:44px;height:44px;border-radius:50%;background:#C9A84C;border:3px solid #0D0D12;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 20px #C9A84C88">🔧</div>`,
      iconSize: [44, 44], iconAnchor: [22, 22], className: '',
    })

    if (!trackingMarkerRef.current) {
      trackingMarkerRef.current = L.marker([lat, lng], { icon: vehicleIcon }).addTo(map)
    }

    const interval = setInterval(() => {
      lat += (clientLat - lat) * 0.05
      lng += (clientLng - lng) * 0.05
      trackingMarkerRef.current?.setLatLng([lat, lng])
      if (routeLayerRef.current) map.removeLayer(routeLayerRef.current)
      routeLayerRef.current = L.polyline([[lat, lng], [clientLat, clientLng]], { color: '#C9A84C', weight: 2, opacity: 0.8, dashArray: '8 6' }).addTo(map)
      const dist = calcDist(lat, lng, clientLat, clientLng)
      setDistance(dist.toFixed(1))
      setEta(Math.max(1, Math.round(dist / 30 * 60)) + ' min')
    }, 2000)

    return () => {
      clearInterval(interval)
      if (trackingMarkerRef.current) { map.removeLayer(trackingMarkerRef.current); trackingMarkerRef.current = null }
    }
  }, [trackingArtisanId, mapLoaded, artisans, clientLat, clientLng])

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '0.5px solid #2a2a3a' }}>
      <div ref={mapRef} style={{ width: '100%', height: 520, background: '#0D0D12' }}/>

      {/* Légende */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, background: 'rgba(9,9,15,0.92)', backdropFilter: 'blur(12px)', border: '0.5px solid #2a2a3a', borderRadius: 12, padding: '12px 16px' }}>
        <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 10 }}>LÉGENDE</div>
        {[{ color: '#C9A84C', label: 'Vous' }, { color: '#4ade80', label: 'Artisan disponible' }, { color: '#555', label: 'Artisan occupé' }].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }}/>
            <span style={{ fontSize: 12, color: '#888', fontWeight: 300 }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Tracking info */}
      {trackingArtisanId && (distance || eta) && (
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, background: 'rgba(9,9,15,0.92)', backdropFilter: 'blur(12px)', border: '0.5px solid #C9A84C44', borderRadius: 12, padding: '16px 20px', minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }}/>
            <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 800, letterSpacing: '0.08em' }}>ARTISAN EN ROUTE</span>
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
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 1000, background: 'rgba(9,9,15,0.95)', backdropFilter: 'blur(16px)', border: `0.5px solid ${selectedArtisan.color}44`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: selectedArtisan.color + '22', border: `2px solid ${selectedArtisan.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: selectedArtisan.color, flexShrink: 0 }}>
            {selectedArtisan.initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', marginBottom: 2 }}>{selectedArtisan.name}</div>
            <div style={{ fontSize: 11, color: selectedArtisan.color, letterSpacing: '0.06em', fontWeight: 800 }}>
              {selectedArtisan.category.toUpperCase()} · {distance ? `${distance} km` : ''} · ETA {eta}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#C9A84C', marginBottom: 8 }}>{selectedArtisan.price.toLocaleString('fr-DZ')} DA/h</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setSelectedArtisan(null)} style={{ padding: '8px 14px', borderRadius: 8, background: 'transparent', border: '0.5px solid #2a2a3a', color: '#666', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>Fermer</button>
              <a href={`/artisan/${selectedArtisan.id}`}>
                <button style={{ padding: '8px 16px', borderRadius: 8, background: '#C9A84C', border: 'none', color: '#0D0D12', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>Réserver</button>
              </a>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .leaflet-container { background: #0D0D12 !important; }
        .leaflet-tile { filter: brightness(0.85) saturate(0.8); }
        .leaflet-popup-content-wrapper { background: #161620 !important; border: 0.5px solid #2a2a3a !important; border-radius: 10px !important; color: #F0EDE8 !important; }
        .leaflet-popup-tip { background: #161620 !important; }
        .leaflet-control-zoom a { background: #161620 !important; color: #F0EDE8 !important; border: 0.5px solid #2a2a3a !important; }
        .leaflet-control-attribution { display: none; }
      `}</style>
    </div>
  )
}


