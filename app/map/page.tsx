'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

// Import dynamique pour éviter les erreurs SSR avec Leaflet
const BetiMap = dynamic(() => import('@/components/BetiMap'), { ssr: false })

export default function MapPage() {
  const [tracking, setTracking] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D12', fontFamily: 'Nexa, sans-serif', padding: '80px 40px 40px' }}>

      {/* Nav simple */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 64, padding: '0 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(9,9,15,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '0.5px solid #1e1e2a',
      }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, background: '#C9A84C', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: '#0D0D12',
          }}>B</div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#F0EDE8', letterSpacing: '0.1em' }}>BETI</span>
        </a>
        <a href="/" style={{ fontSize: 13, color: '#555', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Retour
        </a>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 8 }}>
            CARTE INTERACTIVE
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#F0EDE8', lineHeight: 1.2 }}>
              Artisans proches<br/>de vous
            </h1>
            <button
              onClick={() => setTracking(!tracking)}
              style={{
                padding: '12px 24px', borderRadius: 12,
                background: tracking ? '#0a2010' : '#C9A84C',
                border: tracking ? '0.5px solid #4ade80' : 'none',
                color: tracking ? '#4ade80' : '#0D0D12',
                fontSize: 14, fontWeight: 800, cursor: 'pointer',
                fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: tracking ? '#4ade80' : '#0D0D12',
                boxShadow: tracking ? '0 0 8px #4ade80' : 'none',
              }}/>
              {tracking ? 'Suivi actif — Jean Dupont' : 'Simuler suivi GPS'}
            </button>
          </div>
        </div>

        {/* Info suivi */}
        {tracking && (
          <div style={{
            background: '#0a2010', border: '0.5px solid #4ade8044',
            borderRadius: 12, padding: '14px 20px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', flexShrink: 0 }}/>
            <div style={{ fontSize: 13, color: '#4ade80', fontWeight: 300 }}>
              Jean Dupont est en route vers vous · Position mise à jour en temps réel toutes les 2 secondes
            </div>
          </div>
        )}

        {/* Carte */}
        <BetiMap
          trackingArtisanId={tracking ? '1' : undefined}
          clientLat={48.8566}
          clientLng={2.3522}
          showAllArtisans={true}
        />

        {/* Instructions */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12, marginTop: 20,
        }}>
          {[
            { icon: '👆', title: 'Cliquez sur un artisan', desc: 'Pour voir son profil et l\'itinéraire' },
            { icon: '⭕', title: 'Cercle coloré', desc: 'Zone d\'intervention de l\'artisan' },
            { icon: '📍', title: 'Point doré', desc: 'Votre position actuelle' },
            { icon: '🔧', title: 'Icône animée', desc: 'Artisan en déplacement vers vous' },
          ].map(item => (
            <div key={item.title} style={{
              background: '#161620', border: '0.5px solid #2a2a3a',
              borderRadius: 12, padding: '14px 16px',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
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