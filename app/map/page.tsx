'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { OtherCategorySearch } from '@/components/OtherCategory'

const BetiMap = dynamic(() => import('@/components/BetiMap'), { ssr: false })

const CATS = [
  { id: '',            icon: '✳', label: 'Tous',          labelAr: 'الكل' },
  { id: 'plomberie',   icon: '⚙', label: 'Plomberie',     labelAr: 'السباكة' },
  { id: 'electricite', icon: '⚡', label: 'Électricité',   labelAr: 'الكهرباء' },
  { id: 'menage',      icon: '✦', label: 'Ménage',         labelAr: 'التنظيف' },
  { id: 'demenagement',icon: '◈', label: 'Déménagement',   labelAr: 'النقل' },
  { id: 'jardinage',   icon: '❧', label: 'Jardinage',      labelAr: 'البستنة' },
  { id: 'peinture',    icon: '◉', label: 'Peinture',       labelAr: 'الدهان' },
  { id: 'serrurerie',  icon: '⌘', label: 'Serrurerie',     labelAr: 'الأقفال' },
  { id: 'informatique',icon: '⬡', label: 'Informatique',   labelAr: 'الإعلام الآلي' },
  { id: 'coiffure',    icon: '✂', label: 'Coiffure',       labelAr: 'الحلاقة' },
  { id: 'autre',       icon: '◇', label: 'Autre',          labelAr: 'أخرى' },
]

export default function MapPage() {
  const { t, isAr } = useLang()
  const [clientLat, setClientLat] = useState(36.7538)
  const [clientLng, setClientLng] = useState(3.0588)
  const [artisanCount, setArtisanCount] = useState(0)
  const [locating, setLocating] = useState(false)
  const [cityName, setCityName] = useState('Alger')
  const [activeCategory, setActiveCategory] = useState('')

  useEffect(() => {
    if (navigator.geolocation) {
      setLocating(true)
      navigator.geolocation.getCurrentPosition(async pos => {
        setClientLat(pos.coords.latitude); setClientLng(pos.coords.longitude); setLocating(false)
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=${isAr ? 'ar' : 'fr'}`)
          const data = await res.json()
          setCityName(data.address?.city || data.address?.town || data.address?.village || 'Alger')
        } catch {}
      }, () => setLocating(false))
    }
    supabase.from('artisans').select('id', { count: 'exact', head: true }).eq('is_available', true).then(({ count }) => setArtisanCount(count || 0))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D12', fontFamily: 'Nexa, sans-serif', padding: '84px 40px 40px', direction: isAr ? 'rtl' : 'ltr' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 8 }}>
            {isAr ? 'الخريطة التفاعلية' : 'CARTE INTERACTIVE'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: '#F0EDE8', lineHeight: 1.2, marginBottom: 8 }}>
                {isAr ? 'حرفيون بالقرب منك' : 'Artisans autour de vous'}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {locating ? (
                  <span style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>{isAr ? 'جارٍ تحديد موقعك...' : 'Détection en cours...'}</span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4ade80', fontWeight: 300 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }}/>
                    {cityName}
                    {artisanCount > 0 && <span style={{ color: '#555' }}>· {artisanCount} {isAr ? 'حرفي متاح' : 'disponible' + (artisanCount > 1 ? 's' : '')}</span>}
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => { setLocating(true); navigator.geolocation?.getCurrentPosition(pos => { setClientLat(pos.coords.latitude); setClientLng(pos.coords.longitude); setLocating(false) }, () => setLocating(false)) }}
              style={{ padding: '10px 18px', borderRadius: 10, background: '#161620', border: '0.5px solid #2a2a3a', color: '#888', fontSize: 12, fontWeight: 300, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#C9A84C'; e.currentTarget.style.color = '#C9A84C' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a3a'; e.currentTarget.style.color = '#888' }}
            >
              {locating ? (isAr ? 'جارٍ...' : 'Détection...') : (isAr ? 'تحديث الموقع' : 'Actualiser la position')}
            </button>
          </div>
        </div>

        {/* Catégories */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {CATS.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: '7px 14px', borderRadius: 10, fontSize: 12, cursor: 'pointer',
                fontFamily: 'Nexa, sans-serif', display: 'flex', alignItems: 'center', gap: 6,
                background: activeCategory === cat.id ? '#1a1508' : '#161620',
                border: `0.5px solid ${activeCategory === cat.id ? '#C9A84C' : '#2a2a3a'}`,
                color: activeCategory === cat.id ? '#C9A84C' : '#555',
                fontWeight: activeCategory === cat.id ? 800 : 300, transition: 'all 0.15s',
              }}
            >
              <span>{cat.icon}</span> {isAr ? cat.labelAr : cat.label}
            </button>
          ))}
        </div>

        {/* Mots-clés pour Autre */}
        {activeCategory === 'autre' && (
          <div style={{ maxWidth: 640, marginBottom: 16 }}>
            <OtherCategorySearch onSearch={() => {}}/>
          </div>
        )}

        {/* Carte */}
        <BetiMap clientLat={clientLat} clientLng={clientLng} showAllArtisans={true}/>

        {/* Légende */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 20 }}>
          {[
            { color: '#C9A84C', label: isAr ? 'موقعك' : 'Votre position' },
            { color: '#4ade80', label: isAr ? 'حرفي متاح' : 'Artisan disponible' },
            { color: '#555',    label: isAr ? 'حرفي غير متاح' : 'Artisan indisponible' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }}/>
              <span style={{ fontSize: 12, color: '#888', fontWeight: 300 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
