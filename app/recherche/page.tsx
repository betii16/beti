'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AlgeriaCitySearch, ALGERIA_CITIES } from '@/components/AlgeriaSearch'
import { CategoryIcon, categoryColor, categoryInk, pressable } from '@/components/icons'
import { Search, SearchX, LayoutGrid, SlidersHorizontal, Check, Star, X, BadgeCheck } from 'lucide-react'
import PremiumBadge from '@/components/PremiumBadge'
import { fetchPlans, isListed } from '@/lib/subscription'
import { useLang } from '@/lib/LangContext'
import { artisanAvatar } from '@/lib/avatar'

const CATEGORY_IDS = ['', 'plomberie', 'electricite', 'menage', 'demenagement', 'jardinage', 'peinture', 'serrurerie', 'informatique', 'coiffure']

// Libellés propres à la page (FR / AR) — la page était 100 % en français codé en dur.
const L = {
  filters:      { fr: 'Filtres',                    ar: 'الفلاتر' },
  close:        { fr: 'Fermer',                     ar: 'إغلاق' },
  kicker:       { fr: 'Recherche',                  ar: 'البحث' },
  title1:       { fr: 'Trouvez votre',              ar: 'اعثر على' },
  title2:       { fr: 'artisan idéal.',             ar: 'الحرفي المثالي.' },
  keywords:     { fr: 'Mots-clés',                  ar: 'كلمات مفتاحية' },
  kwPh:         { fr: 'Ex : hafaf, soudure…',       ar: 'مثال: حفاف، تلحيم…' },
  add:          { fr: 'Ajouter',                    ar: 'إضافة' },
  clearAll:     { fr: 'Tout effacer',               ar: 'مسح الكل' },
  kwHint:       { fr: 'Tapez un mot puis « Ajouter » (ou Entrée).', ar: 'اكتب كلمة ثم «إضافة» (أو Enter).' },
  remove:       { fr: 'Retirer',                    ar: 'إزالة' },
  city:         { fr: 'Ville',                      ar: 'المدينة' },
  cityPh:       { fr: 'Votre ville…',               ar: 'مدينتك…' },
  category:     { fr: 'Catégorie',                  ar: 'الفئة' },
  all:          { fr: 'Tous',                       ar: 'الكل' },
  radius:       { fr: 'Rayon',                      ar: 'النطاق' },
  minRating:    { fr: 'Note minimum',               ar: 'أدنى تقييم' },
  maxPrice:     { fr: 'Prix max',                   ar: 'السعر الأقصى' },
  unlimited:    { fr: 'Illimité',                   ar: 'بلا حد' },
  daH:          { fr: 'DA/h',                       ar: 'دج/سا' },
  availableNow: { fr: 'Disponible maintenant',      ar: 'متاح الآن' },
  search:       { fr: 'Rechercher',                 ar: 'ابحث' },
  searching:    { fr: 'Recherche…',                 ar: 'جارٍ البحث…' },
  searchingLong:{ fr: 'Recherche en cours…',        ar: 'جارٍ البحث…' },
  found1:       { fr: 'artisan trouvé',             ar: 'حرفي' },
  foundN:       { fr: 'artisans trouvés',           ar: 'حرفيين' },
  sortDistance: { fr: 'Distance',                   ar: 'المسافة' },
  sortRating:   { fr: 'Mieux notés',                ar: 'الأعلى تقييماً' },
  sortPriceAsc: { fr: 'Prix ↑',                     ar: 'السعر ↑' },
  sortPriceDesc:{ fr: 'Prix ↓',                     ar: 'السعر ↓' },
  idleTitle:    { fr: 'Lancez une recherche',       ar: 'ابدأ البحث' },
  idleSubDesk:  { fr: 'Réglez les filtres puis cliquez sur « Rechercher ».', ar: 'اضبط الفلاتر ثم اضغط «ابحث».' },
  idleSubMob:   { fr: 'Ouvrez les filtres pour choisir un métier, une ville, un budget.', ar: 'افتح الفلاتر لاختيار مهنة ومدينة وميزانية.' },
  emptyTitle:   { fr: 'Aucun artisan trouvé',       ar: 'لم يتم العثور على أي حرفي' },
  emptySub:     { fr: "Élargissez le rayon ou assouplissez les filtres.", ar: 'وسّع النطاق أو خفف الفلاتر.' },
  widen:        { fr: 'Élargir à 100 km',           ar: 'توسيع إلى 100 كم' },
  certified:    { fr: 'Certifié',                   ar: 'موثّق' },
  newA:         { fr: 'Nouveau',                    ar: 'جديد' },
  missions:     { fr: 'missions',                   ar: 'مهمة' },
  available:    { fr: 'Disponible',                 ar: 'متاح' },
  busy:         { fr: 'Occupé',                     ar: 'مشغول' },
} as const

