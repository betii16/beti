'use client'

// components/BottomTabBar.tsx
// Barre d'onglets mobile fixe (style Yassir/Uber) — visible < 768px uniquement.
// La nav du haut garde le desktop ; sur mobile c'est ici que tout se passe.

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Search, Map, CalendarDays, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'

// Routes plein écran où la barre gêne (clavier, flux dédiés)
const HIDDEN_PREFIXES = ['/auth', '/chat', '/onboarding']

export default function BottomTabBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t, isAr } = useLang()
  const [role, setRole] = useState<'client' | 'artisan' | 'admin' | null>(null)
  const [logged, setLogged] = useState(false)
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    let alive = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!alive || !data.user) return
      setLogged(true)
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      if (!alive) return
      if (profile) setRole(profile.role)
      const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', data.user.id).eq('is_read', false)
      if (alive) setNotifCount(count || 0)
      channel = supabase.channel(`tab-notif-${data.user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${data.user.id}` }, () => setNotifCount(p => p + 1))
        .subscribe()
    }
    init()
    return () => { alive = false; if (channel) supabase.removeChannel(channel) }
  }, [pathname])

  if (HIDDEN_PREFIXES.some(p => pathname?.startsWith(p))) return null

  const profileHref = !logged ? '/auth/login'
    : role === 'artisan' ? '/artisan-dashboard'
    : role === 'admin' ? '/admin'
    : '/mon-espace'

  const bookingsHref = !logged ? '/auth/login'
    : role === 'artisan' ? '/artisan-dashboard/planning'
    : '/mon-espace/reservations'

  const TABS = [
    { href: '/',           label: t('nav.tabHome'),     Icon: Home,         match: (p: string) => p === '/' },
    { href: '/recherche',  label: t('nav.tabSearch'),   Icon: Search,       match: (p: string) => p.startsWith('/recherche') || p.startsWith('/artisans') || p.startsWith('/artisan/') },
    { href: '/map',        label: t('nav.tabMap'),      Icon: Map,          match: (p: string) => p.startsWith('/map') },
    { href: bookingsHref,  label: t('nav.tabBookings'), Icon: CalendarDays, match: (p: string) => p.startsWith('/mon-espace/reservations') || p.startsWith('/artisan-dashboard/planning') },
    { href: profileHref,   label: t('nav.tabProfile'),  Icon: User,         match: (p: string) => p === '/mon-espace' || p === '/artisan-dashboard' || p.startsWith('/admin') || p.startsWith('/compte') || p.startsWith('/parametres'), badge: notifCount },
  ]

  return (
    <>
      {/* Espace réservé dans le flux pour ne pas masquer le bas des pages */}
      <div className="mobile-only" style={{ height: 'calc(62px + env(safe-area-inset-bottom))' }}/>

      <nav className="mobile-only" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 250,
        display: 'flex', alignItems: 'stretch',
        height: 'calc(62px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '0.5px solid var(--border)',
        direction: isAr ? 'rtl' : 'ltr',
      }}>
        {TABS.map(({ href, label, Icon, match, badge }) => {
          const active = match(pathname || '')
          return (
            <button key={label} onClick={() => router.push(href)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
              color: active ? 'var(--accent)' : 'var(--tx3)',
              WebkitTapHighlightColor: 'transparent',
            }}>
              <div style={{ position: 'relative', display: 'flex' }}>
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8}/>
                {!!badge && badge > 0 && (
                  <div style={{ position: 'absolute', top: -4, right: -7, minWidth: 15, height: 15, padding: '0 3px', borderRadius: 8, background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#fff' }}>
                    {badge > 9 ? '9+' : badge}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 800 : 300, fontFamily: 'Nexa, sans-serif', letterSpacing: '0.02em' }}>{label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
