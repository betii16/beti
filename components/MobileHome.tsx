'use client'

// components/MobileHome.tsx
// Accueil mobile « app native » — rendu < 768px uniquement (.mobile-only).
// Pensé pouce : salutation, recherche, catégories en carrousel, artisans à
// proximité en liste riche. Le desktop garde l'accueil complet de page.tsx.

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/LangContext'
import { CategoryIcon, categoryColor, categoryInk, pressable } from '@/components/icons'
import { LayoutGrid, MapPin, Search, BadgeCheck, ChevronRight, Shapes, X, Navigation, SearchX, CalendarCheck, CheckCircle2 } from 'lucide-react'
import { OtherCategorySearch } from '@/components/OtherCategory'
import { artisanAvatar } from '@/lib/avatar'

type Artisan = {
  artisan_id: string; full_name: string; avatar_url: string | null; category: string
  rating_avg: number; rating_count: number; hourly_rate: number; distance_km: number | null
  is_available: boolean; total_missions: number
}

// Palette unique (components/icons → CATEGORY_COLOR)
const CATS = ['plomberie', 'electricite', 'serrurerie', 'menage', 'peinture', 'demenagement', 'jardinage', 'informatique', 'coiffure']
  .map(id => ({ id, color: categoryColor(id) }))

function Star({ s = 11 }: { s?: number }) {
  return <svg aria-hidden width={s} height={s} viewBox="0 0 24 24" fill="var(--star)"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
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
  const catColor = (id: string) => categoryColor(id)
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
    <div className="mobile-only" style={{ position: 'relative', flexDirection: 'column', direction: isAr ? 'rtl' : 'ltr', paddingTop: 10, paddingBottom: 8, overflowX: 'hidden' }}>

      {/* ═══ Salutation + localisation ═══ */}
      <div className="anim-fade-up" style={{ padding: '16px 20px 0' }}>
        {userName ? (
          <div style={{ fontSize: 25, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            {greet}{firstName ? <span style={{ color: 'var(--accent)' }}> {firstName}</span> : ''}
          </div>
        ) : (
          <>
            <h1 className="display" style={{ fontSize: 'clamp(1.7rem, 8vw, 2.1rem)', fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.03em', lineHeight: 1.12, margin: 0 }}>
              {t('mhome.heroT1')} <span style={{ color: 'var(--accent)' }}>{t('mhome.heroT2')}</span>
            </h1>
            <p style={{ fontSize: 15, color: 'var(--tx2)', lineHeight: 1.55, margin: '10px 0 0' }}>{t('mhome.heroSub')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
              <button onClick={() => router.push('/recherche')} className="btn-primary btn-lg btn-block">{t('mhome.ctaFind')}</button>
              <button onClick={() => router.push('/auth/signup')} className="btn-ghost btn-lg btn-block">{t('mhome.ctaArtisan')}</button>
            </div>
          </>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: userName ? 6 : 16 }}>
          <MapPin size={13} color="var(--accent)" strokeWidth={2.2}/>
          <span style={{ fontSize: 13, color: 'var(--tx2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80vw' }}>
            {locating ? t('home.detecting') : (addr || 'Alger')}
          </span>
        </div>
      </div>

      {/* ═══ Recherche ═══ */}
      <div className="anim-fade-up" style={{ padding: '16px 20px 0', animationDelay: '0.06s' }}>
        <div className="search-pill" style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', minHeight: 50,
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16,
          boxShadow: 'var(--card-shadow)',
        }}>
          <Search size={17} color="var(--tx3)" strokeWidth={2} aria-hidden/>
          <input
            type="search" enterKeyHint="search"
            value={q} onChange={e => setQ(e.target.value)}
            placeholder={t('mhome.searchPh')} aria-label={t('mhome.searchPh')} className="bare-input"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', boxShadow: 'none', color: 'var(--tx)', fontSize: 16, minWidth: 0, padding: 0 }}
          />
          {q && (
            <button onClick={() => setQ('')} aria-label={isAr ? 'مسح' : 'Effacer'} style={{ background: 'transparent', border: 'none', width: 32, height: 32, margin: '-6px -8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} color="var(--tx2)"/></span>
            </button>
          )}
        </div>
      </div>

      {/* ═══ Catégories — carrousel ═══ */}
      <div className="anim-fade-up" style={{ animationDelay: '0.12s' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '22px 20px 12px' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.01em' }}>{t('mhome.categories')}</span>
        </div>
        {/* scrollPaddingInline : l'aimantation (snap) respecte la gouttière de 20px
            — sinon la 1re tuile se collait au bord de l'écran. */}
        <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '2px 20px 6px', scrollSnapType: 'x proximity', scrollPaddingInline: 20 }}>
          {(() => {
            const tile = (key: string, active: boolean, color: string, icon: React.ReactNode, label: string, onClick: () => void) => (
              <button key={key} onClick={onClick} aria-pressed={active} className="press" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, scrollSnapAlign: 'start', flexShrink: 0, width: 64 }}>
                <div className="glassb" style={{
                  width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? color : `${color}14`,
                  border: `1px solid ${active ? color : color + '2E'}`,
                  boxShadow: active ? `0 2px 0 ${color}, 0 10px 18px -10px ${color}` : 'none',
                  transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
                }}>
                  {icon}
                </div>
                <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? 'var(--tx)' : 'var(--tx2)', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
              </button>
            )
            const allColor = '#175CC4'
            const autre = categoryColor('autre')
            return <>
              {tile('all', cat === '', allColor, <LayoutGrid size={22} color={cat === '' ? '#fff' : 'var(--accent)'} strokeWidth={1.9}/>, t('mhome.all'), () => { setCat(''); setTags([]) })}
              {CATS.map(c => {
                const active = cat === c.id
                return tile(c.id, active, c.color, <CategoryIcon id={c.id} size={23} color={active ? '#fff' : c.color} strokeWidth={1.9}/>, cl(c.id), () => { setCat(active ? '' : c.id); setTags([]) })
              })}
              {tile('autre', cat === 'autre', autre, <Shapes size={22} color={cat === 'autre' ? '#fff' : autre} strokeWidth={1.9}/>, t('mhome.other'), () => { setCat('autre'); setTags([]) })}
            </>
          })()}
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
          <div onClick={() => router.push('/map')} {...pressable(() => router.push('/map'))} className="press" style={{
            position: 'relative', borderRadius: 18, overflow: 'hidden', cursor: 'pointer',
            background: 'linear-gradient(135deg, #175CC4 0%, #0F3F86 100%)',
            padding: '20px 22px', boxShadow: '0 2px 0 #0B2F66, 0 14px 28px -14px rgba(15,63,134,0.6)',
          }}>
            {/* Décor : motif de carreaux (zellige) très discret, pas de reflet « glossy » */}
            <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: 0.09, pointerEvents: 'none', backgroundImage: 'linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%), linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%)', backgroundSize: '22px 22px', backgroundPosition: '0 0, 11px 11px', maskImage: 'linear-gradient(100deg, transparent 45%, #000 100%)', WebkitMaskImage: 'linear-gradient(100deg, transparent 45%, #000 100%)' }}/>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', marginBottom: 5 }}>{t('mhome.promoTitle')}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)', lineHeight: 1.5, marginBottom: 14, maxWidth: 230 }}>{t('mhome.promoSub')}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 'var(--r-btn)', background: '#fff', color: '#175CC4', fontSize: 13, fontWeight: 800 }}>
                  <Navigation size={13} strokeWidth={2.4} style={{ transform: isAr ? 'scaleX(-1)' : 'none' }}/>{t('mhome.promoCta')}
                </div>
              </div>
              <div aria-hidden style={{ width: 58, height: 58, borderRadius: 16, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin size={26} color="#fff" strokeWidth={1.8}/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Comment ça marche (visiteurs) ═══ */}
      {!q && !userName && (
        <div style={{ padding: '26px 20px 0' }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.01em', margin: '0 0 12px' }}>{t('mhome.howTitle')}</h2>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[{ k: 'how1', Icon: Search }, { k: 'how2', Icon: CalendarCheck }, { k: 'how3', Icon: CheckCircle2 }].map((st, i) => (
              <li key={st.k} style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '13px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r-card)' }}>
                <span aria-hidden style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 11, background: 'var(--accent-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <st.Icon size={19} color="var(--on-accent)" strokeWidth={2}/>
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: 'var(--tx)', marginBottom: 2 }}>{i + 1}. {t(`mhome.${st.k}t`)}</span>
                  <span style={{ display: 'block', fontSize: 13, color: 'var(--tx2)', lineHeight: 1.5 }}>{t(`mhome.${st.k}d`)}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ═══ Artisans à proximité ═══ */}
      <div className="anim-fade-up" style={{ animationDelay: '0.24s' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '24px 20px 4px' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.01em' }}>
            {t('mhome.nearYou')}
            {!loading && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--tx3)', marginInlineStart: 7 }}>{list.length} {list.length > 1 ? t('home.artisansNear') : t('home.artisanNear')}</span>}
          </span>
        </div>

        {/* Tri */}
        <div className="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 20px 14px' }}>
          {SORTS.map(s => (
            <button key={s.id} onClick={() => setSort(s.id)} aria-pressed={sort === s.id}
              className={`chip${sort === s.id ? ' chip-active' : ''}`}
              style={{ padding: '8px 15px', borderRadius: 'var(--r-pill)', fontSize: 12.5, flexShrink: 0 }}>{s.label}</button>
          ))}
        </div>

        {/* Liste */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '0 20px' }}>
          {loading ? (
            <div aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r-card)' }}>
                  <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 15, flexShrink: 0 }}/>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div className="skeleton" style={{ width: '58%', height: 13 }}/>
                    <div className="skeleton" style={{ width: '30%', height: 10 }}/>
                    <div className="skeleton" style={{ width: '72%', height: 10 }}/>
                  </div>
                  <div className="skeleton" style={{ width: 44, height: 26, borderRadius: 8 }}/>
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 12px' }}>
              <div className="empty-icon"><SearchX size={24} strokeWidth={1.6}/></div>
              <div className="empty-title" style={{ fontSize: 15 }}>{q ? t('mhome.noResults') : (cat === 'autre' && tags.length === 0 ? t('home.addKeywords') : t('home.noArtisan'))}</div>
              {(q || cat) && (
                <button onClick={() => { setQ(''); setCat(''); setTags([]) }} className="btn-primary" style={{ marginTop: 12 }}>{t('home.seeAll')}</button>
              )}
            </div>
          ) : (
            visible.map((a, i) => {
              const c = catColor(a.category)
              return (
                <div key={a.artisan_id} onClick={() => openA(a)} {...pressable(() => openA(a))} className="press anim-fade-up" style={{
                  display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px',
                  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r-card)',
                  cursor: 'pointer', boxShadow: 'var(--card-shadow)',
                  opacity: a.is_available ? 1 : 0.6,
                  animationDelay: `${Math.min(i, 8) * 0.05}s`,
                }}>
                  {/* Avatar */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img src={artisanAvatar(a.avatar_url, a.artisan_id)} alt="" loading="lazy" style={{ width: 56, height: 56, borderRadius: 15, objectFit: 'cover', background: 'var(--bg3)', border: `2px solid ${c}` }}/>
                    {a.is_available && <div aria-hidden style={{ position: 'absolute', bottom: -1, insetInlineEnd: -1, width: 13, height: 13, borderRadius: '50%', background: 'var(--success)', border: '2.5px solid var(--bg2)' }}/>}
                  </div>

                  {/* Infos */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.full_name}</span>
                      <BadgeCheck size={14} color="var(--accent)" strokeWidth={2.2} style={{ flexShrink: 0 }}/>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <Star s={11}/>
                      <span className="num" style={{ fontSize: 12, fontWeight: 700, color: 'var(--laiton)' }}>{(a.rating_avg || 0).toFixed(1)}</span>
                      <span style={{ fontSize: 11, color: 'var(--tx3)' }}>({a.rating_count})</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--tx3)', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      <span style={{ color: categoryInk(a.category), fontWeight: 700 }}>{cl(a.category)}</span>
                      {a.distance_km != null && <><span aria-hidden>·</span><span>{a.distance_km.toFixed(1)} {t('common.km')}</span></>}
                      <span aria-hidden>·</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.total_missions} {t('common.missions')}</span>
                    </div>
                  </div>

                  {/* Prix */}
                  <div style={{ textAlign: 'center', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div>
                      <div className="num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', lineHeight: 1 }}>{(a.hourly_rate || 0).toLocaleString('fr-DZ')}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--tx3)', marginTop: 4 }}>{t('common.da')}{t('common.perHour')}</div>
                    </div>
                    <ChevronRight size={16} color="var(--tx3)" style={{ transform: isAr ? 'rotate(180deg)' : 'none' }}/>
                  </div>
                </div>
              )
            })
          )}

          {!loading && list.length > shown && (
            <button onClick={() => setShown(p => p + 8)} className="btn-ghost btn-block" style={{ marginTop: 2, fontWeight: 600, color: 'var(--tx2)' }}>
              {t('home.showMore')} ({list.length - shown})
            </button>
          )}
        </div>
      </div>

      {/* ═══ CTA artisan ═══ */}
      {!userName && (
        <div style={{ padding: '22px 20px 4px' }}>
          <div onClick={() => router.push('/auth/signup')} {...pressable(() => router.push('/auth/signup'))} className="press" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '17px 18px', borderRadius: 'var(--r-card)', cursor: 'pointer',
            background: 'var(--bg2)', border: '1px solid color-mix(in srgb, var(--accent) 28%, var(--border))', boxShadow: 'var(--card-shadow)',
          }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--tx)', marginBottom: 3 }}>{t('mhome.becomeTitle')}</div>
              <div style={{ fontSize: 12.5, color: 'var(--tx2)' }}>{t('mhome.becomeSub')}</div>
            </div>
            <div style={{ padding: '10px 16px', borderRadius: 'var(--r-btn)', background: 'var(--accent-fill)', color: 'var(--on-accent)', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>{t('mhome.becomeCta')}</div>
          </div>
        </div>
      )}
    </div>
  )
}
