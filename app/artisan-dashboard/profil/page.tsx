'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArtisanAvatar } from '@/components/ReviewPhotos'
import { PortfolioManager } from '@/components/Portfolio'
import { CategoryIcon } from '@/components/icons'
import { Wrench, User, Tag, Hammer, Clock, ClipboardList, FileText, Handshake, Lock } from 'lucide-react'
import { useLang } from '@/lib/LangContext'

// ── Types ──

type Service = {
  category: string
  description: string
  price_type: 'hour' | 'service' | 'quote' | 'negotiable'
  price: number
}

// ── Constantes (id + icon + color uniquement — labels via t()) ──

const CATEGORIES = [
  { id: 'plomberie',    icon: '⚙',  color: '#3b82f6' },
  { id: 'electricite',  icon: '⚡',  color: '#f59e0b' },
  { id: 'menage',       icon: '✦',  color: '#10b981' },
  { id: 'demenagement', icon: '◈',  color: '#8b5cf6' },
  { id: 'jardinage',    icon: '❧',  color: '#22c55e' },
  { id: 'peinture',     icon: '◉',  color: '#ef4444' },
  { id: 'serrurerie',   icon: '⌘',  color: '#f97316' },
  { id: 'informatique', icon: '⬡',  color: '#6366f1' },
  { id: 'coiffure',     icon: '✂',  color: '#ec4899' },
]

const PRICE_TYPE_IDS = ['hour', 'service', 'quote', 'negotiable'] as const

const POPULAR_TAGS = [
  'piscine', 'climatisation', 'chauffe-eau solaire', 'domotique', 'panneau solaire',
  'carrelage', 'parquet', 'faux plafond', 'isolation', 'menuiserie',
  'livreur', 'livraison', 'coursier', 'vitrier', 'tapissier',
]

// ── Page ──

