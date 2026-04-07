'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Mission = {
  id: string
  title: string
  price_agreed: number | null
  completed_at: string | null
  created_at: string
  profiles: { full_name: string } | null
}

const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export default function Revenus() {
  const router = useRouter()
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'month' | 'year' | 'all'>('month')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data } = await supabase
        .from('bookings')
        .select('*, profiles!bookings_client_id_fkey(full_name)')
        .eq('artisan_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      if (data) setMissions(data)
      setLoading(false)
    }
    init()
  }, [])

  const now = new Date()

  const filtered = missions.filter(m => {
    const d = new Date(m.completed_at || m.created_at)
    if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    if (period === 'year')  return d.getFullYear() === now.getFullYear()
    return true
  })

  const total = filtered.reduce((sum, m) => sum + (m.price_agreed || 0), 0)
  const totalAll = missions.reduce((sum, m) => sum + (m.price_agreed || 0), 0)
  const avgPerMission = filtered.length > 0 ? Math.round(total / filtered.length) : 0

  // Données par mois pour le graphe (12 derniers mois)
  const barData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const monthMissions = missions.filter(m => {
      const md = new Date(m.completed_at || m.created_at)
      return md.getMonth() === d.getMonth() && md.getFullYear() === d.getFullYear()
    })
    return {
      label: MONTHS_FR[d.getMonth()],
      value: monthMissions.reduce((sum, m) => sum + (m.price_agreed || 0), 0),
      count: monthMissions.length,
    }
  })
  const maxBar = Math.max(...barData.map(b => b.value), 1)

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: '#555', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>Chargement...</div>
    </div>
  )

  return (
    <div style={{ paddingTop: 64, minHeight: '100vh', background: '#0D0D12', fontFamily: 'Nexa, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#09090f', borderBottom: '0.5px solid #1e1e2a', padding: '32px 40px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 6 }}>MON DASHBOARD</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8', marginBottom: 4 }}>Mes revenus</h1>
            <p style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>{missions.length} mission{missions.length !== 1 ? 's' : ''} complétée{missions.length !== 1 ? 's' : ''} au total</p>
          </div>
          {/* Sélecteur période */}
          <div style={{ display: 'flex', gap: 6, background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 10, padding: 4 }}>
            {([['month', 'Ce mois'], ['year', 'Cette année'], ['all', 'Tout']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setPeriod(id)}
                style={{ padding: '7px 14px', background: period === id ? '#C9A84C' : 'transparent', border: 'none', borderRadius: 8, color: period === id ? '#0D0D12' : '#555', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 40px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { value: `${total.toLocaleString()} DA`, label: 'Revenus sur la période', color: '#4ade80', bg: '#0a2010' },
            { value: filtered.length, label: 'Missions complétées', color: '#60a5fa', bg: '#0d1a2a' },
            { value: `${avgPerMission.toLocaleString()} DA`, label: 'Revenu moyen / mission', color: '#C9A84C', bg: '#1a1508' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, marginBottom: 6 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Graphe barres 6 mois */}
        <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 16, padding: '24px', marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 20 }}>ÉVOLUTION SUR 6 MOIS</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140 }}>
            {barData.map(b => (
              <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>
                  {b.value > 0 ? `${(b.value/1000).toFixed(0)}k` : ''}
                </div>
                <div
                  style={{ width: '100%', borderRadius: '6px 6px 0 0', background: b.label === MONTHS_FR[now.getMonth()] ? '#C9A84C' : '#2a2a3a', transition: 'height 0.5s', height: `${(b.value / maxBar) * 100}%`, minHeight: b.value > 0 ? 4 : 0 }}
                />
                <div style={{ fontSize: 11, color: b.label === MONTHS_FR[now.getMonth()] ? '#C9A84C' : '#555', fontWeight: b.label === MONTHS_FR[now.getMonth()] ? 800 : 300 }}>{b.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Historique missions */}
        <div>
          <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 16 }}>
            DÉTAIL DES MISSIONS ({filtered.length})
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#333' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>💶</div>
              <div style={{ fontSize: 14, fontWeight: 300 }}>Aucune mission complétée sur cette période</div>
            </div>
          ) : (
            <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 16, overflow: 'hidden' }}>
              {filtered.map((m, i) => (
                <div key={m.id} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < filtered.length - 1 ? '0.5px solid #1e1e2a' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade8066', flexShrink: 0 }}/>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#F0EDE8', marginBottom: 2 }}>{m.title}</div>
                      <div style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>
                        {m.profiles?.full_name || 'Client'} · {fmt(m.completed_at || m.created_at)}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#4ade80' }}>
                    +{(m.price_agreed || 0).toLocaleString()} DA
                  </div>
                </div>
              ))}
              {/* Total */}
              <div style={{ padding: '14px 20px', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#888' }}>TOTAL</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#4ade80' }}>{total.toLocaleString()} DA</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


