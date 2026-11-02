'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArtisanAvatar } from '@/components/ReviewPhotos'
import { PortfolioManager } from '@/components/Portfolio'
import { effectivePlan } from '@/lib/subscription'
import { CategoryIcon } from '@/components/icons'
import { Wrench, User, Tag, Hammer, Clock, ClipboardList, FileText, Handshake, Lock, X, Sparkles, Search, MapPin } from 'lucide-react'
import { useLang } from '@/lib/LangContext'
import { fetchMyPhone, phoneTaken } from '@/lib/phones'
import { logError } from '@/lib/logError'
import { withTimeout } from '@/components/OtpInput'

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
  { id: 'demenagement', icon: '◈',  color: '#1E6FD6' },
  { id: 'jardinage',    icon: '❧',  color: '#22c55e' },
  { id: 'peinture',     icon: '◉',  color: '#ef4444' },
  { id: 'serrurerie',   icon: '⌘',  color: '#f97316' },
  { id: 'informatique', icon: '⬡',  color: '#175CC4' },
  { id: 'coiffure',     icon: '✂',  color: '#ec4899' },
]

const PRICE_TYPE_IDS = ['hour', 'service', 'quote', 'negotiable'] as const

const POPULAR_TAGS = [
  'piscine', 'climatisation', 'chauffe-eau solaire', 'domotique', 'panneau solaire',
  'carrelage', 'parquet', 'faux plafond', 'isolation', 'menuiserie',
  'livreur', 'livraison', 'coursier', 'vitrier', 'tapissier',
]

// ── Page ──

