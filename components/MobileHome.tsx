'use client'

// components/MobileHome.tsx
// Accueil mobile « app native » — rendu < 768px uniquement (.mobile-only).
// Pensé pouce : salutation, recherche, catégories en carrousel, artisans à
// proximité en liste riche. Le desktop garde l'accueil complet de page.tsx.

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/LangContext'
import { CategoryIcon } from '@/components/icons'
import { LayoutGrid, MapPin, Search, BadgeCheck, ChevronRight, Shapes, X, Navigation } from 'lucide-react'
import { OtherCategorySearch } from '@/components/OtherCategory'

type Artisan = {
  artisan_id: string; full_name: string; avatar_url: string | null; category: string
  rating_avg: number; rating_count: number; hourly_rate: number; distance_km: number | null
  is_available: boolean; total_missions: number
}

const CATS = [
  { id: 'plomberie',    color: '#3b82f6' },
  { id: 'electricite',  color: '#f59e0b' },
  { id: 'serrurerie',   color: '#ef4444' },
  { id: 'menage',       color: '#10b981' },
  { id: 'peinture',     color: '#f97316' },
  { id: 'demenagement', color: '#8b5cf6' },
  { id: 'jardinage',    color: '#22c55e' },
  { id: 'informatique', color: '#6366f1' },
  { id: 'coiffure',     color: '#ec4899' },
]

