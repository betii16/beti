'use client'

import { supabase } from '@/lib/supabase'

// components/ArtisanZonePicker.tsx
// Côté artisan — choisir son adresse + rayon d'intervention

import { useState, useEffect, useRef } from 'react'


const RADIUS_OPTIONS = [
  { km: 5,  label: '5 km',  desc: 'Mon quartier' },
  { km: 10, label: '10 km', desc: 'Ma commune' },
  { km: 20, label: '20 km', desc: 'Ma ville + alentours' },
  { km: 30, label: '30 km', desc: 'Grande zone' },
  { km: 50, label: '50 km', desc: 'Wilaya entière' },
]

export function ArtisanZonePicker({
  artisanId,
  initialRadius = 20,
  initialAddress = '',
  initialLat = 36.7538,
  initialLng = 3.0588,
  onSave,
}: {
  artisanId: string
  initialRadius?: number
  initialAddress?: string
  initialLat?: number
  initialLng?: number
  onSave?: (data: { radius: number; address: string; lat: number; lng: number }) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const circleRef = useRef<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [address, setAddress] = useState(initialAddress)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSugg, setShowSugg] = useState(false)
  const [lat, setLat] = useState(initialLat)
  const [lng, setLng] = useState(initialLng)
  const [radius, setRadius] = useState(initialRadius)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const searchTimeout = useRef<any>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // Charger Leaflet
  useEffect(() => {
    if (typeof window === 'undefined') return
    const loadLeaflet = async () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }
      if (!(window as any).L) {
        await new Promise<void>(resolve => {
          const script = document.createElement('script')
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
          script.onload = () => resolve()
          document.head.appendChild(script)
        })
      }
      setMapLoaded(true)
    }
    loadLeaflet()

    const handleClick = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node)) setShowSugg(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Init carte
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstance.current) return
    const L = (window as any).L

    const map = L.map(mapRef.current, {
      center: [lat, lng], zoom: 12, zoomControl: false,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Marqueur artisan
    const pinIcon = L.divIcon({
      html: `<div style="width:36px;height:36px;border-radius:50%;background:#C9A84C22;border:2.5px solid #C9A84C;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 12px #C9A84C44;cursor:grab">🔧</div>`,
      iconSize: [36, 36], iconAnchor: [18, 18], className: '',
    })

    const marker = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map)

    // Zone d'intervention
    const circle = L.circle([lat, lng], {
      radius: radius * 1000,
      color: '#C9A84C', fillColor: '#C9A84C',
      fillOpacity: 0.08, weight: 1.5, opacity: 0.6,
      dashArray: '6 4',
    }).addTo(map)

    marker.on('dragend', async (e: any) => {
      const { lat: newLat, lng: newLng } = e.target.getLatLng()
      setLat(newLat); setLng(newLng)
      circle.setLatLng([newLat, newLng])
      await reverseGeocode(newLat, newLng)
    })

    map.on('click', async (e: any) => {
      const { lat: newLat, lng: newLng } = e.latlng
      marker.setLatLng([newLat, newLng])
      circle.setLatLng([newLat, newLng])
      setLat(newLat); setLng(newLng)
      await reverseGeocode(newLat, newLng)
    })

    mapInstance.current = map
    markerRef.current = marker
    circleRef.current = circle

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [mapLoaded])

  // Mettre à jour le cercle quand le rayon change
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius * 1000)
      if (mapInstance.current) {
        mapInstance.current.fitBounds(circleRef.current.getBounds(), { padding: [20, 20] })
      }
    }
  }, [radius])

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`)
      const data = await res.json()
      if (data.address) {
        const a = data.address
        const parts = [a.house_number, a.road, a.suburb || a.neighbourhood, a.city || a.town || a.village].filter(Boolean)
        setAddress(parts.join(', ') || data.display_name)
      }
    } catch {}
  }

  const searchAddress = async (q: string) => {
    if (q.length < 3) return
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ' Algérie')}&format=json&addressdetails=1&limit=5&accept-language=fr&countrycodes=dz`)
      const data = await res.json()
      setSuggestions(data)
      setShowSugg(data.length > 0)
    } catch {}
  }

  const handleAddressInput = (val: string) => {
    setAddress(val); setSaved(false)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => searchAddress(val), 600)
  }

  const handleSelectSuggestion = (s: any) => {
    const newLat = parseFloat(s.lat), newLng = parseFloat(s.lon)
    setAddress(s.display_name); setLat(newLat); setLng(newLng); setShowSugg(false)
    if (mapInstance.current && markerRef.current && circleRef.current) {
      mapInstance.current.setView([newLat, newLng], 13, { animate: true })
      markerRef.current.setLatLng([newLat, newLng])
      circleRef.current.setLatLng([newLat, newLng])
    }
  }

  const handleGPS = () => {
    if (!navigator.geolocation) return
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: newLat, longitude: newLng } = pos.coords
      setLat(newLat); setLng(newLng)
      if (mapInstance.current && markerRef.current && circleRef.current) {
        mapInstance.current.setView([newLat, newLng], 14, { animate: true })
        markerRef.current.setLatLng([newLat, newLng])
        circleRef.current.setLatLng([newLat, newLng])
      }
      await reverseGeocode(newLat, newLng)
      setDetecting(false)
    }, () => setDetecting(false))
  }

  const handleSave = async () => {
    if (!address) return
    setSaving(true)
    await supabase.from('artisans').update({
      intervention_radius_km: radius,
      location_city: address.split(',')[0],
    }).eq('id', artisanId)

    // Stocker les coordonnées exactes si on a PostGIS
    try {
      await supabase.rpc('update_artisan_location', { artisan_id: artisanId, latitude: lat, longitude: lng })
    } catch {}

    setSaving(false); setSaved(true)
    onSave?.({ radius, address, lat, lng })
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{ fontFamily: 'Nexa, sans-serif' }}>
      {/* Titre */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 6 }}>
          VOTRE ZONE D'INTERVENTION
        </div>
        <p style={{ fontSize: 13, color: '#555', fontWeight: 300, lineHeight: 1.6 }}>
          Définissez votre adresse et le périmètre dans lequel vous intervenez. Seuls les clients dans cette zone vous trouveront.
        </p>
      </div>

      {/* Barre adresse + GPS */}
      <div ref={dropRef} style={{ position: 'relative', marginBottom: 16 }}>
        <div style={{ display: 'flex', background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 12, overflow: 'visible' }}>
          <div style={{ padding: '0 14px', fontSize: 16, color: '#C9A84C', display: 'flex', alignItems: 'center', flexShrink: 0 }}>🔧</div>
          <input
            type="text"
            value={address}
            onChange={e => handleAddressInput(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setShowSugg(true) }}
            placeholder="Votre adresse (rue, quartier, ville)..."
            style={{ flex: 1, padding: '13px 0', background: 'transparent', border: 'none', color: '#F0EDE8', fontSize: 13, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}
          />
          <button onClick={handleGPS} style={{ padding: '0 16px', background: 'transparent', border: 'none', borderLeft: '0.5px solid #2a2a3a', color: detecting ? '#555' : '#C9A84C', cursor: 'pointer', fontSize: 16, flexShrink: 0 }} title="Ma position">
            {detecting ? '⏳' : '🎯'}
          </button>
        </div>

        {/* Suggestions */}
        {showSugg && suggestions.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 1000, background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            {suggestions.map((s, i) => (
              <div key={i} onClick={() => handleSelectSuggestion(s)}
                style={{ padding: '11px 16px', cursor: 'pointer', borderTop: i > 0 ? '0.5px solid #1e1e2a' : 'none', display: 'flex', gap: 10, alignItems: 'center', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1e1e2a')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>📍</span>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#F0EDE8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.address?.road || s.address?.suburb || s.display_name.split(',')[0]}
                  </div>
                  <div style={{ fontSize: 11, color: '#555', fontWeight: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.display_name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sélection du rayon */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 12 }}>
          RAYON D'INTERVENTION
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {RADIUS_OPTIONS.map(opt => (
            <button
              key={opt.km}
              onClick={() => { setRadius(opt.km); setSaved(false) }}
              style={{
                flex: 1, minWidth: 80, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                background: radius === opt.km ? '#1a1508' : '#161620',
                border: `0.5px solid ${radius === opt.km ? '#C9A84C' : '#2a2a3a'}`,
                outline: 'none', transition: 'all 0.2s', fontFamily: 'Nexa, sans-serif',
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 800, color: radius === opt.km ? '#C9A84C' : '#F0EDE8', marginBottom: 2 }}>
                {opt.label}
              </div>
              <div style={{ fontSize: 10, color: radius === opt.km ? '#C9A84C' : '#555', fontWeight: 300 }}>
                {opt.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Carte */}
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '0.5px solid #2a2a3a', marginBottom: 16, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: 260 }}/>
        <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(9,9,15,0.85)', backdropFilter: 'blur(8px)', border: '0.5px solid #2a2a3a', borderRadius: 20, padding: '5px 12px', zIndex: 1000, whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 11, color: '#888', fontWeight: 300 }}>
            Zone couverte : <strong style={{ color: '#C9A84C', fontWeight: 800 }}>{radius} km</strong> autour de votre position
          </span>
        </div>
        <style>{`
          .leaflet-container { background: #0D0D12 !important; }
          .leaflet-tile { filter: brightness(0.85) saturate(0.7); }
          .leaflet-control-zoom a { background: #161620 !important; color: #F0EDE8 !important; border: 0.5px solid #2a2a3a !important; }
          .leaflet-control-attribution { display: none; }
        `}</style>
      </div>

      {/* Bouton sauvegarder */}
      <button onClick={handleSave} disabled={!address || saving}
        style={{
          width: '100%', padding: '13px',
          background: saved ? '#0a2010' : !address ? '#1a1a2a' : '#C9A84C',
          border: saved ? '0.5px solid #4ade8044' : 'none',
          borderRadius: 10,
          color: saved ? '#4ade80' : !address ? '#444' : '#0D0D12',
          fontSize: 14, fontWeight: 800,
          cursor: !address ? 'not-allowed' : 'pointer',
          fontFamily: 'Nexa, sans-serif', transition: 'all 0.3s',
        }}
      >
        {saving ? 'Sauvegarde...' : saved ? '✅ Zone sauvegardée !' : `Confirmer — Zone de ${radius} km`}
      </button>
    </div>
  )
}

