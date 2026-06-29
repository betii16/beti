'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { SkeletonPage } from '@/components/Skeleton'
import { Calendar, ClipboardList, Inbox, Clock, User, Phone, MapPin, Banknote } from 'lucide-react'

type Mission = {
  id: string
  title: string
  address: string
  scheduled_at: string
  status: string
  price_agreed: number | null
  profiles: { full_name: string; phone: string | null } | null
}

const STATUS_COLOR: Record<string, string> = {
  confirmed:   '#60a5fa',
  in_progress: '#a78bfa',
  completed:   '#4ade80',
}

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

      if (data) setMissions(data)
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
    <div style={{ paddingTop: 64, minHeight: '100vh', fontFamily: 'Nexa, sans-serif', direction: isAr ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div className="page-x" style={{ borderBottom: '0.5px solid var(--border)', padding: '32px 40px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, color: '#5A3DF0', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 6 }}>{t('planning.eyebrow')}</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--tx)', marginBottom: 4 }}>{t('planning.title')}</h1>
            <p style={{ fontSize: 13, color: 'var(--tx3)', fontWeight: 300 }}>{upcoming.length} {t('planning.missions')}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['month', 'list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className={view === v ? 'chip chip-active' : 'chip'}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{v === 'month' ? <><Calendar size={13}/>{t('planning.viewCalendar')}</> : <><ClipboardList size={13}/>{t('planning.viewList')}</>}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-pad-m" style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 40px' }}>

        {view === 'month' && (
          <div className="grid-collapse" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>

            {/* Calendrier */}
            <div className="card" style={{ padding: '24px' }}>
              {/* Nav mois */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <button onClick={prevMonth} style={{ background: 'transparent', border: 'none', color: 'var(--tx3)', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}>‹</button>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)' }}>{months[currentMonth]} {currentYear}</span>
                <button onClick={nextMonth} style={{ background: 'transparent', border: 'none', color: 'var(--tx3)', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}>›</button>
              </div>

              {/* Jours de la semaine */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
                {days.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--tx3)', fontWeight: 800, padding: '6px 0' }}>{d}</div>
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
                    <div key={day} onClick={() => setSelectedDay(day)}
                      style={{
                        aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 10, cursor: 'pointer', position: 'relative', transition: 'all 0.15s',
                        background: isSelected ? '#5A3DF0' : isToday ? '#5A3DF00d' : hasMissions ? '#161628' : 'transparent',
                        border: isToday && !isSelected ? '0.5px solid #5A3DF044' : '0.5px solid transparent',
                      }}>
                      <span style={{ fontSize: 13, fontWeight: isToday || isSelected ? 800 : 300, color: isSelected ? '#fff' : isToday ? '#5A3DF0' : hasMissions ? 'var(--tx)' : 'var(--tx3)' }}>
                        {day}
                      </span>
                      {hasMissions && !isSelected && (
                        <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                          {Array.from({ length: Math.min(mCount, 3) }).map((_, j) => (
                            <div key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: STATUS_COLOR[missionsByDay[day][j]?.status] || '#5A3DF0' }}/>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Détail du jour sélectionné */}
            <div>
              <div style={{ fontSize: 11, color: '#5A3DF0', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 14 }}>
                {selectedDay ? `${selectedDay} ${months[currentMonth]}` : t('planning.selectDay')}
              </div>

              {selectedDay && selectedMissions.length === 0 && (
                <div className="card" style={{ padding: '32px', textAlign: 'center', color: '#333' }}>
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><Inbox size={30}/></div>
                  <div style={{ fontSize: 13, fontWeight: 300 }}>{t('planning.nothingToday')}</div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {selectedMissions.map(m => (
                  <div key={m.id} className="card" style={{ padding: '16px', borderLeft: `3px solid ${STATUS_COLOR[m.status] || '#5A3DF0'}` }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', marginBottom: 6 }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 800, marginBottom: 8 }}><Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{fmtTime(m.scheduled_at)}</div>
                    <div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300, marginBottom: 4 }}><User size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{m.profiles?.full_name || t('planning.clientFallback')}</div>
                    {m.profiles?.phone && <div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300, marginBottom: 4 }}><Phone size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{m.profiles.phone}</div>}
                    <div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300 }}><MapPin size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{m.address}</div>
                    {m.price_agreed && <div style={{ fontSize: 12, color: '#5A3DF0', fontWeight: 800, marginTop: 8 }}><Banknote size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{m.price_agreed} DA/h</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Vue liste */}
        {view === 'list' && (
          <div>
            <div style={{ fontSize: 11, color: '#5A3DF0', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 20 }}>{t('planning.upcoming')}</div>
            {upcoming.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 0', color: '#333' }}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><Calendar size={38}/></div>
                <div style={{ fontSize: 14, fontWeight: 300 }}>{t('planning.noUpcoming')}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {upcoming.map(m => (
                  <div key={m.id} className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 20, borderLeft: `3px solid ${STATUS_COLOR[m.status] || '#5A3DF0'}` }}>
                    <div style={{ textAlign: 'center', minWidth: 50 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tx)' }}>{new Date(m.scheduled_at).getDate()}</div>
                      <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>{months[new Date(m.scheduled_at).getMonth()].slice(0,3)}</div>
                    </div>
                    <div style={{ width: '0.5px', height: 40, background: 'var(--border)' }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', marginBottom: 4 }}>{m.title}</div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300 }}><Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{fmtTime(m.scheduled_at)}</span>
                        <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300 }}><User size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{m.profiles?.full_name || t('planning.clientFallback')}</span>
                        <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300 }}><MapPin size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{m.address}</span>
                        {m.price_agreed && <span style={{ fontSize: 12, color: '#5A3DF0', fontWeight: 800 }}><Banknote size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{m.price_agreed} DA/h</span>}
                      </div>
                    </div>
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