function Star({ s = 11 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="#f59e0b"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
}

export default function MobileHome({
  artisans, loading, cat, setCat, tags, setTags, addr, locating, openA, userName,
}: {
  artisans: Artisan[]; loading: boolean
  cat: string; setCat: (c: string) => void
  tags: string[]; setTags: (t: string[]) => void
  addr: string; locating: boolean
  openA: (a: Artisan) => void
  userName?: string | null
}) {
  const router = useRouter()
  const { t, isAr } = useLang()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'distance' | 'rating' | 'price_asc' | 'missions'>('distance')
  const [shown, setShown] = useState(8)

  const cl = (id: string) => t(`categories.${id}`)
  const catColor = (id: string) => CATS.find(c => c.id === id)?.color || '#6366f1'
  const hour = new Date().getHours()
  const greet = hour >= 5 && hour < 18 ? t('mhome.greetingDay') : t('mhome.greetingEvening')
  const firstName = userName ? userName.split(' ')[0] : ''

  const list = useMemo(() => {
    let l = artisans
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      l = l.filter(a => a.full_name.toLowerCase().includes(needle) || cl(a.category).toLowerCase().includes(needle) || a.category.includes(needle))
    }
    return [...l].sort((a, b) => {
      if (sort === 'distance')  return (a.distance_km ?? 99) - (b.distance_km ?? 99)
      if (sort === 'rating')    return (b.rating_avg || 0) - (a.rating_avg || 0)
      if (sort === 'price_asc') return (a.hourly_rate || 0) - (b.hourly_rate || 0)
      return (b.total_missions || 0) - (a.total_missions || 0)
    })
  }, [artisans, q, sort]) // eslint-disable-line react-hooks/exhaustive-deps

  const visible = list.slice(0, shown)

  const SORTS = [
    { id: 'distance'  as const, label: t('home.sortDistance') },
    { id: 'rating'    as const, label: t('home.sortRating') },
    { id: 'price_asc' as const, label: t('home.sortPriceAsc') },
    { id: 'missions'  as const, label: t('home.sortExp') },
  ]

  return (
    <div className="mobile-only" style={{ flexDirection: 'column', direction: isAr ? 'rtl' : 'ltr', paddingTop: 10, paddingBottom: 8, overflowX: 'hidden' }}>

      {/* ═══ Salutation + localisation ═══ */}
      <div className="anim-fade-up" style={{ padding: '16px 20px 0' }}>
        <div style={{ fontSize: 25, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          {greet}{firstName ? <span style={{ background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}> {firstName}</span> : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
          <MapPin size={12} color="var(--accent)" strokeWidth={2.2}/>
          <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80vw' }}>
            {locating ? t('home.detecting') : (addr || 'Alger')}
          </span>
        </div>
      </div>

      {/* ═══ Recherche ═══ */}
      <div className="anim-fade-up" style={{ padding: '16px 20px 0', animationDelay: '0.06s' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16,
          boxShadow: 'var(--card-shadow)',
        }}>
          <Search size={17} color="var(--tx3)" strokeWidth={2}/>
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder={t('mhome.searchPh')}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--tx)', fontSize: 14, fontFamily: 'Nexa,sans-serif', fontWeight: 300, minWidth: 0 }}
          />
          {q && (
            <button onClick={() => setQ('')} style={{ background: 'var(--border)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
              <X size={11} color="var(--tx2)"/>
            </button>
          )}
        </div>
      </div>

      {/* ═══ Catégories — carrousel ═══ */}
      <div className="anim-fade-up" style={{ animationDelay: '0.12s' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '22px 20px 12px' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.01em' }}>{t('mhome.categories')}</span>
        </div>
        <div className="no-scrollbar" style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '2px 20px 6px', scrollSnapType: 'x proximity' }}>
          {/* Tous */}
          <button onClick={() => { setCat(''); setTags([]) }} className="press" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, scrollSnapAlign: 'start', flexShrink: 0 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 19, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: cat === '' ? 'var(--gradient)' : 'var(--bg2)',
              border: `1px solid ${cat === '' ? 'transparent' : 'var(--border)'}`,
              boxShadow: cat === '' ? '0 6px 18px rgba(99,102,241,0.35)' : 'var(--card-shadow)',
              transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
            }}>
              <LayoutGrid size={22} color={cat === '' ? '#fff' : 'var(--tx2)'} strokeWidth={1.9}/>
            </div>
            <span style={{ fontSize: 10.5, fontWeight: cat === '' ? 800 : 300, color: cat === '' ? 'var(--tx)' : 'var(--tx2)', fontFamily: 'Nexa,sans-serif' }}>{t('mhome.all')}</span>
          </button>

          {CATS.map(c => {
            const active = cat === c.id
            return (
              <button key={c.id} onClick={() => { setCat(active ? '' : c.id); setTags([]) }} className="press" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, scrollSnapAlign: 'start', flexShrink: 0 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 19, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? c.color : `${c.color}14`,
                  border: `1px solid ${active ? c.color : c.color + '26'}`,
                  boxShadow: active ? `0 6px 18px ${c.color}50` : 'none',
                  transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
                }}>
                  <CategoryIcon id={c.id} size={23} color={active ? '#fff' : c.color} strokeWidth={1.9}/>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: active ? 800 : 300, color: active ? 'var(--tx)' : 'var(--tx2)', fontFamily: 'Nexa,sans-serif', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cl(c.id)}</span>
              </button>
            )
          })}

          {/* Autre */}
          <button onClick={() => { setCat('autre'); setTags([]) }} className="press" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, scrollSnapAlign: 'start', flexShrink: 0, paddingRight: isAr ? 0 : 6, paddingLeft: isAr ? 6 : 0 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 19, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: cat === 'autre' ? '#a78bfa' : '#a78bfa14',
              border: `1px solid ${cat === 'autre' ? '#a78bfa' : '#a78bfa26'}`,
              boxShadow: cat === 'autre' ? '0 6px 18px #a78bfa50' : 'none',
              transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
            }}>
              <Shapes size={22} color={cat === 'autre' ? '#fff' : '#a78bfa'} strokeWidth={1.9}/>
            </div>
            <span style={{ fontSize: 10.5, fontWeight: cat === 'autre' ? 800 : 300, color: cat === 'autre' ? 'var(--tx)' : 'var(--tx2)', fontFamily: 'Nexa,sans-serif' }}>{t('mhome.other')}</span>
          </button>
        </div>

        {cat === 'autre' && (
          <div className="anim-scale-in" style={{ padding: '12px 20px 0' }}>
            <OtherCategorySearch onSearch={kw => { const tg = kw.trim().split(/\s+/).filter(Boolean); setTags(tg) }}/>
            {tags.length === 0 && <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--tx3)', fontWeight: 300, marginTop: 10 }}>{t('home.otherHint')}</p>}
          </div>
        )}
      </div>

      {/* ═══ Bannière carte ═══ */}
      {!q && (
        <div className="anim-fade-up" style={{ padding: '20px 20px 0', animationDelay: '0.18s' }}>
          <div onClick={() => router.push('/map')} className="press" style={{
            position: 'relative', borderRadius: 22, overflow: 'hidden', cursor: 'pointer',
            background: 'linear-gradient(120deg, #6366f1 0%, #7c5cf0 55%, #8b5cf6 100%)',
            padding: '20px 22px', boxShadow: '0 12px 32px rgba(99,102,241,0.32)',
          }}>
            {/* Décor */}
            <div style={{ position: 'absolute', width: 170, height: 170, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -70, right: -40, pointerEvents: 'none' }}/>
            <div style={{ position: 'absolute', width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', bottom: -50, left: '38%', pointerEvents: 'none' }}/>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', marginBottom: 5 }}>{t('mhome.promoTitle')}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.82)', fontWeight: 300, lineHeight: 1.5, marginBottom: 13, maxWidth: 230 }}>{t('mhome.promoSub')}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12, background: '#fff', color: '#6366f1', fontSize: 12, fontWeight: 800 }}>
                  <Navigation size={13} strokeWidth={2.4}/>{t('mhome.promoCta')}
                </div>
              </div>
              <div style={{ width: 58, height: 58, borderRadius: 18, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backdropFilter: 'blur(4px)' }}>
                <MapPin size={26} color="#fff" strokeWidth={1.8}/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Artisans à proximité ═══ */}
      <div className="anim-fade-up" style={{ animationDelay: '0.24s' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '24px 20px 4px' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.01em' }}>
            {t('mhome.nearYou')}
            {!loading && <span style={{ fontSize: 11, fontWeight: 300, color: 'var(--tx3)', marginInlineStart: 7 }}>{list.length} {list.length > 1 ? t('home.artisansNear') : t('home.artisanNear')}</span>}
          </span>
        </div>

        {/* Tri */}
        <div className="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 20px 14px' }}>
          {SORTS.map(s => (
            <button key={s.id} onClick={() => setSort(s.id)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 11.5, whiteSpace: 'nowrap', flexShrink: 0,
              fontFamily: 'Nexa,sans-serif', cursor: 'pointer',
              background: sort === s.id ? 'var(--accent)' : 'var(--bg2)',
              border: `1px solid ${sort === s.id ? 'var(--accent)' : 'var(--border)'}`,
              color: sort === s.id ? '#fff' : 'var(--tx2)',
              fontWeight: sort === s.id ? 700 : 300,
              transition: 'all 0.2s',
            }}>{s.label}</button>
          ))}
        </div>

        {/* Liste */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '0 20px' }}>
          {loading ? (
            [1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: 86, borderRadius: 18 }}/>)
          ) : visible.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '44px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx2)', marginBottom: 6 }}>{q ? t('mhome.noResults') : (cat === 'autre' && tags.length === 0 ? t('home.addKeywords') : t('home.noArtisan'))}</div>
              {(q || cat) && (
                <button onClick={() => { setQ(''); setCat(''); setTags([]) }} style={{ marginTop: 10, padding: '10px 24px', borderRadius: 12, background: 'var(--gradient)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Nexa,sans-serif' }}>{t('home.seeAll')}</button>
              )}
            </div>
          ) : (
            visible.map((a, i) => {
              const c = catColor(a.category)
              const init = a.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'A'
              return (
                <div key={a.artisan_id} onClick={() => openA(a)} className="press anim-fade-up" style={{
                  display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px',
                  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18,
                  cursor: 'pointer', boxShadow: 'var(--card-shadow)',
                  opacity: a.is_available ? 1 : 0.45,
                  animationDelay: `${Math.min(i, 8) * 0.05}s`,
                }}>
                  {/* Avatar */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {a.avatar_url ? (
                      <img src={a.avatar_url} alt="" style={{ width: 56, height: 56, borderRadius: 17, objectFit: 'cover', border: `2px solid ${c}30` }}/>
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: 17, background: `linear-gradient(135deg, ${c}30, ${c}14)`, border: `2px solid ${c}26`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 800, color: c }}>{init}</div>
                    )}
                    {a.is_available && <div style={{ position: 'absolute', bottom: -1, insetInlineEnd: -1, width: 13, height: 13, borderRadius: '50%', background: '#10b981', border: '2.5px solid var(--bg2)' }}/>}
                  </div>

                  {/* Infos */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.full_name}</span>
                      <BadgeCheck size={14} color="var(--accent)" strokeWidth={2.2} style={{ flexShrink: 0 }}/>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <Star s={11}/>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#f59e0b' }}>{(a.rating_avg || 0).toFixed(1)}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--tx3)', fontWeight: 300 }}>({a.rating_count})</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ color: c, fontWeight: 700 }}>{cl(a.category)}</span>
                      {a.distance_km != null && <><span>·</span><span>{a.distance_km.toFixed(1)} {t('common.km')}</span></>}
                      <span>·</span><span>{a.total_missions} {t('common.missions')}</span>
                    </div>
                  </div>

                  {/* Prix */}
                  <div style={{ textAlign: 'center', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', lineHeight: 1 }}>{(a.hourly_rate || 0).toLocaleString('fr-DZ')}</div>
                      <div style={{ fontSize: 9.5, color: 'var(--tx3)', fontWeight: 300, marginTop: 3 }}>{t('common.da')}{t('common.perHour')}</div>
                    </div>
                    <ChevronRight size={16} color="var(--tx3)" style={{ transform: isAr ? 'rotate(180deg)' : 'none' }}/>
                  </div>
                </div>
              )
            })
          )}

          {!loading && list.length > shown && (
            <button onClick={() => setShown(p => p + 8)} style={{ padding: 13, borderRadius: 14, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--tx2)', fontSize: 12.5, fontWeight: 300, cursor: 'pointer', fontFamily: 'Nexa,sans-serif', marginTop: 2 }}>
              {t('home.showMore')} ({list.length - shown})
            </button>
          )}
        </div>
      </div>

      {/* ═══ CTA artisan ═══ */}
      {!userName && (
        <div style={{ padding: '22px 20px 4px' }}>
          <div onClick={() => router.push('/auth/signup')} className="press" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '17px 18px', borderRadius: 18, cursor: 'pointer',
            background: 'var(--bg2)', border: '1px solid var(--accent)33', boxShadow: 'var(--card-shadow)',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', marginBottom: 3 }}>{t('mhome.becomeTitle')}</div>
              <div style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 300 }}>{t('mhome.becomeSub')}</div>
            </div>
            <div style={{ padding: '9px 16px', borderRadius: 12, background: 'var(--gradient)', color: '#fff', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>{t('mhome.becomeCta')}</div>
          </div>
        </div>
      )}
    </div>
  )
}