type Artisan = {
  artisan_id: string; full_name: string; avatar_url: string | null
  category: string; rating_avg: number; rating_count: number
  hourly_rate: number; distance_km: number; is_available: boolean
  total_missions: number; bio: string | null
  plan?: 'free' | 'basic' | 'premium'
}

function Stars({ rating, size = 11 }: { rating: number; size?: number }) {
  return (
    <div role="img" aria-label={`${(rating || 0).toFixed(1)} / 5`} style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} aria-hidden width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(rating) ? 'var(--star)' : 'var(--border2)'}>
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      ))}
    </div>
  )
}

export default function RecherchePage() {
  const router = useRouter()
  const { t, isAr, lang } = useLang()
  const tr = (k: keyof typeof L) => L[k][lang === 'ar' ? 'ar' : 'fr']
  const [artisans, setArtisans] = useState<Artisan[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false) // bottom-sheet mobile

  // Filtres
  const [category, setCategory] = useState('')
  const [userLocation, setUserLocation] = useState({ lat: 36.7538, lng: 3.0588 })
  const [radius, setRadius] = useState(50)
  const [minRating, setMinRating] = useState(0)
  const [maxPrice, setMaxPrice] = useState(15000)
  const [availableOnly, setAvailableOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'price_asc' | 'price_desc'>('distance')

  // Système mots-clés
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])

  const addKeyword = () => {
    const kw = keywordInput.trim()
    if (kw && !keywords.includes(kw)) {
      setKeywords(prev => [...prev, kw])
    }
    setKeywordInput('')
  }

  const removeKeyword = (kw: string) => {
    setKeywords(prev => prev.filter(k => k !== kw))
  }

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      )
    }
  }, [])

  // Sheet de filtres mobile : fermeture à Échap
  useEffect(() => {
    if (!filtersOpen) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setFiltersOpen(false) }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [filtersOpen])

  // Filtres actifs (≠ valeurs par défaut) → badge sur le déclencheur mobile
  const activeCount =
    (category ? 1 : 0) + keywords.length + (minRating > 0 ? 1 : 0) +
    (maxPrice < 15000 ? 1 : 0) + (availableOnly ? 1 : 0) + (radius !== 50 ? 1 : 0)

  const search = async () => {
    setFiltersOpen(false) // referme le sheet mobile au lancement
    setLoading(true)
    setSearched(true)
    try {
      const { data } = await supabase.rpc('get_nearby_artisans', {
        lat: userLocation.lat, lng: userLocation.lng, radius_km: radius,
        category_filter: category || null,
      })
      let results = (data || []) as Artisan[]
      if (minRating > 0) results = results.filter(a => (a.rating_avg || 0) >= minRating)
      if (maxPrice < 15000) results = results.filter(a => (a.hourly_rate || 0) <= maxPrice)
      if (availableOnly) results = results.filter(a => a.is_available)
      // Filtre mots-clés — chaque mot-clé doit matcher nom ou catégorie
      if (keywords.length > 0) {
        results = results.filter(a =>
          keywords.some(kw =>
            a.full_name?.toLowerCase().includes(kw.toLowerCase()) ||
            a.category?.toLowerCase().includes(kw.toLowerCase()) ||
            a.bio?.toLowerCase().includes(kw.toLowerCase())
          )
        )
      }
      // Plan effectif (lecture publique) → priorité d'affichage Premium
      const plans = await fetchPlans(results.map(a => a.artisan_id))
      results = results.map(a => ({ ...a, plan: plans[a.artisan_id] || 'free' }))
      // Paywall : hors période de lancement, on masque les non-abonnés.
      results = results.filter(a => isListed(a))
      results.sort((a, b) => {
        // Les Premium passent toujours devant, puis le critère de tri choisi.
        const pa = a.plan === 'premium' ? 0 : 1
        const pb = b.plan === 'premium' ? 0 : 1
        if (pa !== pb) return pa - pb
        if (sortBy === 'rating') return (b.rating_avg || 0) - (a.rating_avg || 0)
        if (sortBy === 'price_asc') return (a.hourly_rate || 0) - (b.hourly_rate || 0)
        if (sortBy === 'price_desc') return (b.hourly_rate || 0) - (a.hourly_rate || 0)
        return (a.distance_km || 0) - (b.distance_km || 0)
      })
      setArtisans(results)
    } catch {
      setArtisans([])
    }
    setLoading(false)
  }

  const catLabel = (id: string) => id ? t(`categories.${id}`) : tr('all')

  return (
    <>
      <style suppressHydrationWarning>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;margin:0;padding:0}
        .rq-opt{display:flex;align-items:center;gap:10px;width:100%;min-height:42px;padding:9px 14px;border-radius:var(--r-field);
          border:1px solid var(--border);background:var(--bg2);color:var(--tx2);font-size:14px;font-weight:500;cursor:pointer;text-align:start;
          transition:border-color .2s ease,background .2s ease,color .2s ease}
        .rq-opt:hover{border-color:var(--border2);color:var(--tx)}
        .rq-opt[aria-pressed="true"]{color:var(--tx);font-weight:700}
        .rq-seg{flex:1;min-height:40px;padding:8px 4px;border-radius:var(--r-chip);border:1px solid var(--border);background:var(--bg2);
          color:var(--tx2);font-size:13px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px}
        .rq-seg[aria-pressed="true"]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--bg2));color:var(--accent);font-weight:700}
        .rq-range{width:100%;accent-color:var(--accent-fill);cursor:pointer;height:28px}
        .rq-kw{display:inline-flex;align-items:center;gap:2px;padding:2px 2px 2px 12px;border-radius:var(--r-pill);font-size:13px;font-weight:600;
          color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent);border:1px solid color-mix(in srgb,var(--accent) 26%,transparent)}
        [dir="rtl"] .rq-kw,.rq-rtl .rq-kw{padding:2px 12px 2px 2px}
        .rq-kw button{width:28px;height:28px;border-radius:50%;border:none;background:transparent;color:inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
        .rq-kw button:hover{background:color-mix(in srgb,var(--accent) 14%,transparent)}
      `}</style>
      <div className={isAr ? 'rq-rtl' : undefined} style={{ minHeight: '100vh', paddingTop: 84, direction: isAr ? 'rtl' : 'ltr' }}>
        <div className="grid-collapse page-pad-m" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px 80px', display: 'grid', gridTemplateColumns: '300px 1fr', gap: 40, alignItems: 'start' }}>

          {/* ── PANNEAU FILTRES (sidebar desktop / bottom-sheet mobile) ── */}
          <div className={`filters-panel${filtersOpen ? ' open' : ''}`} style={{ position: 'sticky', top: 84 }} aria-label={tr('filters')}>
            {/* En-tête du sheet (mobile uniquement) */}
            <div className="mobile-only" style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx)' }}>{tr('filters')}</span>
              <button onClick={() => setFiltersOpen(false)} aria-label={tr('close')} className="icon-btn"><X size={20}/></button>
            </div>
            <div className="desktop-only">
              <div className="section-label">{tr('kicker')}</div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--tx)', marginBottom: 26, lineHeight: 1.15 }}>{tr('title1')}<br/>{tr('title2')}</h1>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

              {/* Mots-clés */}
              <div>
                <label htmlFor="rq-kw" className="field-label">{tr('keywords')}</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <input
                    id="rq-kw"
                    type="text"
                    placeholder={tr('kwPh')}
                    value={keywordInput}
                    onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addKeyword()}
                    className="field" style={{ flex: 1, minWidth: 0 }}
                  />
                  <button
                    onClick={addKeyword}
                    disabled={!keywordInput.trim()}
                    className="btn-soft"
                    style={{ padding: '0 14px' }}
                  >+ {tr('add')}</button>
                </div>
                {/* Tags ajoutés */}
                {keywords.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    {keywords.map(kw => (
                      <span key={kw} className="rq-kw">
                        {kw}
                        <button onClick={() => removeKeyword(kw)} aria-label={`${tr('remove')} ${kw}`}><X size={13}/></button>
                      </span>
                    ))}
                    <button onClick={() => setKeywords([])} style={{ padding: '6px 8px', background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{tr('clearAll')}</button>
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: 'var(--tx3)' }}>{tr('kwHint')}</div>
                )}
              </div>

              {/* Ville */}
              <div>
                <span className="field-label">{tr('city')}</span>
                <AlgeriaCitySearch
                  defaultCity={ALGERIA_CITIES.find(c => c.id === 'alger-centre')}
                  onSelect={city => setUserLocation({ lat: city.lat, lng: city.lng })}
                  placeholder={tr('cityPh')}
                />
              </div>

              {/* Catégorie */}
              <div role="group" aria-label={tr('category')}>
                <span className="field-label">{tr('category')}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {CATEGORY_IDS.map(id => {
                    const on = category === id
                    const c = id ? categoryColor(id) : 'var(--accent)'
                    return (
                      <button key={id || 'all'} onClick={() => setCategory(id)} aria-pressed={on} className="rq-opt"
                        style={on ? { borderColor: c, background: `color-mix(in srgb, ${c} 9%, var(--bg2))` } : undefined}>
                        <span aria-hidden style={{ display: 'inline-flex', color: id ? c : 'var(--tx2)' }}>{id ? <CategoryIcon id={id} size={16} color={c}/> : <LayoutGrid size={16}/>}</span>
                        <span style={{ color: on && id ? categoryInk(id) : undefined }}>{catLabel(id)}</span>
                        {on && <Check size={15} strokeWidth={2.5} color={id ? c : 'var(--accent)'} style={{ marginInlineStart: 'auto', flexShrink: 0 }}/>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Rayon */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label htmlFor="rq-radius" className="field-label">{tr('radius')}</label>
                  <span className="num" style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 600 }}>{radius} km</span>
                </div>
                <input id="rq-radius" type="range" min={5} max={100} step={5} value={radius} onChange={e => setRadius(Number(e.target.value))} className="rq-range"/>
              </div>

              {/* Note minimum */}
              <div role="group" aria-label={tr('minRating')}>
                <span className="field-label">{tr('minRating')}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[0, 3, 4, 4.5].map(r => (
                    <button key={r} onClick={() => setMinRating(r)} aria-pressed={minRating === r} className="rq-seg">
                      {r === 0 ? tr('all') : <>{r}+ <Star size={11} fill="var(--star)" color="var(--star)" strokeWidth={0}/></>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prix max */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label htmlFor="rq-price" className="field-label">{tr('maxPrice')}</label>
                  <span className="num" style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 600 }}>{maxPrice === 15000 ? tr('unlimited') : `${maxPrice.toLocaleString('fr-DZ')} ${tr('daH')}`}</span>
                </div>
                <input id="rq-price" type="range" min={500} max={15000} step={500} value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} className="rq-range"/>
              </div>

              {/* Disponible maintenant — vraie case à cocher (rôle switch) */}
              <button type="button" role="switch" aria-checked={availableOnly} onClick={() => setAvailableOnly(!availableOnly)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', minHeight: 48, borderRadius: 'var(--r-field)', border: `1px solid ${availableOnly ? 'var(--success)' : 'var(--border)'}`, background: availableOnly ? 'color-mix(in srgb, var(--success) 9%, var(--bg2))' : 'var(--bg2)', cursor: 'pointer', textAlign: 'start', width: '100%' }}
              >
                <span aria-hidden style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${availableOnly ? 'var(--success)' : 'var(--border2)'}`, background: availableOnly ? 'var(--success)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                  {availableOnly && <Check size={13} color="#fff" strokeWidth={3}/>}
                </span>
                <span style={{ fontSize: 14, color: availableOnly ? 'var(--success)' : 'var(--tx2)', fontWeight: availableOnly ? 700 : 500 }}>{tr('availableNow')}</span>
              </button>

              {/* Bouton rechercher */}
              <button onClick={search} disabled={loading} className="btn-primary btn-block btn-lg">
                {loading ? tr('searching') : <><Search size={16}/>{tr('search')}</>}
              </button>
            </div>
          </div>

          {/* ── RÉSULTATS ── */}
          <div aria-live="polite">
            {/* Déclencheur du sheet de filtres (mobile) */}
            <button onClick={() => setFiltersOpen(true)} className="filters-trigger press" aria-expanded={filtersOpen} style={{
              width: '100%', alignItems: 'center', justifyContent: 'space-between',
              padding: '13px 16px', minHeight: 50, marginBottom: 16, borderRadius: 'var(--r-card)',
              background: 'var(--bg2)', border: '1px solid var(--border)', cursor: 'pointer', boxShadow: 'var(--card-shadow)',
              color: 'var(--tx)', fontSize: 15, fontWeight: 700,
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><SlidersHorizontal size={17} color="var(--accent)"/>{tr('filters')}</span>
              {activeCount > 0 && (
                <span style={{ minWidth: 22, height: 22, padding: '0 7px', borderRadius: 11, background: 'var(--accent-fill)', color: 'var(--on-accent)', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{activeCount}</span>
              )}
            </button>
            {searched && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ fontSize: 15, color: 'var(--tx2)' }}>
                  {loading ? tr('searchingLong') : <><strong className="num" style={{ color: 'var(--tx)', fontWeight: 700 }}>{artisans.length}</strong> {artisans.length === 1 ? tr('found1') : tr('foundN')}</>}
                </div>
                <div className="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', maxWidth: '100%' }}>
                  {([
                    { id: 'distance',   label: tr('sortDistance') },
                    { id: 'rating',     label: tr('sortRating') },
                    { id: 'price_asc',  label: tr('sortPriceAsc') },
                    { id: 'price_desc', label: tr('sortPriceDesc') },
                  ] as const).map(s => (
                    <button key={s.id} onClick={() => setSortBy(s.id)} aria-pressed={sortBy === s.id} className={sortBy === s.id ? 'chip chip-active' : 'chip'} style={{ padding: '7px 13px', fontSize: 12.5, flexShrink: 0 }}
                    >{s.label}</button>
                  ))}
                </div>
              </div>
            )}

            {!searched && !loading && (
              <div className="empty-state" style={{ padding: '72px 20px' }}>
                <div className="empty-icon"><Search size={26}/></div>
                <div className="empty-title">{tr('idleTitle')}</div>
                <div className="empty-sub desktop-only">{tr('idleSubDesk')}</div>
                <div className="empty-sub mobile-only">{tr('idleSubMob')}</div>
              </div>
            )}

            {loading && (
              <div aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} className="card" style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div className="skeleton" style={{ width: 60, height: 60, borderRadius: 16, flexShrink: 0 }}/>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div className="skeleton" style={{ height: 14, width: '42%' }}/>
                      <div className="skeleton" style={{ height: 10, width: '22%' }}/>
                      <div className="skeleton" style={{ height: 10, width: '60%' }}/>
                    </div>
                    <div className="skeleton" style={{ width: 70, height: 28, flexShrink: 0 }}/>
                  </div>
                ))}
              </div>
            )}

            {searched && !loading && artisans.length === 0 && (
              <div className="empty-state" style={{ padding: '72px 20px' }}>
                <div className="empty-icon"><SearchX size={26}/></div>
                <div className="empty-title">{tr('emptyTitle')}</div>
                <div className="empty-sub">{tr('emptySub')}</div>
              </div>
            )}

            {!loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {artisans.map((a, idx) => {
                const col = categoryColor(a.category)
                const open = () => router.push(`/artisan/${a.artisan_id}`)
                return (
                  <div key={a.artisan_id} className="acard" {...pressable(open)}
                    style={{ padding: '18px 20px', display: 'flex', gap: 16, alignItems: 'center', animation: `fadeIn 0.3s ease ${Math.min(idx, 8) * 0.05}s both` }}
                    onClick={open}
                  >
                    <img src={artisanAvatar(a.avatar_url, a.artisan_id)} alt="" loading="lazy" style={{ width: 60, height: 60, borderRadius: 16, objectFit: 'cover', background: 'var(--bg3)', border: `2px solid ${col}`, flexShrink: 0 }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)' }}>{a.full_name}</span>
                        {a.plan === 'premium' && <PremiumBadge size="sm" />}
                        <BadgeCheck size={15} color="var(--accent)" strokeWidth={2.2} aria-label={tr('certified')}/>
                      </div>
                      <div style={{ fontSize: 12.5, color: categoryInk(a.category), fontWeight: 700, marginBottom: 6 }}>{t(`categories.${a.category}`)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--tx2)' }}>
                        <Stars rating={a.rating_avg || 0}/>
                        <span>{a.rating_avg ? <span className="num" style={{ color: 'var(--laiton)', fontWeight: 700 }}>{a.rating_avg.toFixed(1)}</span> : tr('newA')} ({a.rating_count || 0})</span>
                        <span aria-hidden style={{ color: 'var(--tx3)' }}>·</span>
                        <span>{a.distance_km?.toFixed(1)} km</span>
                        <span aria-hidden style={{ color: 'var(--tx3)' }}>·</span>
                        <span>{a.total_missions || 0} {tr('missions')}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'end', flexShrink: 0 }}>
                      <div className="num" style={{ fontSize: 19, fontWeight: 700, color: 'var(--tx)', marginBottom: 6 }}>{(a.hourly_rate || 0).toLocaleString('fr-DZ')} <span style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 400 }}>{tr('daH')}</span></div>
                      <span className={`badge-tone ${a.is_available ? 'tone-success' : 'tone-muted'}`}>
                        <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: a.is_available ? 'var(--success)' : 'var(--tx3)' }}/>
                        {a.is_available ? tr('available') : tr('busy')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Fond sombre du sheet de filtres (mobile) */}
      <div className={`filters-backdrop${filtersOpen ? ' open' : ''}`} onClick={() => setFiltersOpen(false)} />
    </>
  )
}