export default function ArtisanProfileConfig() {
  const router = useRouter()
  const { t, isAr } = useLang()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState<'services' | 'info' | 'tags' | 'portfolio'>('services')

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

  const geocodeAddress = async (addr: string): Promise<{ lat: number; lng: number } | null> => {
    if (!addr || addr.length < 3) return null
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`)
      const data = await res.json()
      if (data && data[0]) {
        const lat = parseFloat(data[0].lat)
        const lng = parseFloat(data[0].lon)
        setArtisanLat(lat)
        setArtisanLng(lng)
        setAddressError('')
        return { lat, lng }
      }
    } catch {}
    return null
  }

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

      if (art.services && Array.isArray(art.services)) {
        setServices(art.services)
      } else if (art.category) {
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
      setPhoneError(t('artisanProfile.errPhone'))
    }
  }

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

  const addTag = (tag: string) => {
    const val = tag.trim().toLowerCase()
    if (!val || tags.includes(val) || tags.length >= 15 || val.length > 30) return
    setTags(prev => [...prev, val])
    setTagInput('')
  }

  const removeTag = (tag: string) => setTags(prev => prev.filter(v => v !== tag))

  const [saveError, setSaveError] = useState('')

  const handleSave = async () => {
    if (!user) return
    if (phoneError) return
    setSaveError('')

    if (!phone || phone.length < 8) {
      setPhoneError(t('artisanProfile.errPhoneReq'))
      setActiveSection('info')
      return
    }
    if (services.length === 0 && tags.length === 0) {
      setSaveError(t('artisanProfile.errServices'))
      setActiveSection('services')
      return
    }

    let saveLat = artisanLat
    let saveLng = artisanLng
    if ((!saveLat || !saveLng) && artisanAddress) {
      const geo = await geocodeAddress(artisanAddress)
      if (geo) { saveLat = geo.lat; saveLng = geo.lng }
    }

    setSaving(true)

    const { error: profErr } = await supabase.from('profiles').update({
      full_name: fullName,
      phone: phone,
      avatar_url: avatarUrl,
    }).eq('id', user.id)

    if (profErr) { setSaveError('Erreur profil: ' + profErr.message); setSaving(false); return }

    const mainCategory = services.length > 0 ? services[0].category : 'plomberie'
    const mainRate = services.length > 0 ? services[0].price : 0
    const city = artisanAddress.split(',').pop()?.trim() || artisanAddress

    const artisanData: any = {
      id: user.id,
      bio,
      category: mainCategory,
      hourly_rate: mainRate,
      tags: tags.length > 0 ? tags : null,
      years_experience: experience,
      is_available: true,
      intervention_radius_km: radiusKm,
      location_city: city,
    }

    if (saveLat && saveLng) {
      artisanData.lat = saveLat
      artisanData.lng = saveLng
    }

    const { error: artErr } = await supabase.from('artisans').upsert({
      ...artisanData,
      services: services.length > 0 ? services : null,
    }, { onConflict: 'id' })

    if (artErr) {
      const { error: artErr2 } = await supabase.from('artisans').upsert(artisanData, { onConflict: 'id' })
      if (artErr2) { setSaveError('Erreur: ' + artErr2.message); setSaving(false); return }
    }

    setSaving(false)
    setSaved(true)
    if (!saveLat || !saveLng) {
      setSaveError(t('artisanProfile.warnNoGeo'))
    }
    setTimeout(() => setSaved(false), 3000)
  }

  const getCat = (id: string) => CATEGORIES.find(c => c.id === id)

  const priceTypeLabel = (id: string) => ({
    hour:       t('artisanProfile.priceHour'),
    service:    t('artisanProfile.priceService'),
    quote:      t('artisanProfile.priceQuote'),
    negotiable: t('artisanProfile.priceNego'),
  }[id] || id)

  const priceTypeSuffix = (id: string) => ({
    hour:    t('artisanProfile.suffixHour'),
    service: t('artisanProfile.suffixService'),
    quote:   '',
    negotiable: '',
  }[id] || '')

  const PRICE_TYPE_ICONS: Record<string, any> = {
    hour: Clock, service: ClipboardList, quote: FileText, negotiable: Handshake,
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--tx3)' }}>{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <>
      <style suppressHydrationWarning>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Nexa', sans-serif; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        input[type=range] { accent-color: #6366f1; cursor: pointer; }
        textarea:focus, input:focus { border-color: #6366f166 !important; }
      `}</style>

      <div style={{ minHeight: '100vh', paddingTop: 64, fontFamily: 'Nexa, sans-serif', direction: isAr ? 'rtl' : 'ltr' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 10, color: '#6366f1', letterSpacing: '.1em', fontWeight: 800, marginBottom: 6 }}>
                {isNewProfile ? t('artisanProfile.newConfig') : t('artisanProfile.editProfile')}
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--tx)' }}>{t('artisanProfile.pageTitle')}</h1>
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
          <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'var(--bg2)', borderRadius: 12, padding: 4 }}>
            {([
              { id: 'services'  as const, label: t('artisanProfile.tabServices'),  Icon: Wrench,  badge: services.length },
              { id: 'info'      as const, label: t('artisanProfile.tabInfo'),       Icon: User },
              { id: 'tags'      as const, label: t('artisanProfile.tabTags'),       Icon: Tag,    badge: tags.length },
              { id: 'portfolio' as const, label: t('artisanProfile.tabPortfolio'),  Icon: Hammer },
            ]).map(tab => (
              <button key={tab.id} onClick={() => setActiveSection(tab.id)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 10, border: 'none',
                  background: activeSection === tab.id ? '#6366f10d' : 'transparent',
                  color: activeSection === tab.id ? '#6366f1' : 'var(--tx3)',
                  fontSize: 13, fontWeight: activeSection === tab.id ? 800 : 300,
                  cursor: 'pointer', fontFamily: 'Nexa, sans-serif',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}
              >
                <tab.Icon size={15}/> {tab.label}
                {'badge' in tab && (tab as any).badge > 0 && (
                  <span style={{ padding: '1px 7px', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 10, fontWeight: 800 }}>{(tab as any).badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* ═══ SECTION : RÉALISATIONS (PORTFOLIO) ═══ */}
          {activeSection === 'portfolio' && user && (
            <PortfolioManager artisanId={user.id} />
          )}

          {/* ═══ SECTION : MES MÉTIERS ═══ */}
          {activeSection === 'services' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>

              {services.map((service, i) => {
                const cat = getCat(service.category)
                const catLabel = t(`categories.${service.category}`)
                const PtIcon = PRICE_TYPE_ICONS[service.price_type] || Clock
                return (
                  <div key={i} className="card" style={{ borderColor: cat?.color ? cat.color + '55' : undefined, padding: '24px', marginBottom: 16 }}>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: (cat?.color || '#6366f1') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CategoryIcon id={service.category} size={18} color={cat?.color || '#6366f1'}/></div>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)' }}>{catLabel}</div>
                          <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>{t('artisanProfile.serviceNum')} {i + 1}{i === 0 ? ` ${t('artisanProfile.servicePrimary')}` : ''}</div>
                        </div>
                      </div>
                      <button onClick={() => removeService(i)}
                        style={{ padding: '4px 12px', borderRadius: 8, background: '#ef444410', border: '0.5px solid #ef444420', color: '#ef4444', fontSize: 11, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 800 }}>
                        {t('artisanProfile.remove')}
                      </button>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <label style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>
                        {t('artisanProfile.descSection')} {catLabel.toUpperCase()}
                      </label>
                      <textarea
                        value={service.description}
                        onChange={e => updateService(i, { description: e.target.value })}
                        placeholder={`${t('artisanProfile.bioPh')} ${catLabel.toLowerCase()}...`}
                        rows={3}
                        maxLength={300}
                        className="field"
                        style={{ resize: 'none' }}
                      />
                      <div style={{ fontSize: 10, color: 'var(--tx3)', textAlign: 'right', marginTop: 4 }}>{service.description.length}/300</div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 10 }}>
                        {t('artisanProfile.priceType')}
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                        {PRICE_TYPE_IDS.map(ptId => {
                          const PIcon = PRICE_TYPE_ICONS[ptId]
                          return (
                            <button key={ptId} onClick={() => updateService(i, { price_type: ptId as any })}
                              style={{
                                padding: '10px 14px', borderRadius: 10,
                                border: `0.5px solid ${service.price_type === ptId ? '#6366f1' : 'var(--border)'}`,
                                background: service.price_type === ptId ? '#6366f10d' : 'var(--bg)',
                                color: service.price_type === ptId ? '#6366f1' : 'var(--tx3)',
                                fontSize: 12, fontWeight: service.price_type === ptId ? 800 : 300,
                                cursor: 'pointer', fontFamily: 'Nexa, sans-serif',
                                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
                              }}
                            >
                              <PIcon size={15}/> {priceTypeLabel(ptId)}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {(service.price_type === 'hour' || service.price_type === 'service') && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <label style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 800, letterSpacing: '.06em' }}>
                            {service.price_type === 'hour' ? t('artisanProfile.tariffHour') : t('artisanProfile.tariffService')}
                          </label>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>
                            {service.price.toLocaleString('fr-DZ')} <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300 }}>{priceTypeSuffix(service.price_type)}</span>
                          </div>
                        </div>
                        <input type="range" min={500} max={30000} step={500}
                          value={service.price}
                          onChange={e => updateService(i, { price: Number(e.target.value) })}
                          style={{ width: '100%' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                          <span style={{ fontSize: 10, color: 'var(--tx3)' }}>500 {t('common.da')}</span>
                          <span style={{ fontSize: 10, color: 'var(--tx3)' }}>30 000 {t('common.da')}</span>
                        </div>
                      </div>
                    )}

                    {service.price_type === 'quote' && (
                      <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg)', border: '0.5px solid var(--border)' }}>
                        <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 300 }}><FileText size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{t('artisanProfile.quoteNote')}</span>
                      </div>
                    )}
                    {service.price_type === 'negotiable' && (
                      <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg)', border: '0.5px solid var(--border)' }}>
                        <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 300 }}><Handshake size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{t('artisanProfile.negoNote')}</span>
                      </div>
                    )}
                  </div>
                )
              })}

              {!addingService ? (
                <button onClick={() => setAddingService(true)}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 14,
                    background: 'transparent', border: '1px dashed #6366f144',
                    color: '#6366f1', fontSize: 14, fontWeight: 800,
                    cursor: 'pointer', fontFamily: 'Nexa, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  {t('artisanProfile.addService')} {services.length === 0 && t('artisanProfile.addRequired')}
                </button>
              ) : (
                <div className="card" style={{ borderColor: '#6366f155', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)' }}>{t('artisanProfile.pickService')}</div>
                    <button onClick={() => setAddingService(false)} style={{ background: 'transparent', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {CATEGORIES.filter(c => !services.find(s => s.category === c.id)).map(cat => (
                      <button key={cat.id} onClick={() => addService(cat.id)}
                        style={{
                          padding: '14px 10px', borderRadius: 12, border: '0.5px solid var(--border)',
                          background: 'var(--bg)', cursor: 'pointer', display: 'flex',
                          flexDirection: 'column', alignItems: 'center', gap: 8,
                          fontFamily: 'Nexa, sans-serif', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = cat.color; e.currentTarget.style.background = cat.color + '12' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)' }}
                      >
                        <CategoryIcon id={cat.id} size={22} color={cat.color}/>
                        <span style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 300 }}>{t(`categories.${cat.id}`)}</span>
                      </button>
                    ))}
                  </div>
                  {services.length === 0 && (
                    <p style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300, marginTop: 12, textAlign: 'center' }}>
                      {t('artisanProfile.multipleHint')}
                    </p>
                  )}
                </div>
              )}

              {services.length === 0 && (
                <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 300, marginTop: 8, textAlign: 'center' }}>
                  {t('artisanProfile.requireHint')}
                </p>
              )}
            </div>
          )}

          {/* ═══ SECTION : INFORMATIONS ═══ */}
          {activeSection === 'info' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div className="card" style={{ padding: '24px' }}>

                {/* Nom */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>{t('artisanProfile.fullName')}</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="field"/>
                </div>

                {/* Téléphone */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>
                    {t('artisanProfile.phoneNum')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ padding: '13px 14px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 10, color: 'var(--tx2)', fontSize: 14, fontWeight: 300, flexShrink: 0 }}>
                      +213
                    </div>
                    <input type="tel" value={phone} placeholder="0555 12 34 56"
                      onChange={e => { setPhone(e.target.value); setPhoneError('') }}
                      onBlur={() => checkPhone(phone)}
                      className="field" style={{ flex: 1, borderColor: phoneError ? '#ef4444' : undefined }}/>
                  </div>
                  {phoneError && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6, fontWeight: 300 }}>{phoneError}</p>}
                  <p style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 6, fontWeight: 300 }}>
                    <Lock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{t('artisanProfile.phoneHint')}
                  </p>
                </div>

                {/* Bio */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>{t('artisanProfile.bioLabel')}</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)}
                    placeholder={t('artisanProfile.bioPh')}
                    rows={4} maxLength={500}
                    className="field" style={{ resize: 'none' }}/>
                  <div style={{ fontSize: 10, color: 'var(--tx3)', textAlign: 'right', marginTop: 4 }}>{bio.length}/500</div>
                </div>

                {/* Expérience */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 10 }}>{t('artisanProfile.expLabel')}</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[1, 2, 3, 5, 7, 10, 15, 20].map(y => (
                      <button key={y} onClick={() => setExperience(y)}
                        style={{ padding: '8px 16px', borderRadius: 10, border: `0.5px solid ${experience === y ? '#6366f1' : 'var(--border)'}`, background: experience === y ? '#6366f10d' : 'var(--bg)', color: experience === y ? '#6366f1' : 'var(--tx3)', fontSize: 13, fontWeight: experience === y ? 800 : 300, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                        {y} {y === 1 ? t('common.years').replace('s','') : t('common.years')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Adresse */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>
                    {t('artisanProfile.addrLabel')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <p style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300, marginBottom: 10 }}>
                    {t('artisanProfile.addrHint')}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={artisanAddress}
                      onChange={e => { setArtisanAddress(e.target.value); setAddressError('') }}
                      onBlur={() => geocodeAddress(artisanAddress)}
                      placeholder="Ex: 12 Rue Didouche Mourad, Alger"
                      className="field" style={{ flex: 1, borderColor: addressError ? '#ef4444' : undefined }}
                    />
                    <button onClick={detectPosition} disabled={detectingAddr}
                      style={{ padding: '13px 16px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 10, color: 'var(--tx2)', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300, flexShrink: 0, transition: 'all 0.2s' }}
                    >
                      {detectingAddr ? '...' : t('artisanProfile.myPosition')}
                    </button>
                  </div>
                  {addressError && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 6, fontWeight: 300 }}>{addressError}</p>}
                  {artisanLat && artisanLng && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }}/>
                      <span style={{ fontSize: 11, color: '#10b981', fontWeight: 300 }}>{t('artisanProfile.posRecorded')}</span>
                    </div>
                  )}
                </div>

                {/* Rayon d'intervention */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 800, letterSpacing: '.06em' }}>{t('artisanProfile.radiusLabel')}</label>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#6366f1' }}>{radiusKm} {t('common.km')}</span>
                  </div>
                  <input type="range" min={5} max={100} step={5}
                    value={radiusKm}
                    onChange={e => setRadiusKm(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#6366f1', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--tx3)' }}>5 {t('common.km')}</span>
                    <span style={{ fontSize: 10, color: 'var(--tx3)' }}>100 {t('common.km')}</span>
                  </div>
                </div>

                {/* Photo de profil */}
                <div>
                  <label style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 12 }}>{t('artisanProfile.photoLabel')}</label>
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
                      <p style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 300, marginBottom: 4 }}>{t('artisanProfile.photoHint')}</p>
                      <p style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>{t('artisanProfile.photoFormat')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ SECTION : MOTS-CLÉS ═══ */}
          {activeSection === 'tags' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div className="card" style={{ padding: '24px' }}>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', marginBottom: 6 }}>{t('artisanProfile.tagTitle')}</div>
                  <p style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300, lineHeight: 1.6 }}>
                    {t('artisanProfile.tagDesc')}
                    {services.length === 0 && <><br/><span style={{ color: '#6366f1' }}>{t('artisanProfile.tagDescExtra')}</span></>}
                  </p>
                </div>

                <div style={{ minHeight: 52, padding: '8px 12px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 12, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 12 }}>
                  {tags.map(tag => (
                    <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: '#6366f10d', border: '0.5px solid #6366f1', fontSize: 12, color: '#6366f1', fontWeight: 800 }}>
                      {tag}
                      <button onClick={() => removeTag(tag)} style={{ background: 'transparent', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 11, padding: 0, opacity: 0.7 }}>✕</button>
                    </div>
                  ))}
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) } }}
                    placeholder={tags.length === 0 ? t('artisanProfile.tagPh1') : t('artisanProfile.tagPh2')}
                    style={{ flex: 1, minWidth: 120, background: 'transparent', border: 'none', outline: 'none', color: 'var(--tx)', fontSize: 13, fontFamily: 'Nexa, sans-serif', fontWeight: 300, padding: '4px' }}
                  />
                  {tagInput.trim() && (
                    <button onClick={() => addTag(tagInput)}
                      style={{ padding: '4px 14px', borderRadius: 20, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', flexShrink: 0 }}>
                      {t('artisanProfile.tagAdd')}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>{tags.length}/15 {t('artisanProfile.tagCount')}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {Array.from({ length: 15 }).map((_, i) => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: 2, background: i < tags.length ? '#6366f1' : 'var(--border)' }}/>
                    ))}
                  </div>
                </div>

                {tags.length < 15 && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--tx3)', fontWeight: 800, letterSpacing: '.08em', marginBottom: 8 }}>{t('artisanProfile.tagSuggestions')}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {POPULAR_TAGS.filter(tag => !tags.includes(tag)).slice(0, 10).map(tag => (
                        <button key={tag} onClick={() => addTag(tag)}
                          style={{ padding: '5px 14px', borderRadius: 20, background: 'transparent', border: '0.5px solid var(--border)', color: 'var(--tx3)', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300, transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--tx3)' }}
                        >+ {tag}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Bouton Sauvegarder (fixe en bas) ── */}
          <div className="above-tabbar" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, var(--bg) 30%)', padding: '40px 24px 24px', zIndex: 50 }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              {saveError && (
                <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 10, background: '#ef444410', border: '0.5px solid #ef444420', fontSize: 12, color: '#ef4444', fontWeight: 300 }}>{saveError}</div>
              )}
              <button onClick={handleSave} disabled={saving}
                className={saved ? 'btn-success btn-block btn-lg' : 'btn-primary btn-block btn-lg'}
              >
                {saving ? t('artisanProfile.saving') : saved ? t('artisanProfile.savedMsg') : isNewProfile ? t('artisanProfile.createBtn') : t('artisanProfile.saveBtn')}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
