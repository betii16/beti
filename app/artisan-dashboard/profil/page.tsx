'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArtisanAvatar } from '@/components/ReviewPhotos'

// ── Types ──

type Service = {
  category: string
  description: string
  price_type: 'hour' | 'service' | 'quote' | 'negotiable'
  price: number
}

// ── Constantes ──

const CATEGORIES = [
  { id: 'plomberie',    icon: '⚙',  label: 'Plomberie',    color: '#3b82f6' },
  { id: 'electricite',  icon: '⚡',  label: 'Électricité',  color: '#f59e0b' },
  { id: 'menage',       icon: '✦',  label: 'Ménage',        color: '#10b981' },
  { id: 'demenagement', icon: '◈',  label: 'Déménagement',  color: '#8b5cf6' },
  { id: 'jardinage',    icon: '❧',  label: 'Jardinage',     color: '#22c55e' },
  { id: 'peinture',     icon: '◉',  label: 'Peinture',      color: '#ef4444' },
  { id: 'serrurerie',   icon: '⌘',  label: 'Serrurerie',    color: '#f97316' },
  { id: 'informatique', icon: '⬡',  label: 'Informatique',  color: '#6366f1' },
  { id: 'coiffure',     icon: '✂',  label: 'Coiffure',      color: '#ec4899' },
]

const PRICE_TYPES = [
  { id: 'hour',       label: 'À l\'heure',      suffix: 'DA/h',       icon: '🕐' },
  { id: 'service',    label: 'Par prestation',   suffix: 'DA/prestation', icon: '📋' },
  { id: 'quote',      label: 'Sur devis',        suffix: '',           icon: '📝' },
  { id: 'negotiable', label: 'À négocier',       suffix: '',           icon: '🤝' },
]

const POPULAR_TAGS = [
  'piscine', 'climatisation', 'chauffe-eau solaire', 'domotique', 'panneau solaire',
  'carrelage', 'parquet', 'faux plafond', 'isolation', 'menuiserie',
  'livreur', 'livraison', 'coursier', 'vitrier', 'tapissier',
]

// ── Page ──

