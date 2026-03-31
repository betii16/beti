'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'




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
  accepted:    '#60a5fa',
  in_progress: '#a78bfa',
  completed:   '#4ade80',
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']

export default function Planning() {
  const router = useRouter()
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
        .in('status', ['accepted', 'in_progress', 'completed'])
        .order('scheduled_at', { ascending: true })

      if (data) setMissions(data)
      setLoading(false)
    }
    init()
  }, [])

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

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

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: '#555', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>Chargement...</div>
    </div>
  )

  return (
    <div style={{ paddingTop: 64, minHeight: '100vh', background: '#0D0D12', fontFamily: 'Nexa, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#09090f', borderBottom: '0.5px solid #1e1e2a', padding: '32px 40px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 6 }}>MON DASHBOARD</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8', marginBottom: 4 }}>Mon planning</h1>
            <p style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>{upcoming.length} mission{upcoming.length !== 1 ? 's' : ''} à venir</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['month', 'list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '8px 16px', background: view === v ? '#C9A84C' : 'transparent', border: '0.5px solid #2a2a3a', borderRadius: 8, color: view === v ? '#0D0D12' : '#555', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                {v === 'month' ? '📅 Calendrier' : '📋 Liste'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 40px' }}>

        {view === 'month' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>

            {/* Calendrier */}
            <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 16, padding: '24px' }}>
              {/* Nav mois */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <button onClick={prevMonth} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}>‹</button>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8' }}>{MONTHS_FR[currentMonth]} {currentYear}</span>
                <button onClick={nextMonth} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}>›</button>
              </div>

              {/* Jours de la semaine */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
                {DAYS_FR.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#444', fontWeight: 800, padding: '6px 0' }}>{d}</div>
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
                        background: isSelected ? '#C9A84C' : isToday ? '#1a1508' : hasMissions ? '#161628' : 'transparent',
                        border: isToday && !isSelected ? '0.5px solid #C9A84C44' : '0.5px solid transparent',
                      }}>
                      <span style={{ fontSize: 13, fontWeight: isToday || isSelected ? 800 : 300, color: isSelected ? '#0D0D12' : isToday ? '#C9A84C' : hasMissions ? '#F0EDE8' : '#555' }}>
                        {day}
                      </span>
                      {hasMissions && !isSelected && (
                        <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                          {Array.from({ length: Math.min(mCount, 3) }).map((_, j) => (
                            <div key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: STATUS_COLOR[missionsByDay[day][j]?.status] || '#C9A84C' }}/>
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
              <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 14 }}>
                {selectedDay ? `${selectedDay} ${MONTHS_FR[currentMonth]}` : 'Sélectionne un jour'}
              </div>

              {selectedDay && selectedMissions.length === 0 && (
                <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '32px', textAlign: 'center', color: '#333' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
                  <div style={{ fontSize: 13, fontWeight: 300 }}>Aucune mission ce jour</div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {selectedMissions.map(m => (
                  <div key={m.id} style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '16px', borderLeft: `3px solid ${STATUS_COLOR[m.status] || '#C9A84C'}` }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8', marginBottom: 6 }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 800, marginBottom: 8 }}>⏰ {fmtTime(m.scheduled_at)}</div>
                    <div style={{ fontSize: 12, color: '#555', fontWeight: 300, marginBottom: 4 }}>👤 {m.profiles?.full_name || 'Client'}</div>
                    {m.profiles?.phone && <div style={{ fontSize: 12, color: '#555', fontWeight: 300, marginBottom: 4 }}>📞 {m.profiles.phone}</div>}
                    <div style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>📍 {m.address}</div>
                    {m.price_agreed && <div style={{ fontSize: 12, color: '#C9A84C', fontWeight: 800, marginTop: 8 }}>💶 {m.price_agreed} DA/h</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Vue liste */}
        {view === 'list' && (
          <div>
            <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 20 }}>MISSIONS À VENIR</div>
            {upcoming.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 0', color: '#333' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📅</div>
                <div style={{ fontSize: 14, fontWeight: 300 }}>Aucune mission à venir</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {upcoming.map(m => (
                  <div key={m.id} style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 20, borderLeft: `3px solid ${STATUS_COLOR[m.status] || '#C9A84C'}` }}>
                    <div style={{ textAlign: 'center', minWidth: 50 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#F0EDE8' }}>{new Date(m.scheduled_at).getDate()}</div>
                      <div style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>{MONTHS_FR[new Date(m.scheduled_at).getMonth()].slice(0,3)}</div>
                    </div>
                    <div style={{ width: '0.5px', height: 40, background: '#2a2a3a' }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8', marginBottom: 4 }}>{m.title}</div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>⏰ {fmtTime(m.scheduled_at)}</span>
                        <span style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>👤 {m.profiles?.full_name}</span>
                        <span style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>📍 {m.address}</span>
                        {m.price_agreed && <span style={{ fontSize: 12, color: '#C9A84C', fontWeight: 800 }}>💶 {m.price_agreed} DA/h</span>}
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


