'use client'

// components/BottomTabBar.tsx
// Dock flottant mobile (< 768px) — style app premium : barre en verre arrondie
// détachée du bord, bouton Carte central surélevé en dégradé, pilule animée
// derrière l'onglet actif, badge de notifications.

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Search, Map, CalendarDays, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'

// Routes plein écran où la barre gêne (clavier, flux dédiés)
const HIDDEN_PREFIXES = ['/auth', '/chat', '/onboarding', '/suivi']

export default function BottomTabBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t, isAr } = useLang()
  const [role, setRole] = useState<'client' | 'artisan' | 'admin' | null>(null)
  const [logged, setLogged] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [hidden, setHidden] = useState(true) // masqué au départ → glisse à l'entrée

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

  // Entrée : glisse vers le haut juste après le montage
  useEffect(() => {
    const tmr = setTimeout(() => setHidden(false), 60)
    return () => clearTimeout(tmr)
  }, [])

  // Auto-masquage : se cache au scroll vers le bas, revient au scroll vers le
  // haut, toujours visible en haut de page (lecture/validation sans gêne).
  useEffect(() => {
    let lastY = window.scrollY
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        if (y < 60) setHidden(false)
        else if (y > lastY + 6) setHidden(true)
        else if (y < lastY - 6) setHidden(false)
        lastY = y
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [pathname])

  if (HIDDEN_PREFIXES.some(p => pathname?.startsWith(p))) return null

  // Retour haptique léger au changement d'onglet (Android WebView)
  const go = (href: string) => {
    try { navigator.vibrate?.(8) } catch {}
    router.push(href)
  }

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
    { href: '/map',        label: t('nav.tabMap'),      Icon: Map,          match: (p: string) => p.startsWith('/map'), center: true },
    { href: bookingsHref,  label: t('nav.tabBookings'), Icon: CalendarDays, match: (p: string) => p.startsWith('/mon-espace/reservations') || p.startsWith('/artisan-dashboard/planning') },
    { href: profileHref,   label: t('nav.tabProfile'),  Icon: User,         match: (p: string) => p === '/mon-espace' || p === '/artisan-dashboard' || p.startsWith('/admin') || p.startsWith('/compte') || p.startsWith('/parametres'), badge: notifCount },
  ] as Array<{ href: string; label: string; Icon: any; match: (p: string) => boolean; center?: boolean; badge?: number }>

  return (
    <>
      {/* Espace réservé dans le flux pour ne pas masquer le bas des pages */}
      <div className="mobile-only" style={{ height: 'calc(92px + env(safe-area-inset-bottom))' }}/>

      <nav className="mobile-only" style={{
        position: 'fixed', left: 12, right: 12,
        bottom: 'calc(12px + env(safe-area-inset-bottom))',
        zIndex: 250, height: 64, borderRadius: 32,
        display: 'flex', alignItems: 'stretch',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--hover-shadow-lg)',
        direction: isAr ? 'rtl' : 'ltr',
        transform: hidden ? 'translateY(calc(100% + 28px))' : 'translateY(0)',
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : 'auto',
        transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease',
      }}>
        {TABS.map(({ href, label, Icon, match, center, badge }) => {
          const active = match(pathname || '')

          // ── Bouton central (Carte) : cercle dégradé surélevé ──
          if (center) {
            return (
              <div key={label} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                <button onClick={() => go(href)} aria-label={label} style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'var(--gradient)',
                  border: '4px solid var(--bg)',
                  transform: 'translateY(-20px)',
                  boxShadow: active
                    ? '0 10px 30px rgba(90, 61, 240,0.55), 0 0 0 2px rgba(90, 61, 240,0.35)'
                    : '0 10px 26px rgba(90, 61, 240,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0, flexShrink: 0,
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'box-shadow 0.25s ease, transform 0.15s ease',
                }}>
                  <Icon size={24} color="#fff" strokeWidth={2}/>
                </button>
              </div>
            )
          }

          // ── Onglets standards : pilule animée derrière l'icône ──
          return (
            <button key={label} onClick={() => go(href)} className="press" style={{
              position: 'relative',
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
              color: active ? 'var(--accent)' : 'var(--tx3)',
              WebkitTapHighlightColor: 'transparent',
            }}>
              {/* Indicateur actif : barre lumineuse en haut de l'onglet */}
              <div style={{
                position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
                width: active ? 18 : 0, height: 3, borderRadius: 2,
                background: 'var(--accent)', boxShadow: active ? '0 0 8px var(--accent)' : 'none',
                opacity: active ? 1 : 0,
                transition: 'width 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
              }}/>
              <div style={{
                position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 42, height: 27, borderRadius: 14,
                background: active ? 'rgba(90, 61, 240,0.14)' : 'transparent',
                transform: active ? 'scale(1) translateY(-2px)' : 'scale(0.92)',
                transition: 'background 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              }}>
                <Icon size={21} strokeWidth={active ? 2.4 : 1.8}/>
                {!!badge && badge > 0 && (
                  <div style={{ position: 'absolute', top: -4, insetInlineEnd: 0, minWidth: 15, height: 15, padding: '0 3px', borderRadius: 8, background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#fff', boxShadow: '0 2px 6px rgba(239,68,68,0.5)' }}>
                    {badge > 9 ? '9+' : badge}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 9.5, fontWeight: active ? 800 : 300, fontFamily: 'Nexa, sans-serif', letterSpacing: '0.02em' }}>{label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
