'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchPhones } from '@/lib/phones'
import { useLang } from '@/lib/LangContext'
import { SkeletonPage } from '@/components/Skeleton'
import { Calendar, ClipboardList, Inbox, Clock, User, Phone, MapPin, Banknote, ChevronLeft, ChevronRight } from 'lucide-react'
import NavigateButton from '@/components/NavigateButton'

type Mission = {
  id: string
  client_id: string
  title: string
  address: string
  scheduled_at: string
  status: string
  price_agreed: number | null
  lat: number | null
  lng: number | null
  profiles: { full_name: string; phone: string | null } | null
}

const STATUS_COLOR: Record<string, string> = {
  confirmed:   'var(--accent)',
  in_progress: 'var(--laiton)',
  completed:   'var(--success)',
}
const ICON: React.CSSProperties = { verticalAlign: 'middle', marginInlineEnd: 5, flexShrink: 0 }
const META: React.CSSProperties = { fontSize: 13, color: 'var(--tx2)', marginBottom: 4, overflowWrap: 'anywhere' }
const NAV_BTN: React.CSSProperties = { width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-btn)', color: 'var(--tx)', cursor: 'pointer' }
const SCOPE_CSS = `.plan-scope :is(a,button):focus-visible{outline:2px solid var(--accent);outline-offset:2px}`

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function Planning() {
  const router = useRouter()
  const { t, isAr } = useLang()
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [today] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())
  const [view, setView] = useState<'month' | 'list'>('month')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data } = await supabase
        .from('bookings')
        .select('*, profiles!bookings_client_id_fkey(full_name, phone)')
        .eq('artisan_id', user.id)
        .in('status', ['confirmed', 'in_progress', 'completed'])
        .order('scheduled_at', { ascending: true })
        .returns<Mission[]>()

      if (data) {
        const ph = await fetchPhones(data.map(m => m.client_id))
        setMissions(data.map(m => ({ ...m, profiles: m.profiles ? { ...m.profiles, phone: ph[m.client_id] || m.profiles.phone || null } : m.profiles })))
      }
      setLoading(false)
    }
    init()
  }, [])

  const locale = isAr ? 'ar-DZ' : 'fr-FR'
  const fmt = (d: string) => new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'long' })
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const months = t('planning.months').split(',')
  const days = t('planning.days').split(',')

  // Missions du mois affiché
  const missionsThisMonth = missions.filter(m => {
    const d = new Date(m.scheduled_at)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })

  // Missions par jour
  const missionsByDay: Record<number, Mission[]> = {}
  missionsThisMonth.forEach(m => {
    const day = new Date(m.scheduled_at).getDate()
    if (!missionsByDay[day]) missionsByDay[day] = []
    missionsByDay[day].push(m)
  })

  // Missions du jour sélectionné
  const selectedMissions = selectedDay ? (missionsByDay[selectedDay] || []) : []

  // Prochaines missions (futures)
  const upcoming = missions.filter(m => new Date(m.scheduled_at) >= new Date())

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
    setSelectedDay(null)
  }

  if (loading) return <SkeletonPage rows={6} />

  return (
    <div className="plan-scope" style={{ paddingTop: 64, minHeight: '100vh', direction: isAr ? 'rtl' : 'ltr' }}>
      <style>{SCOPE_CSS}</style>

      {/* Header */}
      <div className="page-x" style={{ borderBottom: '1px solid var(--border)', padding: '32px 40px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="section-label">{t('planning.eyebrow')}</div>
            <h1 style={{ fontSize: 'clamp(24px, 6vw, 30px)', lineHeight: 1.15, fontWeight: 800, color: 'var(--tx)', marginBottom: 6 }}>{t('planning.title')}</h1>
            <p style={{ fontSize: 14, color: 'var(--tx2)' }}><span className="num">{upcoming.length}</span> {t('planning.missions')}</p>
          </div>
          <div role="group" style={{ display: 'flex', gap: 8 }}>
            {(['month', 'list'] as const).map(v => (
              <button key={v} aria-pressed={view === v} onClick={() => setView(v)} className={view === v ? 'chip chip-active' : 'chip'} style={{ minHeight: 44 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{v === 'month' ? <><Calendar size={13}/>{t('planning.viewCalendar')}</> : <><ClipboardList size={13}/>{t('planning.viewList')}</>}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-pad-m" style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 40px 48px' }}>

        {view === 'month' && (
          <div className="grid-collapse" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>

            {/* Calendrier */}
            <div className="card" style={{ padding: 'clamp(14px, 4vw, 24px)' }}>
              {/* Nav mois */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <button onClick={prevMonth} aria-label={isAr ? 'الشهر السابق' : 'Mois précédent'} style={NAV_BTN}>{isAr ? <ChevronRight size={20}/> : <ChevronLeft size={20}/>}</button>
                <h2 aria-live="polite" style={{ fontSize: 17, fontWeight: 800, color: 'var(--tx)' }}>{months[currentMonth]} <span className="num">{currentYear}</span></h2>
                <button onClick={nextMonth} aria-label={isAr ? 'الشهر التالي' : 'Mois suivant'} style={NAV_BTN}>{isAr ? <ChevronLeft size={20}/> : <ChevronRight size={20}/>}</button>
              </div>

              {/* Jours de la semaine */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
                {days.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 12, color: 'var(--tx2)', fontWeight: 700, padding: '6px 0' }}>{d}</div>
                ))}
              </div>

              {/* Grille jours */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {/* Cases vides avant le 1er */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`}/>
                ))}
                {/* Jours */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
                  const isSelected = day === selectedDay
                  const hasMissions = !!missionsByDay[day]
                  const mCount = missionsByDay[day]?.length || 0

                  return (
                    <button key={day} type="button" onClick={() => setSelectedDay(day)}
                      aria-pressed={isSelected} aria-current={isToday ? 'date' : undefined}
                      aria-label={`${day} ${months[currentMonth]}${mCount ? ` — ${mCount} mission${mCount > 1 ? 's' : ''}` : ''}`}
                      style={{
                        aspectRatio: '1', minHeight: 40, padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 10, cursor: 'pointer', position: 'relative', transition: 'background .15s, border-color .15s',
                        background: isSelected ? 'var(--accent)' : hasMissions ? 'color-mix(in srgb, var(--accent) 9%, transparent)' : 'transparent',
                        border: isToday && !isSelected ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                      }}>
                      <span className="num" style={{ fontSize: 14, fontWeight: isToday || isSelected || hasMissions ? 800 : 500, color: isSelected ? '#fff' : isToday ? 'var(--accent)' : hasMissions ? 'var(--tx)' : 'var(--tx2)' }}>
                        {day}
                      </span>
                      {hasMissions && !isSelected && (
                        <div aria-hidden style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                          {Array.from({ length: Math.min(mCount, 3) }).map((_, j) => (
                            <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS_COLOR[missionsByDay[day][j]?.status] || 'var(--accent)' }}/>
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Détail du jour sélectionné */}
            <div>
              <h2 className="section-label" style={{ marginBottom: 14 }}>
                {selectedDay ? `${selectedDay} ${months[currentMonth]}` : t('planning.selectDay')}
              </h2>

              {selectedDay && selectedMissions.length === 0 && (
                <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <div aria-hidden style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', color: 'var(--tx2)' }}><Inbox size={30}/></div>
                  <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{t('planning.nothingToday')}</div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {selectedMissions.map(m => (
                  <div key={m.id} className="card" style={{ padding: '16px', borderInlineStart: `3px solid ${STATUS_COLOR[m.status] || 'var(--accent)'}` }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', marginBottom: 6 }}>{m.title}</div>
                    <div className="num" style={{ fontSize: 14, color: 'var(--tx)', fontWeight: 700, marginBottom: 8 }}><Clock size={14} style={ICON} aria-hidden/>{fmtTime(m.scheduled_at)}</div>
                    <div style={META}><User size={13} style={ICON} aria-hidden/>{m.profiles?.full_name || t('planning.clientFallback')}</div>
                    {m.profiles?.phone && <div style={META}><Phone size={13} style={ICON} aria-hidden/><a href={`tel:${m.profiles.phone}`} dir="ltr" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>{m.profiles.phone}</a></div>}
                    <div style={{ ...META, marginBottom: 0 }}><MapPin size={13} style={ICON} aria-hidden/>{m.address}</div>
                    {m.price_agreed && <div className="num" style={{ fontSize: 14, color: 'var(--tx)', fontWeight: 800, marginTop: 8 }}><Banknote size={14} style={ICON} aria-hidden/>{m.price_agreed} DA/h</div>}
                    {m.status !== 'completed' && (
                      <div style={{ marginTop: 12 }}><NavigateButton lat={m.lat} lng={m.lng} /></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Vue liste */}
        {view === 'list' && (
          <div>
            <h2 className="section-label" style={{ marginBottom: 16 }}>{t('planning.upcoming')}</h2>
            {upcoming.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                <div aria-hidden style={{ width: 56, height: 56, borderRadius: 14, margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}><Calendar size={26}/></div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx)' }}>{t('planning.noUpcoming')}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {upcoming.map(m => (
                  <div key={m.id} className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px 16px', flexWrap: 'wrap', borderInlineStart: `3px solid ${STATUS_COLOR[m.status] || 'var(--accent)'}` }}>
                    <div style={{ textAlign: 'center', minWidth: 48 }}>
                      <div className="num" style={{ fontSize: 24, lineHeight: 1, fontWeight: 800, color: 'var(--tx)' }}>{new Date(m.scheduled_at).getDate()}</div>
                      <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 4 }}>{months[new Date(m.scheduled_at).getMonth()].slice(0,3)}</div>
                    </div>
                    <div aria-hidden style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)' }}/>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', marginBottom: 6 }}>{m.title}</div>
                      <div style={{ display: 'flex', gap: '4px 16px', flexWrap: 'wrap' }}>
                        <span className="num" style={{ fontSize: 13, color: 'var(--tx)', fontWeight: 700 }}><Clock size={13} style={ICON} aria-hidden/>{fmtTime(m.scheduled_at)}</span>
                        <span style={{ fontSize: 13, color: 'var(--tx2)' }}><User size={13} style={ICON} aria-hidden/>{m.profiles?.full_name || t('planning.clientFallback')}</span>
                        <span style={{ fontSize: 13, color: 'var(--tx2)' }}><MapPin size={13} style={ICON} aria-hidden/>{m.address}</span>
                        {m.price_agreed && <span className="num" style={{ fontSize: 13, color: 'var(--tx)', fontWeight: 800 }}><Banknote size={13} style={ICON} aria-hidden/>{m.price_agreed} DA/h</span>}
                      </div>
                    </div>
                    {m.status !== 'completed' && <NavigateButton lat={m.lat} lng={m.lng} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


