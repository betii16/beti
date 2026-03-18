'use client'

// components/NotificationSystem.tsx
// Notifications push temps réel — à mettre dans layout.tsx

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Notif = {
  id: string
  type: 'booking_new' | 'booking_accepted' | 'booking_refused' | 'booking_completed' | 'message_new'
  title: string
  desc: string
  link?: string
  read: boolean
  created_at: string
}

const NOTIF_ICONS = {
  booking_new:       { icon: '📋', color: '#C9A84C' },
  booking_accepted:  { icon: '✅', color: '#4ade80' },
  booking_refused:   { icon: '❌', color: '#f87171' },
  booking_completed: { icon: '🏁', color: '#a78bfa' },
  message_new:       { icon: '💬', color: '#3b82f6' },
}

export function NotificationBell() {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const ref = useRef<HTMLDivElement>(null)
  const unread = notifs.filter(n => !n.read).length

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setProfile(prof)
      loadNotifs(user.id, prof?.role)
    }
    init()
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loadNotifs = async (userId: string, role: string) => {
    if (role === 'artisan') {
      const { data } = await supabase.from('bookings')
        .select('id, title, status, created_at, profiles!bookings_client_id_fkey(full_name)')
        .eq('artisan_id', userId).order('created_at', { ascending: false }).limit(20)
      if (data) {
        const n: Notif[] = data.map(b => ({
          id: b.id,
          type: b.status === 'pending' ? 'booking_new' : b.status === 'completed' ? 'booking_completed' : 'booking_accepted',
          title: b.status === 'pending' ? 'Nouvelle réservation' : b.status === 'completed' ? 'Mission terminée' : `Réservation ${b.status}`,
          desc: `${(b as any).profiles?.full_name || 'Client'} · ${b.title || 'Service'}`,
          link: `/artisan-dashboard`,
          read: b.status !== 'pending',
          created_at: b.created_at,
        }))
        setNotifs(n)
      }
    } else {
      const { data } = await supabase.from('bookings')
        .select('id, title, status, created_at, artisan:artisans(profiles(full_name))')
        .eq('client_id', userId).order('created_at', { ascending: false }).limit(20)
      if (data) {
        const n: Notif[] = data.map(b => ({
          id: b.id,
          type: b.status === 'accepted' ? 'booking_accepted' : b.status === 'refused' ? 'booking_refused' : 'booking_completed',
          title: b.status === 'accepted' ? '✅ Artisan accepté !' : b.status === 'refused' ? 'Réservation refusée' : `Réservation ${b.status}`,
          desc: `${(b.artisan as any)?.profiles?.full_name || 'Artisan'} · ${b.title || 'Service'}`,
          link: `/mon-espace`,
          read: b.status === 'pending',
          created_at: b.created_at,
        }))
        setNotifs(n)
      }
    }
  }

  useEffect(() => {
    if (!user || !profile) return
    const channel = supabase.channel(`notifs-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bookings',
        filter: profile?.role === 'artisan' ? `artisan_id=eq.${user.id}` : `client_id=eq.${user.id}`,
      }, () => loadNotifs(user.id, profile.role))
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
      }, payload => {
        const msg = payload.new as any
        if (msg.sender_id !== user.id) {
          const newNotif: Notif = {
            id: msg.id, type: 'message_new',
            title: 'Nouveau message',
            desc: msg.sender_name + ' : ' + msg.content.slice(0, 40) + (msg.content.length > 40 ? '...' : ''),
            link: `/chat/${msg.booking_id}`,
            read: false, created_at: msg.created_at,
          }
          setNotifs(prev => [newNotif, ...prev].slice(0, 20))
          // Notification navigateur
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('BETI — ' + newNotif.title, { body: newNotif.desc, icon: '/favicon.ico' })
          }
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, profile])

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  const requestPushPermission = () => { if ('Notification' in window) Notification.requestPermission() }

  if (!user) return null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => { setOpen(!open); if (!open) requestPushPermission() }}
        style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, background: open ? '#1a1508' : '#161620', border: `0.5px solid ${open ? '#C9A84C44' : '#2a2a3a'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={open ? '#C9A84C' : '#888'} strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        {unread > 0 && (
          <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', border: '2px solid #0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 800 }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 340, background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.7)', zIndex: 9999, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #1e1e2a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#F0EDE8' }}>Notifications</div>
            {unread > 0 && <button onClick={markAllRead} style={{ fontSize: 11, color: '#C9A84C', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>Tout marquer lu</button>}
          </div>

          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                <div style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>Aucune notification</div>
              </div>
            ) : notifs.map(n => {
              const { icon, color } = NOTIF_ICONS[n.type] || { icon: '📢', color: '#888' }
              return (
                <a key={n.id} href={n.link || '#'} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #1e1e2a', display: 'flex', gap: 10, alignItems: 'flex-start', background: n.read ? 'transparent' : '#1a1508', transition: 'background 0.15s', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1e1e2a'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = n.read ? 'transparent' : '#1a1508'}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: color + '18', border: `0.5px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{icon}</div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#F0EDE8', marginBottom: 2 }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: '#555', fontWeight: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.desc}</div>
                      <div style={{ fontSize: 10, color: '#444', marginTop: 4, fontWeight: 300 }}>{new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 3 }}/>}
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
