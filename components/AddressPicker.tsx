'use client'

// components/AddressPicker.tsx
// Saisie d'adresse + carte avec curseur draggable — style Yassir

import { useState, useEffect, useRef } from 'react'

type Location = {
  lat: number
  lng: number
  address: string
}

export function AddressPicker({
  onConfirm,
  defaultLat = 36.7538,
  defaultLng = 3.0588,
}: {
  onConfirm: (location: Location) => void
  defaultLat?: number
  defaultLng?: number
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [address, setAddress] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [currentLat, setCurrentLat] = useState(defaultLat)
  const [currentLng, setCurrentLng] = useState(defaultLng)
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
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

    // Fermer suggestions au clic dehors
    const handleClick = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Initialiser la carte
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstance.current) return

    const L = (window as any).L

    const map = L.map(mapRef.current, {
      center: [currentLat, currentLng],
      zoom: 15,
      zoomControl: false,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Icône curseur personnalisé
    const pinIcon = L.divIcon({
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center">
          <div style="
            width:44px;height:44px;border-radius:50% 50% 50% 0;
            background:#C9A84C;transform:rotate(-45deg);
            border:3px solid #0D0D12;
            box-shadow:0 0 0 3px #C9A84C44, 0 4px 12px rgba(0,0,0,0.4);
          "></div>
          <div style="
            width:2px;height:18px;background:#C9A84C;
            margin-top:-2px;opacity:0.7;
          "></div>
        </div>`,
      iconSize: [44, 66],
      iconAnchor: [22, 66],
      className: '',
    })

    // Marqueur draggable
    const marker = L.marker([currentLat, currentLng], {
      icon: pinIcon,
      draggable: true,
    }).addTo(map)

    // Quand on glisse le marqueur
    marker.on('dragend', async (e: any) => {
      const { lat, lng } = e.target.getLatLng()
      setCurrentLat(lat)
      setCurrentLng(lng)
      await reverseGeocode(lat, lng)
    })

    // Quand on clique sur la carte
    map.on('click', async (e: any) => {
      const { lat, lng } = e.latlng
      marker.setLatLng([lat, lng])
      setCurrentLat(lat)
      setCurrentLng(lng)
      await reverseGeocode(lat, lng)
    })

    mapInstance.current = map
    markerRef.current = marker
  }, [mapLoaded])

  // Reverse geocoding — adresse depuis coordonnées
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`
      )
      const data = await res.json()
      if (data.display_name) {
        const addr = formatAddress(data)
        setAddress(addr)
      }
    } catch {}
  }

  // Formater l'adresse de manière lisible
  const formatAddress = (data: any) => {
    const a = data.address || {}
    const parts = [
      a.house_number,
      a.road || a.street,
      a.suburb || a.neighbourhood || a.quarter,
      a.city || a.town || a.village || a.municipality,
    ].filter(Boolean)
    return parts.join(', ') || data.display_name
  }

  // Recherche d'adresse avec Nominatim
  const searchAddress = async (query: string) => {
    if (query.length < 3) { setSuggestions([]); return }
    setLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' Algérie')}&format=json&addressdetails=1&limit=6&accept-language=fr&countrycodes=dz`
      )
      const data = await res.json()
      setSuggestions(data)
      setShowSuggestions(data.length > 0)
    } catch {}
    setLoading(false)
  }

  const handleAddressInput = (val: string) => {
    setAddress(val)
    setConfirmed(false)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => searchAddress(val), 600)
  }

  const handleSelectSuggestion = (suggestion: any) => {
    const lat = parseFloat(suggestion.lat)
    const lng = parseFloat(suggestion.lon)
    const addr = suggestion.display_name

    setAddress(addr)
    setCurrentLat(lat)
    setCurrentLng(lng)
    setShowSuggestions(false)

    // Déplacer la carte et le marqueur
    if (mapInstance.current && markerRef.current) {
      mapInstance.current.setView([lat, lng], 17, { animate: true })
      markerRef.current.setLatLng([lat, lng])
    }
  }

  // GPS — position actuelle
  const handleGPS = () => {
    if (!navigator.geolocation) return
    setLoading(true)
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lng } = pos.coords
      setCurrentLat(lat)
      setCurrentLng(lng)
      if (mapInstance.current && markerRef.current) {
        mapInstance.current.setView([lat, lng], 17, { animate: true })
        markerRef.current.setLatLng([lat, lng])
      }
      await reverseGeocode(lat, lng)
      setLoading(false)
    }, () => setLoading(false))
  }

  const handleConfirm = () => {
    if (!address) return
    setConfirmed(true)
    onConfirm({ lat: currentLat, lng: currentLng, address })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 14, overflow: 'hidden', border: '0.5px solid #2a2a3a' }}>

      {/* Barre de recherche */}
      <div ref={dropRef} style={{ position: 'relative', background: '#161620' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {/* Icône adresse */}
          <div style={{ padding: '0 14px', fontSize: 16, color: '#C9A84C', flexShrink: 0 }}>📍</div>

          {/* Input */}
          <input
            type="text"
            value={address}
            onChange={e => handleAddressInput(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
            placeholder="Votre adresse exacte..."
            style={{
              flex: 1, padding: '14px 0',
              background: 'transparent', border: 'none',
              color: '#F0EDE8', fontSize: 14, outline: 'none',
              fontFamily: 'Nexa, sans-serif', fontWeight: 300,
            }}
          />

          {/* Bouton GPS */}
          <button
            onClick={handleGPS}
            style={{
              padding: '14px 16px', background: 'transparent', border: 'none',
              borderLeft: '0.5px solid #2a2a3a', color: loading ? '#555' : '#C9A84C',
              cursor: 'pointer', fontSize: 16, flexShrink: 0,
              transition: 'color 0.2s',
            }}
            title="Ma position actuelle"
          >
            {loading ? '⏳' : '🎯'}
          </button>
        </div>

        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
            background: '#161620', border: '0.5px solid #2a2a3a',
            borderTop: 'none', borderRadius: '0 0 12px 12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden',
          }}>
            {suggestions.map((s, i) => (
              <div
                key={i}
                onClick={() => handleSelectSuggestion(s)}
                style={{
                  padding: '11px 16px', cursor: 'pointer',
                  borderTop: '0.5px solid #1e1e2a',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1e1e2a')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>📍</span>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#F0EDE8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.address?.road || s.address?.suburb || s.name || s.display_name.split(',')[0]}
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

      {/* Carte */}
      <div style={{ position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: 280 }}/>

        {/* Instruction */}
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(9,9,15,0.85)', backdropFilter: 'blur(8px)',
          border: '0.5px solid #2a2a3a', borderRadius: 20,
          padding: '6px 14px', zIndex: 1000, whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: 11, color: '#888', fontWeight: 300, fontFamily: 'Nexa, sans-serif' }}>
            Glissez le curseur 📍 devant votre porte
          </span>
        </div>

        <style>{`
          .leaflet-container { background: #0D0D12 !important; }
          .leaflet-tile { filter: brightness(0.9) saturate(0.7); }
          .leaflet-control-zoom a { background: #161620 !important; color: #F0EDE8 !important; border: 0.5px solid #2a2a3a !important; }
          .leaflet-control-attribution { display: none; }
        `}</style>
      </div>

      {/* Bouton confirmer */}
      <div style={{ background: '#161620', padding: '12px', borderTop: '0.5px solid #1e1e2a' }}>
        <button
          onClick={handleConfirm}
          disabled={!address}
          style={{
            width: '100%', padding: '13px',
            background: confirmed ? '#0a2010' : address ? '#C9A84C' : '#1a1a2a',
            border: confirmed ? '0.5px solid #4ade8044' : 'none',
            borderRadius: 10,
            color: confirmed ? '#4ade80' : address ? '#0D0D12' : '#444',
            fontSize: 14, fontWeight: 800,
            cursor: address ? 'pointer' : 'not-allowed',
            fontFamily: 'Nexa, sans-serif', transition: 'all 0.3s',
          }}
        >
          {confirmed ? '✅ Adresse confirmée' : '📍 Confirmer cette adresse'}
        </button>
      </div>
    </div>
  )
}
