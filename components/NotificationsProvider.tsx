'use client'

// Fournisseur unique : session, rôle et compteur de notifications non lues.
// Une seule requête `count` + un seul canal realtime pour Navigation,
// MobileHeader et BottomTabBar (avant : 3 requêtes + 3 canaux dupliqués).

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Role = 'client' | 'artisan' | 'admin' | null
interface Ctx { user: any; role: Role; notifCount: number }

const NotificationsContext = createContext<Ctx>({ user: null, role: null, notifCount: 0 })
export const useNotifications = () => useContext(NotificationsContext)

export default function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<Role>(null)
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    let alive = true
    let channel: ReturnType<typeof supabase.channel> | null = null
    const stop = () => { if (channel) { supabase.removeChannel(channel); channel = null } }

    const apply = async (u: any) => {
      stop()
      if (!alive) return
      if (!u) { setUser(null); setRole(null); setNotifCount(0); return }
      setUser(u)
      const [{ data: profile }, { count }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', u.id).single(),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', u.id).eq('is_read', false),
      ])
      if (!alive) return
      if (profile) setRole(profile.role)
      setNotifCount(count || 0)
      stop()
      channel = supabase.channel(`notif-${u.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${u.id}` }, () => setNotifCount(p => p + 1))
        .subscribe()
    }

    supabase.auth.getUser().then(({ data }) => apply(data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setTimeout(() => apply(session?.user ?? null), 0)
      }
    })
    return () => { alive = false; sub.subscription.unsubscribe(); stop() }
  }, [])

  return <NotificationsContext.Provider value={{ user, role, notifCount }}>{children}</NotificationsContext.Provider>
}
