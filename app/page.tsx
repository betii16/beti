'use client'
// ============================================================
// BETI — Page d'accueil — TRADUIT FR/AR
// ============================================================
import { supabase } from '@/lib/supabase'
import { useState, useEffect, useRef } from 'react'
import { AlgeriaCitySearch, ALGERIA_CITIES } from '@/components/AlgeriaSearch'
import { OtherCategorySearch } from '@/components/OtherCategory'
import { useLang } from '@/lib/LangContext'

type Artisan = {
  artisan_id: string; full_name: string; avatar_url: string | null
  category: string; rating_avg: number; rating_count: number
  hourly_rate: number; distance_km: number; is_available: boolean; total_missions: number
}

const CATEGORIES = [
  { id: 'plomberie',    icon: '⚙',  labelFr: 'Plomberie',    labelAr: 'السباكة',       color: '#3b82f6', bg: 'linear-gradient(135deg,#0d1a2a,#162030)', desc: 'Fuite, installation, débouchage' },
  { id: 'electricite',  icon: '⚡',  labelFr: 'Électricité',  labelAr: 'الكهرباء',      color: '#f59e0b', bg: 'linear-gradient(135deg,#1e1600,#2a1e00)', desc: 'Câblage, tableau électrique' },
  { id: 'menage',       icon: '✦',  labelFr: 'Ménage',        labelAr: 'التنظيف',       color: '#10b981', bg: 'linear-gradient(135deg,#051408,#0a2010)', desc: 'Nettoyage, entretien maison' },
  { id: 'demenagement', icon: '◈',  labelFr: 'Déménagement',  labelAr: 'النقل',         color: '#8b5cf6', bg: 'linear-gradient(135deg,#0f081e,#1a1030)', desc: 'Transport, emballage' },
  { id: 'jardinage',    icon: '❧',  labelFr: 'Jardinage',     labelAr: 'البستنة',      color: '#22c55e', bg: 'linear-gradient(135deg,#061204,#0a1e08)', desc: 'Tonte, taille' },
  { id: 'peinture',     icon: '◉',  labelFr: 'Peinture',      labelAr: 'الدهان',        color: '#ef4444', bg: 'linear-gradient(135deg,#1a0505,#2a0a0a)', desc: 'Intérieur, extérieur' },
  { id: 'serrurerie',   icon: '⌘',  labelFr: 'Serrurerie',    labelAr: 'أعمال الأقفال',color: '#f97316', bg: 'linear-gradient(135deg,#180d00,#2a1400)', desc: 'Ouverture, serrure' },
  { id: 'informatique', icon: '⬡',  labelFr: 'Informatique',  labelAr: 'الإعلام الآلي',color: '#6366f1', bg: 'linear-gradient(135deg,#080a1e,#0f1030)', desc: 'Réparation, réseau' },
  { id: 'coiffure',     icon: '✂',  labelFr: 'Coiffure',      labelAr: 'الحلاقة',      color: '#ec4899', bg: 'linear-gradient(135deg,#180510,#2a0a1e)', desc: 'Coupe, coloration' },
  { id: 'autre',        icon: '✳',  labelFr: 'Autre',         labelAr: 'أخرى',          color: '#a78bfa', bg: 'linear-gradient(135deg,#1a1030,#0f081e)', desc: 'Piscine, clim...' },
]