export default function ArtisanProfileConfig() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState<'services' | 'info' | 'tags'>('services')

  // Profile data
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bio, setBio] = useState('')
  const [experience, setExperience] = useState(1)
  const [locationCity, setLocationCity] = useState('')
  const [artisanAddress, setArtisanAddress] = useState('')
  const [artisanLat, setArtisanLat] = useState<number | null>(null)
  const [artisanLng, setArtisanLng] = useState<number | null>(null)
  const [radiusKm, setRadiusKm] = useState(20)
  const [detectingAddr, setDetectingAddr] = useState(false)

  // Services (multi-catégorie)
  const [services, setServices] = useState<Service[]>([])
  const [addingService, setAddingService] = useState(false)

  // Tags / mots-clés
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // Validation
  const [phoneError, setPhoneError] = useState('')
  const [addressError, setAddressError] = useState('')
  const [isNewProfile, setIsNewProfile] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  // Géocode une adresse texte en lat/lng
  const geocodeAddress = async (addr: string) => {
    if (!addr || addr.length < 3) return
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`)
      const data = await res.json()
      if (data && data[0]) {
        setArtisanLat(parseFloat(data[0].lat))
        setArtisanLng(parseFloat(data[0].lon))
        setAddressError('')
      }
    } catch {}
  }

  // Détecter la position GPS de l'artisan
  const detectPosition = () => {
    if (!navigator.geolocation) return
    setDetectingAddr(true)
    navigator.geolocation.getCurrentPosition(async pos => {
      setArtisanLat(pos.coords.latitude)
      setArtisanLng(pos.coords.longitude)
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=fr`)
        const data = await res.json()
        const addr = data.address
        const full = addr?.road ? `${addr.road}, ${addr.city || addr.town || addr.village || ''}` : addr?.city || addr?.town || ''
        if (full) { setArtisanAddress(full); setLocationCity(addr?.city || addr?.town || addr?.village || '') }
      } catch {}
      setDetectingAddr(false)
    }, () => setDetectingAddr(false))
  }

  const loadProfile = async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { router.push('/auth/login'); return }
    setUser(u)

    const [{ data: prof }, { data: art }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', u.id).single(),
      supabase.from('artisans').select('*').eq('id', u.id).single(),
    ])

    if (prof) {
      setFullName(prof.full_name || '')
      setPhone(prof.phone || '')
      setAvatarUrl(prof.avatar_url || null)
    }

    if (art) {
      setBio(art.bio || '')
      setExperience(art.years_experience || 1)
      setLocationCity(art.location_city || '')
      setTags(art.tags || [])
      setArtisanLat(art.lat || null)
      setArtisanLng(art.lng || null)
      setRadiusKm(art.intervention_radius_km || 20)
      if (art.location_city) setArtisanAddress(art.location_city)

      // Charger les services
      if (art.services && Array.isArray(art.services)) {
        setServices(art.services)
      } else if (art.category) {
        // Migration depuis l'ancien format (single category)
        setServices([{
          category: art.category,
          description: art.bio || '',
          price_type: 'hour',
          price: art.hourly_rate || 3000,
        }])
      }

      if (!art.category && !art.services) setIsNewProfile(true)
    } else {
      setIsNewProfile(true)
    }

    setLoading(false)
  }

  // ── Vérification téléphone unique ──

  const checkPhone = async (phoneVal: string) => {
    if (!phoneVal || phoneVal.length < 9) return
    setPhoneError('')
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phoneVal)
      .neq('id', user?.id || '')
      .limit(1)
    if (data && data.length > 0) {
      setPhoneError('Ce numéro est déjà utilisé par un autre compte')
    }
  }

  // ── Gestion des services ──

  const addService = (categoryId: string) => {
    if (services.find(s => s.category === categoryId)) return
    setServices(prev => [...prev, {
      category: categoryId,
      description: '',
      price_type: 'hour',
      price: 3000,
    }])
    setAddingService(false)
  }

  const updateService = (index: number, updates: Partial<Service>) => {
    setServices(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s))
  }

  const removeService = (index: number) => {
    setServices(prev => prev.filter((_, i) => i !== index))
  }

  // ── Tags ──

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase()
    if (!t || tags.includes(t) || tags.length >= 15 || t.length > 30) return
    setTags(prev => [...prev, t])
    setTagInput('')
  }

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag))

  const [saveError, setSaveError] = useState('')

  // ── Sauvegarder ──

  const handleSave = async () => {
    if (!user) return
    if (phoneError) return
    setSaveError('')

    // Validation
    if (!phone || phone.length < 8) {
      setPhoneError('Numéro de téléphone obligatoire')
      setActiveSection('info')
      return
    }
    if (!artisanAddress) {
      setAddressError('Adresse obligatoire pour apparaître dans les résultats')
      setActiveSection('info')
      return
    }
    if (services.length === 0 && tags.length === 0) {
      setSaveError('Ajoutez au moins un métier ou des mots-clés')
      setActiveSection('services')
      return
    }

    // Géocoder l'adresse si pas encore de coordonnées
    if (!artisanLat || !artisanLng) {
      await geocodeAddress(artisanAddress)
    }

    setSaving(true)

    // 1. Sauvegarder profil
    const { error: profErr } = await supabase.from('profiles').update({
      full_name: fullName,
      phone: phone,
    }).eq('id', user.id)

    if (profErr) { setSaveError('Erreur profil: ' + profErr.message); setSaving(false); return }

    // 2. Catégorie principale
    const mainCategory = services.length > 0 ? services[0].category : 'plomberie'
    const mainRate = services.length > 0 ? services[0].price : 0
    const city = artisanAddress.split(',').pop()?.trim() || artisanAddress

    // 3. Sauvegarder artisan — essayer avec services d'abord
    const artisanUpdate: any = {
      bio,
      category: mainCategory,
      hourly_rate: mainRate,
      tags,
      years_experience: experience,
      is_available: true,
      lat: artisanLat,
      lng: artisanLng,
      intervention_radius_km: radiusKm,
      location_city: city,
    }

    // Essayer avec le champ services (jsonb)
    const { error: artErr } = await supabase.from('artisans').update({
      ...artisanUpdate,
      services: services,
    }).eq('id', user.id)

    if (artErr) {
      // Si le champ services n'existe pas, sauvegarder sans
      const { error: artErr2 } = await supabase.from('artisans').update(artisanUpdate).eq('id', user.id)
      if (artErr2) { setSaveError('Erreur: ' + artErr2.message); setSaving(false); return }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  // ── Helpers ──

  const getCat = (id: string) => CATEGORIES.find(c => c.id === id)
  const getPriceType = (id: string) => PRICE_TYPES.find(p => p.id === id)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 14, color: '#555' }}>Chargement...</div>
      </div>
    )
  }

  return (
    <>
      <style suppressHydrationWarning>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0D0D12; font-family: 'Nexa', sans-serif; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        input[type=range] { accent-color: #C9A84C; cursor: pointer; }
        textarea:focus, input:focus { border-color: #C9A84C66 !important; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0D0D12', paddingTop: 64, fontFamily: 'Nexa, sans-serif' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '.1em', fontWeight: 800, marginBottom: 6 }}>
                {isNewProfile ? 'CONFIGURATION INITIALE' : 'MODIFIER MON PROFIL'}
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8' }}>Mon profil artisan</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {user && (
                <ArtisanAvatar
                  userId={user.id}
                  currentUrl={avatarUrl}
                  name={fullName}
                  size={52}
                  editable={true}
                  onUpload={url => setAvatarUrl(url)}
                />
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: '#161620', borderRadius: 12, padding: 4 }}>
            {([
              { id: 'services', label: 'Mes métiers', icon: '🔧', badge: services.length },
              { id: 'info',     label: 'Informations', icon: '👤' },
              { id: 'tags',     label: 'Mots-clés', icon: '🏷️', badge: tags.length },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setActiveSection(tab.id)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 10, border: 'none',
                  background: activeSection === tab.id ? '#1a1508' : 'transparent',
                  color: activeSection === tab.id ? '#C9A84C' : '#555',
                  fontSize: 13, fontWeight: activeSection === tab.id ? 800 : 300,
                  cursor: 'pointer', fontFamily: 'Nexa, sans-serif',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}
              >
                <span>{tab.icon}</span> {tab.label}
                {'badge' in tab && (tab as any).badge > 0 && (
                  <span style={{ padding: '1px 7px', borderRadius: 10, background: '#C9A84C', color: '#0D0D12', fontSize: 10, fontWeight: 800 }}>{(tab as any).badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* ═══ SECTION : MES MÉTIERS ═══ */}
          {activeSection === 'services' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>

              {/* Liste des services ajoutés */}
              {services.map((service, i) => {
                const cat = getCat(service.category)
                return (
                  <div key={i} style={{ background: '#161620', border: `0.5px solid ${cat?.color || '#2a2a3a'}33`, borderRadius: 16, padding: '24px', marginBottom: 16 }}>

                    {/* Header service */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: (cat?.color || '#C9A84C') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{cat?.icon || '🔧'}</div>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#F0EDE8' }}>{cat?.label || service.category}</div>
                          <div style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>Service {i + 1}{i === 0 ? ' · Principal' : ''}</div>
                        </div>
                      </div>
                      <button onClick={() => removeService(i)}
                        style={{ padding: '4px 12px', borderRadius: 8, background: '#1a0a0a', border: '0.5px solid #2a1010', color: '#f87171', fontSize: 11, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 800 }}>
                        Retirer
                      </button>
                    </div>

                    {/* Description pour ce métier */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>
                        DESCRIPTION — {cat?.label?.toUpperCase()}
                      </label>
                      <textarea
                        value={service.description}
                        onChange={e => updateService(i, { description: e.target.value })}
                        placeholder={`Décrivez vos compétences en ${cat?.label?.toLowerCase()}... (ex: spécialisé en rénovation, 10 ans d'expérience, intervention rapide)`}
                        rows={3}
                        maxLength={300}
                        style={{
                          width: '100%', padding: '12px 14px', background: '#0D0D12',
                          border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#F0EDE8',
                          fontSize: 13, outline: 'none', fontFamily: 'Nexa, sans-serif',
                          fontWeight: 300, resize: 'none', lineHeight: 1.6,
                        }}
                      />
                      <div style={{ fontSize: 10, color: '#444', textAlign: 'right', marginTop: 4 }}>{service.description.length}/300</div>
                    </div>

                    {/* Type de tarification */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 10 }}>
                        TARIFICATION
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                        {PRICE_TYPES.map(pt => (
                          <button key={pt.id} onClick={() => updateService(i, { price_type: pt.id as any })}
                            style={{
                              padding: '10px 14px', borderRadius: 10,
                              border: `0.5px solid ${service.price_type === pt.id ? '#C9A84C' : '#2a2a3a'}`,
                              background: service.price_type === pt.id ? '#1a1508' : '#0D0D12',
                              color: service.price_type === pt.id ? '#C9A84C' : '#555',
                              fontSize: 12, fontWeight: service.price_type === pt.id ? 800 : 300,
                              cursor: 'pointer', fontFamily: 'Nexa, sans-serif',
                              display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
                            }}
                          >
                            <span>{pt.icon}</span> {pt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Prix (si applicable) */}
                    {(service.price_type === 'hour' || service.price_type === 'service') && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em' }}>
                            {service.price_type === 'hour' ? 'TARIF HORAIRE' : 'TARIF PAR PRESTATION'}
                          </label>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#C9A84C' }}>
                            {service.price.toLocaleString('fr-DZ')} <span style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>{getPriceType(service.price_type)?.suffix}</span>
                          </div>
                        </div>
                        <input type="range" min={500} max={30000} step={500}
                          value={service.price}
                          onChange={e => updateService(i, { price: Number(e.target.value) })}
                          style={{ width: '100%' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                          <span style={{ fontSize: 10, color: '#444' }}>500 DA</span>
                          <span style={{ fontSize: 10, color: '#444' }}>30 000 DA</span>
                        </div>
                      </div>
                    )}

                    {service.price_type === 'quote' && (
                      <div style={{ padding: '10px 14px', borderRadius: 8, background: '#0D0D12', border: '0.5px solid #2a2a3a' }}>
                        <span style={{ fontSize: 12, color: '#888', fontWeight: 300 }}>📝 Les clients vous contacteront pour obtenir un devis personnalisé</span>
                      </div>
                    )}
                    {service.price_type === 'negotiable' && (
                      <div style={{ padding: '10px 14px', borderRadius: 8, background: '#0D0D12', border: '0.5px solid #2a2a3a' }}>
                        <span style={{ fontSize: 12, color: '#888', fontWeight: 300 }}>🤝 Le prix sera discuté avec le client selon la prestation</span>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Bouton ajouter un métier */}
              {!addingService ? (
                <button onClick={() => setAddingService(true)}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 14,
                    background: 'transparent', border: '1px dashed #C9A84C44',
                    color: '#C9A84C', fontSize: 14, fontWeight: 800,
                    cursor: 'pointer', fontFamily: 'Nexa, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  + Ajouter un métier {services.length === 0 && '(obligatoire)'}
                </button>
              ) : (
                <div style={{ background: '#161620', border: '0.5px solid #C9A84C33', borderRadius: 16, padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8' }}>Choisir un métier</div>
                    <button onClick={() => setAddingService(false)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {CATEGORIES.filter(c => !services.find(s => s.category === c.id)).map(cat => (
                      <button key={cat.id} onClick={() => addService(cat.id)}
                        style={{
                          padding: '14px 10px', borderRadius: 12, border: '0.5px solid #2a2a3a',
                          background: '#0D0D12', cursor: 'pointer', display: 'flex',
                          flexDirection: 'column', alignItems: 'center', gap: 8,
                          fontFamily: 'Nexa, sans-serif', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = cat.color; e.currentTarget.style.background = cat.color + '12' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a3a'; e.currentTarget.style.background = '#0D0D12' }}
                      >
                        <span style={{ fontSize: 22 }}>{cat.icon}</span>
                        <span style={{ fontSize: 11, color: '#888', fontWeight: 300 }}>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                  {services.length === 0 && (
                    <p style={{ fontSize: 11, color: '#555', fontWeight: 300, marginTop: 12, textAlign: 'center' }}>
                      Vous pouvez sélectionner plusieurs métiers
                    </p>
                  )}
                </div>
              )}

              {services.length === 0 && (
                <p style={{ fontSize: 12, color: '#f87171', fontWeight: 300, marginTop: 8, textAlign: 'center' }}>
                  Ajoutez au moins un métier ou des mots-clés dans l'onglet "Mots-clés"
                </p>
              )}
            </div>
          )}

          {/* ═══ SECTION : INFORMATIONS ═══ */}
          {activeSection === 'info' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 16, padding: '24px' }}>

                {/* Nom */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>NOM COMPLET</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    style={{ width: '100%', padding: '13px 16px', background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#F0EDE8', fontSize: 14, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}/>
                </div>

                {/* Téléphone (unique!) */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>
                    NUMÉRO DE TÉLÉPHONE <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ padding: '13px 14px', background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#888', fontSize: 14, fontWeight: 300, flexShrink: 0 }}>
                      +213
                    </div>
                    <input type="tel" value={phone} placeholder="0555 12 34 56"
                      onChange={e => { setPhone(e.target.value); setPhoneError('') }}
                      onBlur={() => checkPhone(phone)}
                      style={{ flex: 1, padding: '13px 16px', background: '#0D0D12', border: `0.5px solid ${phoneError ? '#f87171' : '#2a2a3a'}`, borderRadius: 10, color: '#F0EDE8', fontSize: 14, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}/>
                  </div>
                  {phoneError && <p style={{ fontSize: 12, color: '#f87171', marginTop: 6, fontWeight: 300 }}>{phoneError}</p>}
                  <p style={{ fontSize: 11, color: '#444', marginTop: 6, fontWeight: 300 }}>
                    🔒 Un seul compte par numéro — les clients pourront vous appeler directement
                  </p>
                </div>

                {/* Bio */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>BIO / PRÉSENTATION</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)}
                    placeholder="Présentez-vous en quelques mots... (parcours, expérience, ce qui vous distingue)"
                    rows={4} maxLength={500}
                    style={{ width: '100%', padding: '12px 14px', background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#F0EDE8', fontSize: 13, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300, resize: 'none', lineHeight: 1.6 }}/>
                  <div style={{ fontSize: 10, color: '#444', textAlign: 'right', marginTop: 4 }}>{bio.length}/500</div>
                </div>

                {/* Expérience */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 10 }}>ANNÉES D'EXPÉRIENCE</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[1, 2, 3, 5, 7, 10, 15, 20].map(y => (
                      <button key={y} onClick={() => setExperience(y)}
                        style={{ padding: '8px 16px', borderRadius: 10, border: `0.5px solid ${experience === y ? '#C9A84C' : '#2a2a3a'}`, background: experience === y ? '#1a1508' : '#0D0D12', color: experience === y ? '#C9A84C' : '#555', fontSize: 13, fontWeight: experience === y ? 800 : 300, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                        {y} an{y > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Adresse de l'artisan */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>
                    ADRESSE <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <p style={{ fontSize: 11, color: '#444', fontWeight: 300, marginBottom: 10 }}>
                    Les clients proches de cette adresse vous trouveront en priorité
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={artisanAddress}
                      onChange={e => { setArtisanAddress(e.target.value); setAddressError('') }}
                      onBlur={() => geocodeAddress(artisanAddress)}
                      placeholder="Ex: 12 Rue Didouche Mourad, Alger"
                      style={{ flex: 1, padding: '13px 16px', background: '#0D0D12', border: `0.5px solid ${addressError ? '#f87171' : '#2a2a3a'}`, borderRadius: 10, color: '#F0EDE8', fontSize: 14, outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}
                    />
                    <button onClick={detectPosition} disabled={detectingAddr}
                      style={{ padding: '13px 16px', background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 10, color: '#888', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300, flexShrink: 0, transition: 'all 0.2s' }}
                    >
                      {detectingAddr ? '...' : 'Ma position'}
                    </button>
                  </div>
                  {addressError && <p style={{ fontSize: 11, color: '#f87171', marginTop: 6, fontWeight: 300 }}>{addressError}</p>}
                  {artisanLat && artisanLng && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80' }}/>
                      <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 300 }}>Position enregistrée</span>
                    </div>
                  )}
                </div>

                {/* Rayon d'intervention */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em' }}>RAYON D'INTERVENTION</label>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#C9A84C' }}>{radiusKm} km</span>
                  </div>
                  <input type="range" min={5} max={100} step={5}
                    value={radiusKm}
                    onChange={e => setRadiusKm(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#C9A84C', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: '#444' }}>5 km</span>
                    <span style={{ fontSize: 10, color: '#444' }}>100 km</span>
                  </div>
                </div>

                {/* Photo de profil */}
                <div>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 12 }}>PHOTO DE PROFIL</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {user && (
                      <ArtisanAvatar
                        userId={user.id}
                        currentUrl={avatarUrl}
                        name={fullName}
                        size={72}
                        editable={true}
                        onUpload={url => setAvatarUrl(url)}
                      />
                    )}
                    <div>
                      <p style={{ fontSize: 13, color: '#888', fontWeight: 300, marginBottom: 4 }}>Une photo aide les clients à vous faire confiance</p>
                      <p style={{ fontSize: 11, color: '#444', fontWeight: 300 }}>JPG ou PNG · Max 5MB</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ SECTION : MOTS-CLÉS ═══ */}
          {activeSection === 'tags' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 16, padding: '24px' }}>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8', marginBottom: 6 }}>Mots-clés & spécialités</div>
                  <p style={{ fontSize: 12, color: '#555', fontWeight: 300, lineHeight: 1.6 }}>
                    Ajoutez des mots-clés pour décrire vos spécialités. Les clients qui cherchent ces termes vous trouveront plus facilement.
                    {services.length === 0 && <><br/><span style={{ color: '#C9A84C' }}>Si vous n'avez sélectionné aucun métier standard, vos mots-clés sont essentiels !</span></>}
                  </p>
                </div>

                {/* Zone de saisie tags */}
                <div style={{ minHeight: 52, padding: '8px 12px', background: '#0D0D12', border: '0.5px solid #2a2a3a', borderRadius: 12, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 12 }}>
                  {tags.map(tag => (
                    <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: '#1a1508', border: '0.5px solid #C9A84C', fontSize: 12, color: '#C9A84C', fontWeight: 800 }}>
                      {tag}
                      <button onClick={() => removeTag(tag)} style={{ background: 'transparent', border: 'none', color: '#C9A84C', cursor: 'pointer', fontSize: 11, padding: 0, opacity: 0.7 }}>✕</button>
                    </div>
                  ))}
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) } }}
                    placeholder={tags.length === 0 ? 'Tapez un mot-clé et appuyez Entrée...' : '+ Ajouter...'}
                    style={{ flex: 1, minWidth: 120, background: 'transparent', border: 'none', outline: 'none', color: '#F0EDE8', fontSize: 13, fontFamily: 'Nexa, sans-serif', fontWeight: 300, padding: '4px' }}
                  />
                  {tagInput.trim() && (
                    <button onClick={() => addTag(tagInput)}
                      style={{ padding: '4px 14px', borderRadius: 20, background: '#C9A84C', border: 'none', color: '#0D0D12', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', flexShrink: 0 }}>
                      + Ajouter
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 11, color: '#444', fontWeight: 300 }}>{tags.length}/15 mots-clés</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {Array.from({ length: 15 }).map((_, i) => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: 2, background: i < tags.length ? '#C9A84C' : '#2a2a3a' }}/>
                    ))}
                  </div>
                </div>

                {/* Suggestions */}
                {tags.length < 15 && (
                  <div>
                    <div style={{ fontSize: 10, color: '#555', fontWeight: 800, letterSpacing: '.08em', marginBottom: 8 }}>SUGGESTIONS</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {POPULAR_TAGS.filter(t => !tags.includes(t)).slice(0, 10).map(t => (
                        <button key={t} onClick={() => addTag(t)}
                          style={{ padding: '5px 14px', borderRadius: 20, background: 'transparent', border: '0.5px solid #2a2a3a', color: '#555', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300, transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#C9A84C'; e.currentTarget.style.color = '#C9A84C' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a3a'; e.currentTarget.style.color = '#555' }}
                        >+ {t}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Bouton Sauvegarder (fixe en bas) ── */}
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, #0D0D12 30%)', padding: '40px 24px 24px', zIndex: 50 }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              {saveError && (
                <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 10, background: '#1a0a0a', border: '0.5px solid #2a1010', fontSize: 12, color: '#f87171', fontWeight: 300 }}>{saveError}</div>
              )}
              <button onClick={handleSave} disabled={saving}
                style={{
                  width: '100%', padding: '16px',
                  background: saved ? '#0a2010' : saving ? '#a08030' : '#C9A84C',
                  border: saved ? '0.5px solid #4ade8044' : 'none',
                  borderRadius: 14,
                  color: saved ? '#4ade80' : '#0D0D12',
                  fontSize: 15, fontWeight: 800,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'Nexa, sans-serif', transition: 'all 0.3s',
                  boxShadow: saved ? 'none' : '0 4px 20px #C9A84C44',
                }}
              >
                {saving ? 'Sauvegarde...' : saved ? 'Profil sauvegardé' : isNewProfile ? 'Créer mon profil' : 'Sauvegarder les modifications'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
