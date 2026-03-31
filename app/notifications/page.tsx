'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'




type Notif = {
  id: string
  type: string
  title: string
  body: string
  is_read: boolean
  created_at: string
}

const NOTIF_CONFIG: Record<string, { icon: string; color: string }> = {
  booking_accepted:  { icon: '✅', color: '#4ade80' },
  booking_refused:   { icon: '❌', color: '#f87171' },
  booking_completed: { icon: '🎉', color: '#C9A84C' },
  new_booking:       { icon: '📩', color: '#60a5fa' },
  new_message:       { icon: '💬', color: '#a78bfa' },
  reminder:          { icon: '⏰', color: '#C9A84C' },
  payment:           { icon: '💶', color: '#4ade80' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1)  return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24)   return `il y a ${h}h`
  const days = Math.floor(h / 24)
  if (days < 7) return `il y a ${days}j`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString())     return "Aujourd'hui"
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

export default function Notifications() {
  const router = useRouter()
  const [notifs, setNotifs]   = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId]   = useState<string | null>(null)
  const [filter, setFilter]   = useState<'all' | 'unread'>('all')

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) setNotifs(data)

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      channel = supabase
        .channel(`notifs-page-${user.id}-${Date.now()}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, payload => setNotifs(prev => [payload.new as Notif, ...prev]))
        .subscribe()

      setLoading(false)
    }

    init()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  const deleteOne = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  const deleteAll = async () => {
    if (!userId) return
    await supabase.from('notifications').delete().eq('user_id', userId)
    setNotifs([])
  }

  const unreadCount = notifs.filter(n => !n.is_read).length
  const displayed   = filter === 'unread' ? notifs.filter(n => !n.is_read) : notifs

  const grouped: Record<string, Notif[]> = {}
  displayed.forEach(n => {
    const key = getDateLabel(n.created_at)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(n)
  })

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: '#555', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>Chargement...</div>
    </div>
  )

  return (
    <div style={{ paddingTop: 64, minHeight: '100vh', background: '#0D0D12', fontFamily: 'Nexa, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#09090f', borderBottom: '0.5px solid #1e1e2a', padding: '32px 40px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 6 }}>MON COMPTE</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8', marginBottom: 4 }}>Notifications</h1>
            <p style={{ fontSize: 13, color: unreadCount > 0 ? '#C9A84C' : '#555', fontWeight: unreadCount > 0 ? 800 : 300 }}>
              {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est lu ✓'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4, background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 8, padding: 3 }}>
              {(['all', 'unread'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: '6px 12px', background: filter === f ? '#2a2a3a' : 'transparent', border: 'none', borderRadius: 6, color: filter === f ? '#F0EDE8' : '#555', fontSize: 12, fontWeight: filter === f ? 800 : 300, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>
                  {f === 'all' ? 'Toutes' : 'Non lues'}
                </button>
              ))}
            </div>
            {notifs.length > 0 && (
              <button onClick={deleteAll}
                style={{ padding: '8px 14px', background: 'transparent', border: '0.5px solid #2a1010', borderRadius: 8, color: '#f87171', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>
                Tout effacer
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 40px' }}>
        {displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#333' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
            <div style={{ fontSize: 14, fontWeight: 300 }}>
              {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <div style={{ fontSize: 11, color: '#444', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 12 }}>
                  {date.toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(n => {
                    const cfg = NOTIF_CONFIG[n.type] || { icon: '🔔', color: '#555' }
                    return (
                      <div key={n.id} style={{
                        background: n.is_read ? '#161620' : '#1a1610',
                        border: `0.5px solid ${n.is_read ? '#2a2a3a' : '#C9A84C22'}`,
                        borderRadius: 14, padding: '14px 16px',
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                      }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#0D0D12', border: '0.5px solid #1e1e2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                          {cfg.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8' }}>{n.title}</div>
                            {!n.is_read && (
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A84C', boxShadow: '0 0 6px #C9A84C', flexShrink: 0 }}/>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: '#666', fontWeight: 300, lineHeight: 1.5, marginBottom: 6 }}>{n.body}</div>
                          <div style={{ fontSize: 11, color: '#444', fontWeight: 300 }}>{timeAgo(n.created_at)}</div>
                        </div>
                        <button onClick={() => deleteOne(n.id)}
                          style={{ background: 'transparent', border: 'none', color: '#333', fontSize: 20, cursor: 'pointer', padding: '0 2px', flexShrink: 0, lineHeight: 1 }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#333')}>
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