const SERVICE_KEYWORDS: Record<string, { fr: string[]; ar: string[] }> = {
  plomberie:    { fr: ['Fuite d\'eau','Débouchage','Chauffe-eau','Robinetterie','Urgence'], ar: ['تسرب مياه','انسداد','سخان','صنبور','طارئ'] },
  electricite:  { fr: ['Panne électrique','Tableau','Prise','Éclairage','Urgence'],        ar: ['انقطاع كهرباء','لوحة كهربائية','مقبس','إضاءة','طارئ'] },
  menage:       { fr: ['Nettoyage maison','Vitres','Cuisine','Salle de bain','Repassage'], ar: ['تنظيف منزل','نوافذ','مطبخ','حمام','كي الملابس'] },
  demenagement: { fr: ['Transport meubles','Emballage','Montage meubles','Stockage'],     ar: ['نقل أثاث','تغليف','تركيب أثاث','تخزين'] },
  jardinage:    { fr: ['Tonte pelouse','Taille haie','Plantation','Débroussaillage'],      ar: ['قص العشب','تقليم الأشجار','زراعة','إزالة أعشاب'] },
  peinture:     { fr: ['Peinture intérieure','Extérieure','Enduit','Plafond'],             ar: ['دهان داخلي','دهان خارجي','طلاء','سقف'] },
  serrurerie:   { fr: ['Porte bloquée','Changement serrure','Clé perdue','Urgence'],       ar: ['باب مقفل','تغيير قفل','مفتاح ضائع','طارئ'] },
  informatique: { fr: ['Réparation PC','Virus','Réseau wifi','Récupération données'],      ar: ['إصلاح حاسوب','فيروس','شبكة واي فاي','استرجاع بيانات'] },
  coiffure:     { fr: ['Coupe homme','Coupe femme','Coloration','Brushing','Barbe'],       ar: ['قص شعر رجالي','قص شعر نسائي','صبغة','تمليس','لحية'] },
  autre:        { fr: ['Livraison','Piscine','Climatisation','Antenne TV','Domotique'],    ar: ['توصيل','مسبح','تكييف','هوائي تلفزيون','أتمتة'] },
  '':           { fr: ['Urgence','Disponible maintenant','Week-end','Devis gratuit'],       ar: ['طارئ','متاح الآن','نهاية الأسبوع','تقدير مجاني'] },
}

function ServiceDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { isAr } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = CATEGORIES.find(c => c.id === value)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: '100%', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8, background: open ? '#1c1c2e' : '#161620', border: `0.5px solid ${open ? '#C9A84C66' : selected ? selected.color + '66' : '#2a2a3a'}`, borderRadius: 10, cursor: 'pointer', outline: 'none', transition: 'all 0.2s', fontFamily: 'Nexa, sans-serif' }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: selected ? selected.color + '22' : '#2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{selected ? selected.icon : '🔧'}</div>
        <span style={{ flex: 1, fontSize: 13, color: selected ? '#F0EDE8' : '#555', fontWeight: selected ? 800 : 300, textAlign: isAr ? 'right' : 'left' }}>
          {selected ? (isAr ? selected.labelAr : selected.labelFr) : (isAr ? 'اختر خدمة...' : 'Choisir un service...')}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={selected ? selected.color : '#555'} strokeWidth="2.5" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, minWidth: '100%', zIndex: 99999, background: '#0D0D12', border: '0.5px solid #3a3a4a', borderRadius: 14, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.98)', animation: 'dropIn 0.18s cubic-bezier(0.34,1.2,0.64,1)' }}>
          <div style={{ padding: '9px 14px', borderBottom: '0.5px solid #1e1e2a' }}>
            <div style={{ fontSize: 9, color: '#444', fontWeight: 800, letterSpacing: '0.12em' }}>{isAr ? 'اختر خدمة' : 'SÉLECTIONNER UN SERVICE'}</div>
          </div>
          <div onClick={() => { onChange(''); setOpen(false) }} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '0.5px solid #1e1e2a', display: 'flex', alignItems: 'center', gap: 10, background: !value ? '#161620' : 'transparent' }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: '#1e1e2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✳</div>
            <span style={{ fontSize: 13, color: !value ? '#F0EDE8' : '#555', fontWeight: !value ? 800 : 300 }}>{isAr ? 'جميع الخدمات' : 'Tous les services'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {CATEGORIES.map((cat, i) => {
              const isSel = value === cat.id
              return (
                <div key={cat.id} onClick={() => { onChange(cat.id); setOpen(false) }}
                  style={{ padding: '11px 14px', cursor: 'pointer', borderBottom: i < CATEGORIES.length - 2 ? '0.5px solid #1e1e2a' : 'none', borderRight: i % 2 === 0 ? '0.5px solid #1e1e2a' : 'none', background: isSel ? cat.bg : 'transparent', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.12s' }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#161620' }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: isSel ? cat.color + '28' : '#1e1e2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{cat.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: isSel ? 800 : 300, color: isSel ? cat.color : '#777' }}>{isAr ? cat.labelAr : cat.labelFr}</div>
                  </div>
                  {isSel && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: cat.color, flexShrink: 0 }}/>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function KeywordSelector({ onSelect, activeService }: { onSelect: (kws: string[]) => void; activeService: string }) {
  const { t, isAr } = useLang()
  const [selected, setSelected] = useState<string[]>([])
  const kws = SERVICE_KEYWORDS[activeService] || SERVICE_KEYWORDS['']
  const keywords = isAr ? kws.ar : kws.fr

  useEffect(() => { setSelected([]) }, [activeService])

  const toggle = (kw: string) => {
    const next = selected.includes(kw) ? selected.filter(k => k !== kw) : [...selected, kw]
    setSelected(next); onSelect(next)
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontSize: 10, color: '#444', fontWeight: 800, letterSpacing: '0.08em', flexShrink: 0 }}>{t('home.refine')}</span>
      {keywords.map(kw => {
        const active = selected.includes(kw)
        return (
          <button key={kw} onClick={() => toggle(kw)}
            style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', background: active ? '#1a1508' : 'transparent', border: `0.5px solid ${active ? '#C9A84C' : '#2a2a3a'}`, color: active ? '#C9A84C' : '#555', fontFamily: 'Nexa, sans-serif', fontWeight: active ? 800 : 300, transition: 'all 0.15s' }}>
            {active ? '✓ ' : ''}{kw}
          </button>
        )
      })}
      {selected.length > 0 && (
        <button onClick={() => { setSelected([]); onSelect([]) }}
          style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', background: 'transparent', border: '0.5px solid #2a1010', color: '#f87171', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>✕</button>
      )}
    </div>
  )
}

function CategoryChip({ cat, active, onClick }: { cat: typeof CATEGORIES[0]; active: boolean; onClick: () => void }) {
  const { isAr } = useLang()
  const [hovered, setHovered] = useState(false)
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  const isOn = active || hovered
  const handleClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const id = Date.now()
    setRipples(p => [...p, { id, x: e.clientX - rect.left - 60, y: e.clientY - rect.top - 60 }])
    setTimeout(() => setRipples(p => p.filter(r => r.id !== id)), 500)
    onClick()
  }
  return (
    <button onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={handleClick}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 9, padding: '12px 20px', borderRadius: 12, cursor: 'pointer', overflow: 'hidden', border: `0.5px solid ${isOn ? cat.color + '99' : '#2a2a3a'}`, background: '#161620', boxShadow: isOn ? `0 6px 24px ${cat.color}22` : 'none', transition: 'transform .25s cubic-bezier(.4,0,.2,1), box-shadow .25s, border-color .25s', transform: hovered ? 'translateY(-3px) scale(1.03)' : 'none', outline: 'none', fontFamily: 'Nexa, sans-serif' }}>
      <div style={{ position: 'absolute', inset: 0, background: cat.bg, opacity: isOn ? 1 : 0, transition: 'opacity .3s ease', borderRadius: 'inherit' }}/>
      {ripples.map(r => <div key={r.id} style={{ position: 'absolute', width: 120, height: 120, left: r.x, top: r.y, borderRadius: '50%', background: cat.color, opacity: 0.2, transform: 'scale(0)', animation: 'beti-ripple .5s ease-out forwards', pointerEvents: 'none' }}/>)}
      <div style={{ position: 'relative', zIndex: 1, fontSize: 15, width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isOn ? cat.color + '28' : 'rgba(255,255,255,.05)', color: isOn ? cat.color : '#666', transition: 'transform .3s cubic-bezier(.34,1.56,.64,1)', transform: hovered ? 'rotate(-12deg) scale(1.2)' : 'none' }}>{cat.icon}</div>
      <span style={{ position: 'relative', zIndex: 1, fontSize: 13, fontWeight: 800, color: isOn ? cat.color : '#777', transition: 'color .25s' }}>{isAr ? cat.labelAr : cat.labelFr}</span>
    </button>
  )
}

