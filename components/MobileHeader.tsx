'use client'

// components/MobileHeader.tsx
// Header mobile contextuel (< 768px) — remplace la navbar « site web ».
// Accueil : wordmark + langue/thème/cloche. Écrans racines : titre + cloche.
// Sous-écrans : flèche retour + titre. Caché sur carte (immersive), auth, chat.

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft, Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { LogoMark } from '@/components/Logo'

// '/artisan/' (avec slash) cible la fiche artisan SANS toucher /artisan-dashboard.
// La fiche dessine son propre header app (retour + nom de l'artisan).
const HIDDEN = ['/auth', '/chat', '/onboarding', '/map', '/artisan/', '/suivi']
const ROOTS = ['/', '/recherche', '/mon-espace', '/mon-espace/reservations', '/artisan-dashboard', '/artisan-dashboard/planning', '/admin']

export default function MobileHeader() {
  const pathname = usePathname() || '/'
  const router = useRouter()
  const { lang, setLang, t, isAr } = useLang()
  const [logged, setLogged] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const s = localStorage.getItem('beti-theme')
    if (s === 'light') setDark(false)
  }, [])

  useEffect(() => {
    let alive = true
    let channel: ReturnType<typeof supabase.channel> | null = null
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!alive || !data.user) return
      setLogged(true)
      const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', data.user.id).eq('is_read', false)
      if (alive) setNotifCount(count || 0)
      channel = supabase.channel(`mh-notif-${data.user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${data.user.id}` }, () => setNotifCount(p => p + 1))
        .subscribe()
    }
    init()
    return () => { alive = false; if (channel) supabase.removeChannel(channel) }
  }, [pathname])

  if (HIDDEN.some(p => pathname.startsWith(p))) return null

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('beti-theme', next ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
  }

  // Titre contextuel (préfixe le plus long d'abord)
  const TITLES: Array<[string, string]> = [
    ['/mon-espace/reservations',    t('nav.myBookings')],
    ['/artisan-dashboard/planning', t('nav.tabBookings')],
    ['/artisan-dashboard',          t('mhome.dashboard')],
    ['/mon-espace',                 t('nav.mySpace')],
    ['/recherche',                  t('nav.tabSearch')],
    ['/notifications',              t('mhome.notifTitle')],
    ['/parametres',                 t('nav.settings')],
    ['/compte',                     t('nav.settings')],
    ['/aide',                       t('nav.help')],
    ['/admin',                      'Admin'],
  ]
  const isHome = pathname === '/'
  const isRoot = ROOTS.includes(pathname)
  const title = TITLES.find(([p]) => pathname.startsWith(p))?.[1] || ''

  const iconBtn: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 12, background: 'var(--bg2)',
    border: '1px solid var(--border)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, flexShrink: 0, WebkitTapHighlightColor: 'transparent',
  }

  return (
    <header className="mobile-only" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      height: 'calc(54px + env(safe-area-inset-top))',
      paddingTop: 'env(safe-area-inset-top)',
      paddingLeft: 14, paddingRight: 14,
      alignItems: 'center', justifyContent: 'space-between', gap: 10,
      background: 'var(--nav-bg)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderBottom: '0.5px solid var(--border)',
      direction: isAr ? 'rtl' : 'ltr',
    }}>

      {/* ── Zone gauche ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        {isHome ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LogoMark size={26} />
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', letterSpacing: '0.1em', fontFamily: 'Nexa,sans-serif' }}>BETI</span>
          </div>
        ) : (
          <>
            {!isRoot && (
              <button onClick={() => router.back()} aria-label={t('common.back')} style={iconBtn}>
                <ChevronLeft size={19} color="var(--tx)" strokeWidth={2.2} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }}/>
              </button>
            )}
            <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.01em', fontFamily: 'Nexa,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title || 'BETI'}
            </span>
          </>
        )}
      </div>

      {/* ── Zone droite ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {isHome && (
          <>
            {/* Langue */}
            <button onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')} style={{ ...iconBtn, width: 'auto', padding: '0 11px', fontSize: 11, fontWeight: 800, color: 'var(--tx2)', fontFamily: 'Nexa,sans-serif' }}>
              {lang === 'fr' ? 'AR' : 'FR'}
            </button>
            {/* Thème */}
            <button onClick={toggleTheme} style={{ ...iconBtn, fontSize: 14, color: 'var(--tx)' }}>
              {dark ? '☀' : '☾'}
            </button>
          </>
        )}

        {logged ? (
          <button onClick={() => router.push('/notifications')} aria-label={t('mhome.notifTitle')} style={{ ...iconBtn, position: 'relative' }}>
            <Bell size={16} color="var(--tx)" strokeWidth={2}/>
            {notifCount > 0 && (
              <div style={{ position: 'absolute', top: 4, insetInlineEnd: 4, minWidth: 14, height: 14, padding: '0 3px', borderRadius: 7, background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#fff' }}>
                {notifCount > 9 ? '9+' : notifCount}
              </div>
            )}
          </button>
        ) : isHome && (
          <button onClick={() => router.push('/auth/login')} style={{ padding: '8px 15px', borderRadius: 12, background: 'var(--gradient)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa,sans-serif', whiteSpace: 'nowrap' }}>
            {t('nav.login')}
          </button>
        )}
      </div>
    </header>
  )
}
