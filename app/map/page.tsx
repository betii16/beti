'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BetiMap = dynamic(() => import('@/components/BetiMap'), { ssr: false })

export default function MapPage() {
  const [tracking, setTracking] = useState(false)
  const [clientLat, setClientLat] = useState(36.7538)
  const [clientLng, setClientLng] = useState(3.0588)
  const [artisanCount, setArtisanCount] = useState(0)
  const [locating, setLocating] = useState(false)
  const [cityName, setCityName] = useState('Alger')

  useEffect(() => {
    // Géolocalisation automatique
    if (navigator.geolocation) {
      setLocating(true)
      navigator.geolocation.getCurrentPosition(
        async pos => {
          setClientLat(pos.coords.latitude)
          setClientLng(pos.coords.longitude)
          setLocating(false)
          // Reverse geocoding pour afficher la ville
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=fr`)
            const data = await res.json()
            const city = data.address?.city || data.address?.town || data.address?.village || 'Votre position'
            setCityName(city)
          } catch {}
        },
        () => setLocating(false)
      )
    }

    // Compter les vrais artisans
    supabase.from('artisans').select('id', { count: 'exact', head: true })
      .then(({ count }) => setArtisanCount(count || 0))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D12', fontFamily: 'Nexa, sans-serif', padding: '84px 40px 40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 8 }}>
            CARTE INTERACTIVE
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: '#F0EDE8', lineHeight: 1.2, marginBottom: 8 }}>
                Artisans proches<br/>de vous
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {locating ? (
                  <div style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>⏳ Détection de votre position...</div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4ade80', fontWeight: 300 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }}/>
                    📍 {cityName}
                    {artisanCount > 0 && <span style={{ color: '#555' }}>· {artisanCount} artisan{artisanCount > 1 ? 's' : ''} inscrit{artisanCount > 1 ? 's' : ''}</span>}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {/* Bouton GPS */}
              <button
                onClick={() => {
                  setLocating(true)
                  navigator.geolocation.getCurrentPosition(pos => {
                    setClientLat(pos.coords.latitude)
                    setClientLng(pos.coords.longitude)
                    setLocating(false)
                  }, () => setLocating(false))
                }}
                style={{ padding: '12px 20px', borderRadius: 12, background: '#161620', border: '0.5px solid #2a2a3a', color: '#C9A84C', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                🎯 {locating ? 'Localisation...' : 'Ma position'}
              </button>

              {/* Bouton suivi */}
              <button
                onClick={() => setTracking(!tracking)}
                style={{ padding: '12px 24px', borderRadius: 12, background: tracking ? '#0a2010' : '#C9A84C', border: tracking ? '0.5px solid #4ade80' : 'none', color: tracking ? '#4ade80' : '#0D0D12', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: tracking ? '#4ade80' : '#0D0D12', boxShadow: tracking ? '0 0 8px #4ade80' : 'none' }}/>
                {tracking ? 'Suivi actif' : 'Simuler suivi GPS'}
              </button>
            </div>
          </div>
        </div>

        {/* Bandeau suivi actif */}
        {tracking && (
          <div style={{ background: '#0a2010', border: '0.5px solid #4ade8044', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', flexShrink: 0 }}/>
            <div style={{ fontSize: 13, color: '#4ade80', fontWeight: 300 }}>
              L'artisan est en route vers vous · Position mise à jour en temps réel toutes les 2 secondes
            </div>
          </div>
        )}

        {/* Message si aucun artisan */}
        {artisanCount === 0 && (
          <div style={{ background: '#1a1508', border: '0.5px solid #C9A84C33', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 16 }}>ℹ️</span>
            <div style={{ fontSize: 13, color: '#C9A84C', fontWeight: 300 }}>
              Aucun artisan inscrit pour l'instant. Les artisans apparaîtront automatiquement sur la carte dès leur inscription.
            </div>
          </div>
        )}

        {/* Carte */}
        <BetiMap
          trackingArtisanId={tracking ? '1' : undefined}
          clientLat={clientLat}
          clientLng={clientLng}
          showAllArtisans={true}
        />

        {/* Instructions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 20 }}>
          {[
            { icon: '👆', title: 'Cliquez sur un artisan', desc: "Pour voir son profil et l'itinéraire" },
            { icon: '⭕', title: 'Cercle coloré',           desc: "Zone d'intervention de l'artisan" },
            { icon: '📍', title: 'Point doré',              desc: 'Votre position actuelle' },
            { icon: '🔧', title: 'Icône animée',            desc: 'Artisan en déplacement vers vous' },
          ].map(item => (
            <div key={item.title} style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#F0EDE8', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