function Stars({ rating }: { rating: number }) {
  return <div style={{ display: 'flex', gap: 2 }}>{[1,2,3,4,5].map(i => <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill={i <= Math.round(rating) ? '#C9A84C' : '#2a2a3a'}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>)}</div>
}

function ArtisanCard({ artisan }: { artisan: Artisan }) {
  const { t, isAr } = useLang()
  const [hovered, setHovered] = useState(false)
  const catColor = CATEGORIES.find(c => artisan.category?.toLowerCase().includes(c.id.slice(0, 5)))?.color || '#C9A84C'
  const initials = artisan.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'A'
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={() => window.location.href = `/artisan/${artisan.artisan_id}`}
      style={{ background: hovered ? '#1c1c28' : '#161620', border: `0.5px solid ${hovered ? catColor + '55' : '#2a2a3a'}`, borderRadius: 18, padding: '22px', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)', transform: hovered ? 'translateY(-4px)' : 'none', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: catColor, transform: hovered ? 'scaleX(1)' : 'scaleX(0)', transformOrigin: 'left', transition: 'transform 0.3s ease' }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        {artisan.avatar_url ? <img src={artisan.avatar_url} alt="" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${catColor}` }}/> : <div style={{ width: 50, height: 50, borderRadius: '50%', background: catColor + '22', border: `1.5px solid ${hovered ? catColor : catColor + '44'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: catColor }}>{initials}</div>}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', marginBottom: 3 }}>{artisan.full_name}</div>
          <div style={{ fontSize: 10, color: catColor, letterSpacing: '0.07em', fontWeight: 800 }}>{artisan.category?.toUpperCase()}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 20, background: '#1a1508', border: '0.5px solid #2a2010' }}>
          <div style={{ width: 12, height: 12, background: '#C9A84C', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, color: '#0D0D12' }}>B</div>
          <span style={{ fontSize: 9, color: '#C9A84C', fontWeight: 800 }}>{t('common.certified')}</span>
        </div>
      </div>
      <div style={{ height: '0.5px', background: '#2a2a3a', marginBottom: 16 }}/>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div><Stars rating={artisan.rating_avg || 0}/><div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{artisan.rating_avg ? artisan.rating_avg.toFixed(1) : t('common.newRating')} · {artisan.rating_count || 0} {t('common.reviews')}</div></div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#C9A84C' }}>{(artisan.hourly_rate || 0).toLocaleString('fr-DZ')} {t('common.da')}<span style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>{t('common.perHour')}</span></div>
          <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{artisan.distance_km?.toFixed(1)} {t('common.km')} · {artisan.total_missions || 0} missions</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: '#0D0D12', border: '0.5px solid #2a2a3a', marginBottom: 14 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: artisan.is_available ? '#4ade80' : '#555', boxShadow: artisan.is_available ? '0 0 8px #4ade8088' : 'none' }}/>
        <span style={{ fontSize: 11, color: artisan.is_available ? '#4ade80' : '#555', fontWeight: 300 }}>{artisan.is_available ? t('common.available') : t('common.unavailable')}</span>
      </div>
      <button style={{ width: '100%', padding: '12px', background: hovered ? catColor : 'transparent', border: `0.5px solid ${hovered ? catColor : '#2a2a3a'}`, borderRadius: 10, color: hovered ? '#0D0D12' : '#666', fontSize: 13, fontWeight: hovered ? 800 : 300, cursor: 'pointer', transition: 'all 0.25s', fontFamily: 'Nexa, sans-serif' }}>
        {artisan.is_available ? t('common.bookNow') : t('common.viewProfile')}
      </button>
    </div>
  )
}