// Styles partagés de la page (tokens « Chaux & Zellige »)
const LBL: React.CSSProperties = { fontSize: 12, color: 'var(--tx2)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }
const HINT: React.CSSProperties = { fontSize: 13, color: 'var(--tx2)', marginTop: 6, lineHeight: 1.5 }
const ERR_TXT: React.CSSProperties = { fontSize: 13, color: 'var(--danger)', marginTop: 6, fontWeight: 600 }
const COUNTER: React.CSSProperties = { fontSize: 12, color: 'var(--tx2)', textAlign: 'end', marginTop: 4 }
const RANGE_LEGEND: React.CSSProperties = { fontSize: 12, color: 'var(--tx2)' }
const NOTE_BOX: React.CSSProperties = { padding: '10px 14px', borderRadius: 'var(--r-field)', background: 'var(--bg)', border: '1px solid var(--border)' }
const ICON: React.CSSProperties = { verticalAlign: 'middle', marginInlineEnd: 5 }

export default function ArtisanProfileConfig() {
  const router = useRouter()
  const { t, isAr } = useLang()
  const [user, setUser] = useState<any>(null)
  const [plan, setPlan] = useState<'free' | 'basic' | 'premium'>('free')
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
  // Une ligne `artisans` existe déjà : le bouton dit « Enregistrer », jamais « Créer ».
  const [hasRow, setHasRow] = useState(false)
  const [loadError, setLoadError] = useState(false)

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
    } catch (e) { logError('profil.geocode', e) }
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
    setLoadError(false); setLoading(true)
    try {
      await loadProfileInner()
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  const loadProfileInner = async () => {
    const { data: { user: u } } = await withTimeout(supabase.auth.getUser())
    if (!u) { router.push('/auth/login'); return }
    setUser(u)

    const [{ data: prof }, { data: art }] = await withTimeout(Promise.all([
      supabase.from('profiles').select('*').eq('id', u.id).maybeSingle(),
      supabase.from('artisans').select('*').eq('id', u.id).maybeSingle(),
    ]))

    if (prof) {
      setFullName(prof.full_name || '')
      setPhone(await fetchMyPhone(u.id, prof.phone))
      setAvatarUrl(prof.avatar_url || null)
    }

    setHasRow(!!art)
    if (art) {
      setPlan(effectivePlan(art) as 'free' | 'basic' | 'premium')
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
      } else if (art.category && (art.hourly_rate > 0 || art.bio)) {
        // Ligne créée à l'inscription (catégorie fictive, tarif 0) : pas de métier prérempli.
        setServices([{
          category: art.category,
          description: art.bio || '',
          price_type: 'hour',
          price: art.hourly_rate || 3000,
        }])
      }

      if (!art.services && !(art.hourly_rate > 0)) setIsNewProfile(true)
    } else {
      setIsNewProfile(true)
    }
  }

  const checkPhone = async (phoneVal: string) => {
    if (!phoneVal || phoneVal.length < 9) return
    setPhoneError('')
    if (await phoneTaken(phoneVal, user?.id)) {
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

    if (!fullName.trim()) {
      setSaveError(t('artisanProfile.errName'))
      setActiveSection('info')
      return
    }
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

    if (!artisanAddress.trim() && !(artisanLat && artisanLng)) {
      setSaveError(t('artisanProfile.errZone'))
      setActiveSection('info')
      return
    }

    let saveLat = artisanLat
    let saveLng = artisanLng
    if ((!saveLat || !saveLng) && artisanAddress) {
      const geo = await geocodeAddress(artisanAddress)
      if (geo) { saveLat = geo.lat; saveLng = geo.lng }
    }

    setSaving(true)
    try {
    const { error: profErr } = await withTimeout(supabase.from('profiles').update({
      full_name: fullName.trim(),
      phone: phone,
      avatar_url: avatarUrl,
    }).eq('id', user.id))

    if (profErr) { setSaveError(t('artisanProfile.errTimeout')); setSaving(false); return }

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
      intervention_radius_km: radiusKm,
      location_city: city,
    }

    if (saveLat && saveLng) {
      artisanData.lat = saveLat
      artisanData.lng = saveLng
    }

    const { error: artErr } = await withTimeout(supabase.from('artisans').upsert({
      ...artisanData,
      services: services.length > 0 ? services : null,
    }, { onConflict: 'id' }))

    if (artErr) {
      const { error: artErr2 } = await withTimeout(supabase.from('artisans').upsert(artisanData, { onConflict: 'id' }))
      if (artErr2) { setSaveError(t('artisanProfile.errTimeout')); setSaving(false); return }
    }

    setSaving(false)
    setSaved(true)
    setHasRow(true)
    setIsNewProfile(false)
    if (!saveLat || !saveLng) {
      setSaveError(t('artisanProfile.warnNoGeo'))
    }
    setTimeout(() => setSaved(false), 3000)
    } catch {
      // Réseau coupé / délai dépassé : jamais de bouton bloqué sur « Sauvegarde... »
      setSaveError(t('artisanProfile.errTimeout'))
      setSaving(false)
    }
  }

  // Jauge : 4 points obligatoires pour être listé, 3 facultatifs pour mieux convertir
  const reqItems = [
    { k: 'reqService', ok: services.length > 0 || tags.length > 0, tab: 'services' as const },
    { k: 'reqName',    ok: !!fullName.trim(), tab: 'info' as const },
    { k: 'reqPhone',   ok: phone.replace(/\D/g, '').length >= 8, tab: 'info' as const },
    { k: 'reqZone',    ok: !!artisanAddress.trim() || !!(artisanLat && artisanLng), tab: 'info' as const },
  ]
  const optItems = [
    { k: 'optPhoto', ok: !!avatarUrl, tab: 'info' as const },
    { k: 'optBio',   ok: bio.trim().length > 10, tab: 'info' as const },
    { k: 'optPortfolio', ok: tags.length > 0, tab: 'tags' as const },
  ]
  const gaugePct = Math.round(([...reqItems, ...optItems].filter(i => i.ok).length / (reqItems.length + optItems.length)) * 100)
  const reqDone = reqItems.every(i => i.ok)

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
        <div role="status" aria-label={t('common.loading')} className="loader-ring" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
        <p role="alert" style={{ fontSize: 14, color: 'var(--danger)', fontWeight: 600, maxWidth: 360, lineHeight: 1.5 }}>{t('artisanProfile.errLoad')}</p>
        <button onClick={loadProfile} className="btn-primary btn-lg">{t('artisanProfile.retry')}</button>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes profFadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        .prof-scope input[type=range] { accent-color: var(--accent); cursor: pointer; min-height: 32px; }
        .prof-scope :is(a,button,[role=tab]):focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        .prof-tag { display:inline-flex; align-items:center; gap:4px; padding:4px 4px 4px 12px; border-radius:var(--r-chip);
          background: color-mix(in srgb, var(--accent) 12%, var(--bg2)); border:1px solid color-mix(in srgb, var(--accent) 35%, transparent);
          color: var(--tx); font-size:13px; font-weight:600; }
        [dir=rtl] .prof-tag { padding:4px 12px 4px 4px; }
        .prof-tag-x { display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:7px;
          background:transparent; border:none; cursor:pointer; color: var(--tx2); transition: background .15s, color .15s; }
        .prof-tag-x:hover { background: color-mix(in srgb, var(--danger) 12%, transparent); color: var(--danger); }
        .prof-sugg { display:flex; align-items:center; gap:5px; min-height:36px; padding:6px 13px; border-radius:var(--r-chip);
          background: var(--bg2); border:1px solid var(--border2); color: var(--tx2); font-size:13px; cursor:pointer;
          transition: background .15s, border-color .15s, color .15s; }
        .prof-sugg:hover { background: color-mix(in srgb, var(--accent) 10%, var(--bg2)); border-color: var(--accent); color: var(--accent); }
        .prof-cat { transition: border-color .15s, background .15s; }
        .prof-cat:hover { border-color: var(--accent) !important; background: color-mix(in srgb, var(--accent) 8%, var(--bg2)) !important; }
      `}</style>

      <div className="prof-scope" style={{ minHeight: '100vh', paddingTop: 64, direction: isAr ? 'rtl' : 'ltr' }}>
        <div className="page-x" style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 280px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
            <div style={{ minWidth: 0 }}>
              <div className="section-label">
                {isNewProfile ? t('artisanProfile.newConfig') : t('artisanProfile.editProfile')}
              </div>
              <h1 style={{ fontSize: 'clamp(24px, 6vw, 30px)', lineHeight: 1.15, fontWeight: 800, color: 'var(--tx)' }}>{t('artisanProfile.pageTitle')}</h1>
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

          {/* Jauge de complétion */}
          <div className="card" style={{ padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{t('artisanProfile.gaugeDone')} <span className="num">{gaugePct}%</span></span>
            </div>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={gaugePct} aria-label={t('artisanProfile.gaugeDone')} style={{ height: 6, borderRadius: 3, background: 'var(--border2)', overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ height: '100%', width: `${gaugePct}%`, background: reqDone ? 'var(--success)' : 'var(--accent)', transition: 'width .3s ease' }} />
            </div>
            {!reqDone && <p style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.5, marginBottom: 10 }}>{t('artisanProfile.gaugeTitle')}</p>}
            {[{ label: t('artisanProfile.reqLabel'), items: reqItems }, { label: t('artisanProfile.optLabel'), items: optItems }].map(g => (
              <div key={g.label} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx2)', minWidth: 72 }}>{g.label}</span>
                {g.items.map(i => (
                  <button key={i.k} type="button" onClick={() => setActiveSection(i.tab)} className={i.ok ? 'chip chip-active' : 'chip'} style={{ minHeight: 36, fontSize: 12.5 }}>
                    <span aria-hidden>{i.ok ? '✓ ' : '○ '}</span>{t(`artisanProfile.${i.k}`)}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div role="tablist" className="no-scrollbar" style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r-btn)', padding: 4, overflowX: 'auto' }}>
            {([
              { id: 'services'  as const, label: t('artisanProfile.tabServices'),  Icon: Wrench,  badge: services.length },
              { id: 'info'      as const, label: t('artisanProfile.tabInfo'),       Icon: User },
              { id: 'tags'      as const, label: t('artisanProfile.tabTags'),       Icon: Tag,    badge: tags.length },
              { id: 'portfolio' as const, label: t('artisanProfile.tabPortfolio'),  Icon: Hammer },
            ]).map(tab => (
              <button key={tab.id} role="tab" aria-selected={activeSection === tab.id} onClick={() => setActiveSection(tab.id)}
                style={{
                  flex: '1 0 auto', minHeight: 44, padding: '10px 14px', borderRadius: 8, border: 'none', whiteSpace: 'nowrap',
                  background: activeSection === tab.id ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                  color: activeSection === tab.id ? 'var(--accent)' : 'var(--tx2)',
                  fontSize: 14, fontWeight: activeSection === tab.id ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  transition: 'background .2s, color .2s',
                }}
              >
                <tab.Icon size={16} aria-hidden/> {tab.label}
                {'badge' in tab && (tab as any).badge > 0 && (
                  <span className="num" style={{ padding: '1px 7px', borderRadius: 'var(--r-pill)', background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700 }}>{(tab as any).badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* ═══ SECTION : RÉALISATIONS (PORTFOLIO) ═══ */}
          {activeSection === 'portfolio' && user && (
            <PortfolioManager artisanId={user.id} plan={plan} />
          )}

          {/* ═══ SECTION : MES MÉTIERS ═══ */}
          {activeSection === 'services' && (
            <div style={{ animation: 'profFadeIn 0.3s ease' }}>

              {services.map((service, i) => {
                const cat = getCat(service.category)
                const catLabel = t(`categories.${service.category}`)
                const PtIcon = PRICE_TYPE_ICONS[service.price_type] || Clock
                return (
                  <div key={i} className="card" style={{ padding: 'clamp(18px, 5vw, 24px)', marginBottom: 16 }}>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div aria-hidden style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 10, background: `color-mix(in srgb, ${cat?.color || 'var(--accent)'} 14%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CategoryIcon id={service.category} size={18} color={cat?.color || 'var(--accent)'}/></div>
                        <div style={{ minWidth: 0 }}>
                          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--tx)' }}>{catLabel}</h2>
                          <div style={{ fontSize: 12.5, color: 'var(--tx2)' }}>{t('artisanProfile.serviceNum')} {i + 1}{i === 0 ? ` ${t('artisanProfile.servicePrimary')}` : ''}</div>
                        </div>
                      </div>
                      <button onClick={() => removeService(i)}
                        style={{ flexShrink: 0, minHeight: 40, padding: '6px 14px', borderRadius: 'var(--r-btn)', background: 'color-mix(in srgb, var(--danger) 9%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', color: 'var(--danger)', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
                        {t('artisanProfile.remove')}
                      </button>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <label htmlFor={`svc-desc-${i}`} style={LBL}>
                        {t('artisanProfile.descSection')} {catLabel.toUpperCase()}
                      </label>
                      <textarea
                        id={`svc-desc-${i}`}
                        value={service.description}
                        onChange={e => updateService(i, { description: e.target.value })}
                        placeholder={`${t('artisanProfile.bioPh')} ${catLabel.toLowerCase()}...`}
                        rows={3}
                        maxLength={300}
                        className="field"
                        style={{ resize: 'none' }}
                      />
                      <div className="num" style={COUNTER}>{service.description.length}/300</div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <div id={`svc-pt-${i}`} style={{ ...LBL, marginBottom: 10 }}>
                        {t('artisanProfile.priceType')}
                      </div>
                      <div role="radiogroup" aria-labelledby={`svc-pt-${i}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                        {PRICE_TYPE_IDS.map(ptId => {
                          const PIcon = PRICE_TYPE_ICONS[ptId]
                          return (
                            <button key={ptId} type="button" role="radio" aria-checked={service.price_type === ptId} onClick={() => updateService(i, { price_type: ptId as any })}
                              style={{
                                minHeight: 44, padding: '10px 12px', borderRadius: 'var(--r-field)', textAlign: 'start',
                                border: `1.5px solid ${service.price_type === ptId ? 'var(--accent)' : 'var(--border)'}`,
                                background: service.price_type === ptId ? 'color-mix(in srgb, var(--accent) 9%, var(--bg2))' : 'var(--bg2)',
                                color: service.price_type === ptId ? 'var(--accent)' : 'var(--tx2)',
                                fontSize: 13, fontWeight: service.price_type === ptId ? 700 : 500,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 8, transition: 'border-color .15s, background .15s',
                              }}
                            >
                              <PIcon size={16} aria-hidden style={{ flexShrink: 0 }}/> {priceTypeLabel(ptId)}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {(service.price_type === 'hour' || service.price_type === 'service') && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                          <label htmlFor={`svc-price-${i}`} style={{ ...LBL, marginBottom: 0 }}>
                            {service.price_type === 'hour' ? t('artisanProfile.tariffHour') : t('artisanProfile.tariffService')}
                          </label>
                          <div className="num" style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>
                            {service.price.toLocaleString('fr-DZ')} <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 400 }}>{priceTypeSuffix(service.price_type)}</span>
                          </div>
                        </div>
                        <input id={`svc-price-${i}`} type="range" min={500} max={30000} step={500}
                          value={service.price}
                          onChange={e => updateService(i, { price: Number(e.target.value) })}
                          style={{ width: '100%' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                          <span style={RANGE_LEGEND}>500 {t('common.da')}</span>
                          <span style={RANGE_LEGEND}>30 000 {t('common.da')}</span>
                        </div>
                      </div>
                    )}

                    {service.price_type === 'quote' && (
                      <div style={NOTE_BOX}>
                        <span style={{ fontSize: 13, color: 'var(--tx2)' }}><FileText size={14} aria-hidden style={ICON}/>{t('artisanProfile.quoteNote')}</span>
                      </div>
                    )}
                    {service.price_type === 'negotiable' && (
                      <div style={NOTE_BOX}>
                        <span style={{ fontSize: 13, color: 'var(--tx2)' }}><Handshake size={14} aria-hidden style={ICON}/>{t('artisanProfile.negoNote')}</span>
                      </div>
                    )}
                  </div>
                )
              })}

              {!addingService ? (
                <button onClick={() => setAddingService(true)}
                  style={{
                    width: '100%', minHeight: 52, padding: '14px 16px', borderRadius: 'var(--r-card)',
                    background: 'color-mix(in srgb, var(--accent) 5%, transparent)', border: '1.5px dashed color-mix(in srgb, var(--accent) 55%, transparent)',
                    color: 'var(--accent)', fontSize: 15, fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  {t('artisanProfile.addService')} {services.length === 0 && t('artisanProfile.addRequired')}
                </button>
              ) : (
                <div className="card" style={{ borderColor: 'color-mix(in srgb, var(--accent) 40%, var(--border))', padding: 'clamp(16px, 5vw, 24px)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)' }}>{t('artisanProfile.pickService')}</h2>
                    <button onClick={() => setAddingService(false)} aria-label="Fermer" style={{ width: 44, height: 44, background: 'transparent', border: 'none', borderRadius: 'var(--r-btn)', color: 'var(--tx2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginInlineEnd: -10 }}><X size={20}/></button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
                    {CATEGORIES.filter(c => !services.find(s => s.category === c.id)).map(cat => (
                      <button key={cat.id} onClick={() => addService(cat.id)} className="prof-cat"
                        style={{
                          minHeight: 76, padding: '12px 8px', borderRadius: 'var(--r-field)', border: '1px solid var(--border)',
                          background: 'var(--bg2)', cursor: 'pointer', display: 'flex',
                          flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                      >
                        <CategoryIcon id={cat.id} size={22} color={cat.color}/>
                        <span style={{ fontSize: 12.5, color: 'var(--tx)', fontWeight: 500, textAlign: 'center' }}>{t(`categories.${cat.id}`)}</span>
                      </button>
                    ))}
                  </div>
                  {services.length === 0 && (
                    <p style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 12, textAlign: 'center' }}>
                      {t('artisanProfile.multipleHint')}
                    </p>
                  )}
                </div>
              )}

              {services.length === 0 && (
                <p role="alert" style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600, marginTop: 10, textAlign: 'center' }}>
                  {t('artisanProfile.requireHint')}
                </p>
              )}
            </div>
          )}

          {/* ═══ SECTION : INFORMATIONS ═══ */}
          {activeSection === 'info' && (
            <div style={{ animation: 'profFadeIn 0.3s ease' }}>
              <div className="card" style={{ padding: 'clamp(18px, 5vw, 24px)' }}>

                {/* Nom */}
                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="pf-name" style={LBL}>{t('artisanProfile.fullName')}</label>
                  <input id="pf-name" type="text" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} className="field"/>
                </div>

                {/* Téléphone */}
                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="pf-phone" style={LBL}>
                    {t('artisanProfile.phoneNum')} <span aria-hidden style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div aria-hidden className="num" style={{ display: 'flex', alignItems: 'center', padding: '0 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r-field)', color: 'var(--tx2)', fontSize: 14, flexShrink: 0 }} dir="ltr">
                      +213
                    </div>
                    <input id="pf-phone" type="tel" inputMode="tel" autoComplete="tel-national" required value={phone} placeholder="0555 12 34 56"
                      aria-invalid={!!phoneError} aria-describedby="pf-phone-hint"
                      onChange={e => { setPhone(e.target.value); setPhoneError('') }}
                      onBlur={() => checkPhone(phone)}
                      className="field" style={{ flex: 1, minWidth: 0, borderColor: phoneError ? 'var(--danger)' : undefined }}/>
                  </div>
                  {phoneError && <p role="alert" style={ERR_TXT}>{phoneError}</p>}
                  <p id="pf-phone-hint" style={HINT}>
                    <Lock size={13} aria-hidden style={ICON}/>{t('artisanProfile.phoneHint')}
                  </p>
                </div>

                {/* Bio */}
                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="pf-bio" style={LBL}>{t('artisanProfile.bioLabel')}</label>
                  <textarea id="pf-bio" value={bio} onChange={e => setBio(e.target.value)}
                    placeholder={t('artisanProfile.bioPh')}
                    rows={4} maxLength={500}
                    className="field" style={{ resize: 'none' }}/>
                  <div className="num" style={COUNTER}>{bio.length}/500</div>
                </div>

                {/* Expérience */}
                <div style={{ marginBottom: 20 }}>
                  <div id="pf-exp" style={{ ...LBL, marginBottom: 10 }}>{t('artisanProfile.expLabel')}</div>
                  <div role="radiogroup" aria-labelledby="pf-exp" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[1, 2, 3, 5, 7, 10, 15, 20].map(y => (
                      <button key={y} type="button" role="radio" aria-checked={experience === y} onClick={() => setExperience(y)}
                        className={experience === y ? 'chip chip-active' : 'chip'} style={{ minHeight: 44 }}>
                        {y} {y === 1 ? t('common.years').replace('s','') : t('common.years')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Adresse */}
                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="pf-addr" style={LBL}>
                    {t('artisanProfile.addrLabel')} <span aria-hidden style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <p id="pf-addr-hint" style={{ ...HINT, marginTop: 0, marginBottom: 10 }}>
                    {t('artisanProfile.addrHint')}
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input
                      id="pf-addr" aria-describedby="pf-addr-hint" autoComplete="street-address"
                      type="text"
                      value={artisanAddress}
                      onChange={e => { setArtisanAddress(e.target.value); setAddressError('') }}
                      onBlur={() => geocodeAddress(artisanAddress)}
                      placeholder="Ex: 12 Rue Didouche Mourad, Alger"
                      className="field" style={{ flex: '1 1 220px', minWidth: 0, borderColor: addressError ? 'var(--danger)' : undefined }}
                    />
                    <button onClick={detectPosition} disabled={detectingAddr} aria-busy={detectingAddr}
                      className="btn-ghost" style={{ minHeight: 46, padding: '0 16px', fontSize: 13, flexShrink: 0 }}
                    >
                      <MapPin size={16} aria-hidden/> {detectingAddr ? '…' : t('artisanProfile.myPosition')}
                    </button>
                  </div>
                  {addressError && <p role="alert" style={ERR_TXT}>{addressError}</p>}
                  {artisanLat && artisanLng && (
                    <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <div aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)' }}/>
                      <span style={{ fontSize: 13, color: 'color-mix(in srgb, var(--success) 72%, var(--tx))', fontWeight: 600 }}>{t('artisanProfile.posRecorded')}</span>
                    </div>
                  )}
                </div>

                {/* Rayon d'intervention */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <label htmlFor="pf-radius" style={{ ...LBL, marginBottom: 0 }}>{t('artisanProfile.radiusLabel')}</label>
                    <span className="num" style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{radiusKm} {t('common.km')}</span>
                  </div>
                  <input id="pf-radius" type="range" min={5} max={100} step={5}
                    value={radiusKm}
                    onChange={e => setRadiusKm(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={RANGE_LEGEND}>5 {t('common.km')}</span>
                    <span style={RANGE_LEGEND}>100 {t('common.km')}</span>
                  </div>
                </div>

                {/* Photo de profil */}
                <div>
                  <div style={{ ...LBL, marginBottom: 12 }}>{t('artisanProfile.photoLabel')}</div>
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
                      <p style={{ fontSize: 14, color: 'var(--tx)', marginBottom: 4 }}>{t('artisanProfile.photoHint')}</p>
                      <p style={{ fontSize: 12.5, color: 'var(--tx2)' }}>{t('artisanProfile.photoFormat')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ SECTION : MOTS-CLÉS ═══ */}
          {activeSection === 'tags' && (
            <div style={{ animation: 'profFadeIn 0.3s ease' }}>
              <div className="card" style={{ padding: 'clamp(18px, 5vw, 24px)' }}>

                <div style={{ marginBottom: 16 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--tx)', marginBottom: 6 }}>{t('artisanProfile.tagTitle')}</h2>
                  <p style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.6 }}>
                    {t('artisanProfile.tagDesc')}
                    {services.length === 0 && <><br/><span style={{ color: 'var(--accent)', fontWeight: 600 }}>{t('artisanProfile.tagDescExtra')}</span></>}
                  </p>
                </div>

                {/* Tags actifs — pastilles « carreau » aux couleurs du thème (styles .prof-tag en tête de page) */}
                {tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                    {tags.map(tag => (
                      <div key={tag} className="prof-tag">
                        {tag}
                        <button className="prof-tag-x" onClick={() => removeTag(tag)} aria-label={`Retirer « ${tag} »`}><X size={14} strokeWidth={2.5}/></button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Champ de saisie */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  minHeight: 52, paddingTop: 6, paddingBottom: 6, paddingInlineStart: 14, paddingInlineEnd: 6, borderRadius: 'var(--r-field)',
                  background: 'var(--bg2)', border: '1px solid var(--border2)',
                  marginBottom: 16, transition: 'border-color 0.2s',
                }}
                  onFocusCapture={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
                >
                  <Search size={18} color="var(--tx2)" aria-hidden style={{ flexShrink: 0 }}/>
                  <input
                    aria-label={t('artisanProfile.tagTitle')}
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) } }}
                    placeholder={tags.length === 0 ? t('artisanProfile.tagPh1') : t('artisanProfile.tagPh2')}
                    style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', boxShadow: 'none', outline: 'none', color: 'var(--tx)', fontSize: 15 }}
                  />
                  {tagInput.trim() && (
                    <button onClick={() => addTag(tagInput)} className="btn-primary btn-sm" style={{ minHeight: 40, flexShrink: 0 }}>
                      {t('artisanProfile.tagAdd')}
                    </button>
                  )}
                </div>

                {/* Compteur */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 13, color: 'var(--tx2)' }}><span className="num">{tags.length}/15</span> {t('artisanProfile.tagCount')}</span>
                  <div aria-hidden style={{ display: 'flex', gap: 3 }}>
                    {Array.from({ length: 15 }).map((_, i) => (
                      <div key={i} style={{
                        width: i < tags.length ? 14 : 6, height: 6, borderRadius: 3,
                        background: i < tags.length ? 'var(--accent)' : 'var(--border2)',
                        transition: 'all 0.25s ease',
                      }}/>
                    ))}
                  </div>
                </div>

                {/* Suggestions */}
                {tags.length < 15 && (
                  <div style={{
                    padding: '16px', borderRadius: 'var(--r-field)',
                    background: 'color-mix(in srgb, var(--accent) 5%, var(--bg))',
                    border: '1px solid color-mix(in srgb, var(--accent) 15%, transparent)',
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={13} aria-hidden/> {t('artisanProfile.tagSuggestions')}
                    </div>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                      {POPULAR_TAGS.filter(tag => !tags.includes(tag)).slice(0, 10).map(tag => (
                        <button key={tag} onClick={() => addTag(tag)} className="prof-sugg">
                          <span aria-hidden style={{ color: 'var(--accent)', fontWeight: 800 }}>+</span> {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Bouton Sauvegarder (fixe en bas) ── */}
          <div className="above-tabbar" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, var(--bg) 30%)', padding: '32px 16px calc(16px + env(safe-area-inset-bottom))', zIndex: 50 }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              {saveError && (
                <div role="alert" style={{ padding: '10px 14px', borderRadius: 'var(--r-field)', marginBottom: 10, background: 'color-mix(in srgb, var(--danger) 10%, var(--bg2))', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', fontSize: 13, color: 'var(--danger)', fontWeight: 600, lineHeight: 1.5 }}>{saveError}</div>
              )}
              <button onClick={handleSave} disabled={saving} aria-live="polite"
                className={saved ? 'btn-success btn-block btn-lg' : 'btn-primary btn-block btn-lg'}
              >
                {saving ? t('artisanProfile.saving') : saved ? t('artisanProfile.savedMsg') : !hasRow ? t('artisanProfile.createBtn') : t('artisanProfile.saveBtn')}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