function SkeletonCard() {
  return <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 18, padding: '22px' }}><div style={{ display: 'flex', gap: 14, marginBottom: 18 }}><div style={{ width: 50, height: 50, borderRadius: '50%', background: '#2a2a3a', animation: 'pulse 1.5s infinite' }}/><div style={{ flex: 1 }}><div style={{ height: 14, background: '#2a2a3a', borderRadius: 4, marginBottom: 8, animation: 'pulse 1.5s infinite' }}/><div style={{ height: 10, background: '#2a2a3a', borderRadius: 4, width: '60%', animation: 'pulse 1.5s infinite' }}/></div></div><div style={{ height: '0.5px', background: '#2a2a3a', marginBottom: 16 }}/><div style={{ height: 40, background: '#2a2a3a', borderRadius: 8, marginBottom: 14, animation: 'pulse 1.5s infinite' }}/><div style={{ height: 36, background: '#2a2a3a', borderRadius: 8, animation: 'pulse 1.5s infinite' }}/></div>
}

export default function BetiHomePage() {
  const { t, isAr } = useLang()
  const [artisans, setArtisans] = useState<Artisan[]>([])
  const [loadingArtisans, setLoadingArtisans] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState('')
  const [counts, setCounts] = useState({ a: 0, b: 0, c: 0, d: 0 })
  const [userLocation, setUserLocation] = useState({ lat: 36.7538, lng: 3.0588 })
  const statsRef = useRef<HTMLDivElement>(null)
  const statsAnimated = useRef(false)

  useEffect(() => {
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }), () => {})
  }, [])

  useEffect(() => { loadArtisans() }, [userLocation, activeCategory])

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !statsAnimated.current) {
        statsAnimated.current = true
        const targets = { a: 12000, b: 98, c: 30, d: 50 }
        const start = Date.now()
        const tick = () => {
          const p = Math.min((Date.now() - start) / 1800, 1)
          const ease = 1 - Math.pow(1 - p, 3)
          setCounts({ a: Math.floor(ease * targets.a), b: Math.floor(ease * targets.b), c: Math.floor(ease * targets.c), d: Math.floor(ease * targets.d) })
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.3 })
    if (statsRef.current) obs.observe(statsRef.current)
    return () => obs.disconnect()
  }, [])

  const loadArtisans = async () => {
    setLoadingArtisans(true)
    try {
      const { data, error } = await supabase.rpc('get_nearby_artisans', { lat: userLocation.lat, lng: userLocation.lng, radius_km: 50, category_filter: activeCategory || null })
      if (!error && data) setArtisans(data)
    } catch {
      const { data } = await supabase.from('artisans').select('id, category, hourly_rate, is_available, rating_avg, rating_count, total_missions, profiles(full_name, avatar_url)').eq('is_available', true).limit(6)
      if (data && data.length > 0) {
        setArtisans(data.map((a: any) => ({ artisan_id: a.id, full_name: a.profiles?.full_name || 'Artisan', avatar_url: a.profiles?.avatar_url || null, category: a.category, rating_avg: a.rating_avg || 0, rating_count: a.rating_count || 0, hourly_rate: a.hourly_rate || 0, distance_km: Math.random() * 10, is_available: a.is_available, total_missions: a.total_missions || 0 })))
      } else {
        setArtisans([
          { artisan_id: '1', full_name: 'Karim Benali',   avatar_url: null, category: 'plomberie',   rating_avg: 4.9, rating_count: 84,  hourly_rate: 3500, distance_km: 1.2, is_available: true,  total_missions: 312 },
          { artisan_id: '2', full_name: 'Sofiane Amrani', avatar_url: null, category: 'electricite', rating_avg: 4.8, rating_count: 127, hourly_rate: 4000, distance_km: 2.8, is_available: true,  total_missions: 198 },
          { artisan_id: '3', full_name: 'Yacine Meziane', avatar_url: null, category: 'peinture',    rating_avg: 4.7, rating_count: 63,  hourly_rate: 3000, distance_km: 3.1, is_available: false, total_missions: 145 },
          { artisan_id: '4', full_name: 'Amina Kaci',     avatar_url: null, category: 'menage',      rating_avg: 5.0, rating_count: 211, hourly_rate: 2000, distance_km: 0.9, is_available: true,  total_missions: 521 },
          { artisan_id: '5', full_name: 'Riad Hamdi',     avatar_url: null, category: 'serrurerie',  rating_avg: 4.6, rating_count: 48,  hourly_rate: 4500, distance_km: 4.2, is_available: true,  total_missions: 89  },
          { artisan_id: '6', full_name: 'Nadia Bouzid',   avatar_url: null, category: 'coiffure',    rating_avg: 4.9, rating_count: 73,  hourly_rate: 1500, distance_km: 5.0, is_available: false, total_missions: 167 },
        ])
      }
    }
    setLoadingArtisans(false)
  }

  const filtered = artisans.filter(a => {
    if (!search) return true
    return a.full_name?.toLowerCase().includes(search.toLowerCase()) || a.category?.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <>
      <style suppressHydrationWarning>{`
        @keyframes beti-ripple { to { transform: scale(4); opacity: 0; } }
        @keyframes drift1 { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.1)} 66%{transform:translate(-20px,20px) scale(0.95)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes drift2 { 0%{transform:translate(0,0) scale(1)} 40%{transform:translate(-50px,25px) scale(1.08)} 70%{transform:translate(30px,-15px) scale(0.92)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes drift3 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,40px) scale(1.05)} 80%{transform:translate(-30px,-10px) scale(0.97)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes drift4 { 0%{transform:translate(0,0) scale(1)} 30%{transform:translate(-25px,-35px) scale(1.12)} 65%{transform:translate(35px,20px) scale(0.9)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes dropIn{0%{opacity:0;transform:scale(.96) translateY(-8px)}100%{opacity:1;transform:scale(1) translateY(0)}}
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0D0D12;color:#F0EDE8;font-family:Nexa,sans-serif;-webkit-font-smoothing:antialiased}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#C9A84C44;border-radius:2px}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0D0D12', paddingTop: 64, direction: isAr ? 'rtl' : 'ltr' }}>

        {/* HERO */}
        <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', width: 600, height: 350, background: '#C9A84C', opacity: .09, borderRadius: '50%', filter: 'blur(70px)', top: -100, left: '50%', transform: 'translateX(-50%)', animation: 'drift1 8s ease-in-out infinite' }}/>
            <div style={{ position: 'absolute', width: 400, height: 400, background: '#3b82f6', opacity: .07, borderRadius: '50%', filter: 'blur(70px)', bottom: -120, left: -100, animation: 'drift2 11s ease-in-out infinite' }}/>
            <div style={{ position: 'absolute', width: 350, height: 350, background: '#8b5cf6', opacity: .07, borderRadius: '50%', filter: 'blur(70px)', bottom: -100, right: -80, animation: 'drift3 9s ease-in-out infinite' }}/>
            <div style={{ position: 'absolute', width: 200, height: 200, background: '#f59e0b', opacity: .06, borderRadius: '50%', filter: 'blur(60px)', top: '35%', right: '8%', animation: 'drift4 13s ease-in-out infinite' }}/>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,168,76,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.03) 1px,transparent 1px)', backgroundSize: '60px 60px' }}/>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 20, background: '#1a1508', border: '0.5px solid #2a2010', fontSize: 10, color: '#C9A84C', letterSpacing: '.1em', fontWeight: 800, marginBottom: 24, position: 'relative', zIndex: 2 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C9A84C', animation: 'pulse 2s infinite' }}/>
            {t('home.badge')}
          </div>

          <h1 style={{ fontSize: 'clamp(3rem,7vw,5.5rem)', fontWeight: 800, lineHeight: 1.05, color: '#F0EDE8', marginBottom: 16, position: 'relative', zIndex: 2 }}>
            {t('home.title1')}<br/>
            <span style={{ background: 'linear-gradient(135deg,#C9A84C 0%,#FFE8A3 50%,#C9A84C 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('home.title2')}</span>
          </h1>

          <p style={{ fontSize: 16, color: '#555', maxWidth: 480, lineHeight: 1.7, margin: '0 auto 40px', fontWeight: 300, position: 'relative', zIndex: 2 }}>
            {t('home.subtitle')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640, width: '100%', margin: '0 auto 32px', position: 'relative', zIndex: 50 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <ServiceDropdown value={selectedService} onChange={v => { setSelectedService(v); setActiveCategory(v || null) }}/>
              <div style={{ flex: 1 }}>
                <AlgeriaCitySearch defaultCity={undefined} onSelect={city => setUserLocation({ lat: city.lat, lng: city.lng })} placeholder={t('home.cityLabel')}/>
              </div>
              <button onClick={loadArtisans} style={{ padding: '11px 20px', borderRadius: 10, background: '#C9A84C', border: 'none', color: '#0D0D12', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Nexa, sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}
                onMouseEnter={e => (e.target as HTMLElement).style.background = '#d4b55a'}
                onMouseLeave={e => (e.target as HTMLElement).style.background = '#C9A84C'}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0D0D12" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                {t('home.findBtn')}
              </button>
            </div>
            <KeywordSelector onSelect={kws => setSearch(kws.join(' '))} activeService={selectedService}/>
            {selectedService === 'autre' && <div style={{ animation: 'fadeIn 0.3s ease' }}><OtherCategorySearch onSearch={kw => setSearch(kw)}/></div>}
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
            {[t('home.trust1'), t('home.trust2'), t('home.trust3'), t('home.trust4')].map((trust, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#444', fontWeight: 300 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#C9A84C' }}/>{trust}
              </div>
            ))}
          </div>
        </section>

        {/* STATS */}
        <div ref={statsRef} style={{ background: '#09090f', borderTop: '0.5px solid #1e1e2a', borderBottom: '0.5px solid #1e1e2a', padding: '56px 40px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
            {[
              { value: counts.a.toLocaleString('fr-FR')+'+', label: t('home.statsA') },
              { value: counts.b+'%',                         label: t('home.statsB') },
              { value: '< '+counts.c+'min',                  label: t('home.statsC') },
              { value: counts.d+'+',                         label: t('home.statsD') },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '0 20px', borderRight: i < 3 ? '0.5px solid #1e1e2a' : 'none' }}>
                <div style={{ fontSize: 'clamp(2rem,3vw,3rem)', fontWeight: 800, color: '#C9A84C', lineHeight: 1, marginBottom: 10 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CATÉGORIES */}
        <section id="services" style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 40px 0' }}>
          <div style={{ marginBottom: 8, fontSize: 10, color: '#C9A84C', letterSpacing: '.12em', fontWeight: 800 }}>{t('home.servicesTag')}</div>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#F0EDE8', marginBottom: 32, lineHeight: 1.2 }}>{t('home.servicesTitle')}</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => <CategoryChip key={cat.id} cat={cat} active={activeCategory === cat.id} onClick={() => { const n = activeCategory === cat.id ? null : cat.id; setActiveCategory(n); setSelectedService(n || '') }}/>)}
          </div>
          {activeCategory === 'autre' && <div style={{ marginTop: 16, animation: 'fadeIn 0.3s ease' }}><OtherCategorySearch onSearch={kw => setSearch(kw)}/></div>}
        </section>

        {/* ARTISANS */}
        <section id="artisans" style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 40px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <div style={{ marginBottom: 8, fontSize: 10, color: '#C9A84C', letterSpacing: '.12em', fontWeight: 800 }}>{t('home.artisansTag')}</div>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: '#F0EDE8', lineHeight: 1.2 }}>{t('home.artisansTitle')}</h2>
            </div>
            <a href="/map" style={{ fontSize: 13, color: '#555', textDecoration: 'none', fontWeight: 300 }}>{t('home.seeOnMap')}</a>
          </div>
          {loadingArtisans ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {[1,2,3,4,5,6].map(i => <SkeletonCard key={i}/>)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#333' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#555', marginBottom: 8 }}>{t('home.noArtisan')}</div>
              <div style={{ fontSize: 13, color: '#444', fontWeight: 300, marginBottom: 24 }}>{t('home.noArtisanSub')}</div>
              <button onClick={() => { setSearch(''); setActiveCategory(null) }} style={{ padding: '10px 24px', background: '#C9A84C', border: 'none', borderRadius: 10, color: '#0D0D12', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                {t('home.reset')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {filtered.map((a) => <ArtisanCard key={a.artisan_id} artisan={a}/>)}
            </div>
          )}
        </section>

        {/* COMMENT ÇA MARCHE */}
        <section id="comment" style={{ background: '#09090f', borderTop: '0.5px solid #1e1e2a', padding: '80px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '.12em', fontWeight: 800, marginBottom: 8 }}>{t('home.howTag')}</div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: '#F0EDE8', marginBottom: 48, lineHeight: 1.2 }}>{t('home.howTitle')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 48 }}>
              {[
                { n: '01', title: t('home.step1t'), desc: t('home.step1d') },
                { n: '02', title: t('home.step2t'), desc: t('home.step2d') },
                { n: '03', title: t('home.step3t'), desc: t('home.step3d') },
              ].map(s => (
                <div key={s.n}>
                  <div style={{ fontSize: 52, fontWeight: 800, color: '#1e1e2a', lineHeight: 1, marginBottom: 16 }}>{s.n}</div>
                  <div style={{ width: 24, height: 2, background: '#C9A84C', marginBottom: 16 }}/>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#F0EDE8', marginBottom: 10 }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7, fontWeight: 300 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 40px' }}>
          <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 24, padding: '64px 52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', fontSize: 180, fontWeight: 800, color: '#1a1a22', pointerEvents: 'none', userSelect: 'none', lineHeight: 1 }}>BETI</div>
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '.12em', fontWeight: 800, marginBottom: 12 }}>{t('home.ctaTag')}</div>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: '#F0EDE8', marginBottom: 14, lineHeight: 1.2 }}>{t('home.ctaTitle')}</h2>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, maxWidth: 420, fontWeight: 300 }}>{t('home.ctaSub')}</p>
            </div>
            <div style={{ position: 'relative' }}>
              <a href="/auth/signup" style={{ textDecoration: 'none' }}>
                <button style={{ padding: '16px 32px', borderRadius: 12, background: '#C9A84C', border: 'none', color: '#0D0D12', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#d4b55a'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#C9A84C'}
                >{t('home.ctaBtn')}</button>
              </a>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ background: '#09090f', borderTop: '0.5px solid #1e1e2a', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: '#C9A84C', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#0D0D12' }}>B</div>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8', letterSpacing: '0.1em' }}>BETI</span>
          </div>
          <span style={{ fontSize: 12, color: '#333', fontWeight: 300 }}>© 2025 BETI · {isAr ? 'خدمات منزلية في الجزائر' : 'Services à domicile'}</span>
          <div style={{ display: 'flex', gap: 24 }}>
            {(isAr ? ['الشروط القانونية','الشروط العامة','الخصوصية','اتصل بنا'] : ['Mentions légales','CGU','Confidentialité','Contact']).map(l => (
              <a key={l} href="#" style={{ fontSize: 12, color: '#333', textDecoration: 'none', fontWeight: 300, transition: 'color 0.2s' }}
                onMouseEnter={e => (e.target as HTMLElement).style.color = '#C9A84C'}
                onMouseLeave={e => (e.target as HTMLElement).style.color = '#333'}
              >{l}</a>
            ))}
          </div>
        </footer>
      </div>
    </>
  )
}
