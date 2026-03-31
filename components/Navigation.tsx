'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'

export default function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const { lang, setLang, t, isAr } = useLang()
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<'client' | 'artisan' | 'admin' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    let alive = true
    let notifChannel: ReturnType<typeof supabase.channel> | null = null

    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)

    const initAuth = async () => {
      const { data } = await supabase.auth.getUser()
      if (!alive || !data.user) return
      setUser(data.user)
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      if (!alive) return
      if (profile) setRole(profile.role)
      const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', data.user.id).eq('is_read', false)
      setNotifCount(count || 0)
      notifChannel = supabase.channel(`nav-notif-${data.user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${data.user.id}` }, () => setNotifCount(p => p + 1))
        .subscribe()
    }
    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user) {
        setUser(session.user)
        const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
        if (p) setRole(p.role)
      } else { setUser(null); setRole(null); setNotifCount(0) }
    })

    return () => {
      alive = false
      window.removeEventListener('scroll', onScroll)
      subscription.unsubscribe()
      if (notifChannel) supabase.removeChannel(notifChannel)
    }
  }, [])

  const getDashboardLink = () => role === 'artisan' ? '/artisan-dashboard' : role === 'admin' ? '/admin' : '/mon-espace'
  const roleIcon = role === 'artisan' ? '🔧' : role === 'admin' ? '⚙' : '👤'

  const LINKS = [
    { href: '/#services',  label: t('nav.services')   },
    { href: '/#artisans',  label: t('nav.artisans')   },
    { href: '/map',        label: t('nav.map'), gold: true },
    { href: '/#comment',   label: t('nav.howItWorks') },
  ]

  // Sélecteur de langue inline
  function LangToggle() {
    return (
      <div style={{ display: 'flex', gap: 4 }}>
        {(['fr', 'ar'] as const).map(l => (
          <button key={l} onClick={() => setLang(l)}
            style={{ padding: '3px 10px', borderRadius: 6, border: 'none', background: lang === l ? '#C9A84C' : '#2a2a3a', color: lang === l ? '#0D0D12' : '#555', fontSize: 11, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Nexa, sans-serif' }}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    )
  }

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: 52, padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(9,9,15,0.97)' : 'transparent',
        borderBottom: scrolled ? '0.5px solid #1e1e2a' : 'none',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        transition: 'all 0.3s ease',
        direction: isAr ? 'rtl' : 'ltr',
      }}>

        {/* Logo */}
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, background: '#C9A84C', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#0D0D12' }}>B</div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#F0EDE8', letterSpacing: '0.1em', fontFamily: 'Nexa, sans-serif' }}>BETI</span>
        </a>

        {/* Liens */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {LINKS.map(l => (
            <a key={l.href} href={l.href} style={{ fontSize: 12, fontWeight: 300, fontFamily: 'Nexa, sans-serif', color: l.gold ? '#C9A84C' : '#555', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.target as HTMLElement).style.color = l.gold ? '#d4b55a' : '#F0EDE8'}
              onMouseLeave={e => (e.target as HTMLElement).style.color = l.gold ? '#C9A84C' : '#555'}
            >{l.label}</a>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Sélecteur langue toujours visible */}
          <LangToggle/>

          {user ? (
            <>
              {/* Notifs */}
              {notifCount > 0 && (
                <a href={getDashboardLink()} style={{ textDecoration: 'none', position: 'relative', display: 'flex' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#161620', border: '0.5px solid #2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    <div style={{ position: 'absolute', top: -3, right: -3, width: 15, height: 15, borderRadius: '50%', background: '#C9A84C', border: '2px solid #0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#0D0D12' }}>{notifCount > 9 ? '9+' : notifCount}</div>
                  </div>
                </a>
              )}

              {/* Avatar menu */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 4px', borderRadius: 40, background: '#161620', border: '0.5px solid #2a2a3a', cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#C9A84C44')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
                >
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#C9A84C22', border: '1.5px solid #C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#C9A84C' }}>{(user.email || 'U')[0].toUpperCase()}</div>
                  <span style={{ fontSize: 11, color: '#888', fontWeight: 300 }}>{roleIcon} {role || 'Client'}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6"/></svg>
                </button>

                {menuOpen && (
                  <div style={{ position: 'absolute', top: 42, right: isAr ? 'auto' : 0, left: isAr ? 0 : 'auto', background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, overflow: 'hidden', minWidth: 220, zIndex: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                    onMouseLeave={() => setMenuOpen(false)}>

                    {/* Infos */}
                    <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #2a2a3a', background: '#0D0D12' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#F0EDE8', marginBottom: 2 }}>{user.email}</div>
                      <div style={{ fontSize: 10, color: '#555', fontWeight: 300 }}>
                        {role === 'artisan' ? t('nav.artisanAcc') : role === 'admin' ? t('nav.adminAcc') : t('nav.clientAcc')}
                      </div>
                    </div>

                    {/* Liens artisan */}
                    {role === 'artisan' && [
                      { href: '/artisan-dashboard', label: t('nav.dashboard') },
                      { href: '/map',               label: t('nav.mapArtisans') },
                    ].map(item => (
                      <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
                        <div style={{ padding: '10px 14px', cursor: 'pointer', transition: 'background 0.15s', fontSize: 12, color: '#F0EDE8', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#1e1e2a')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >{item.label}</div>
                      </a>
                    ))}

                    {/* Liens client */}
                    {(role === 'client' || role === null) && [
                      { href: '/mon-espace', label: t('nav.mySpace')    },
                      { href: '/mon-espace', label: t('nav.myBookings') },
                      { href: '/map',        label: t('nav.mapArtisans')},
                    ].map(item => (
                      <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
                        <div style={{ padding: '10px 14px', cursor: 'pointer', transition: 'background 0.15s', fontSize: 12, color: '#F0EDE8', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#1e1e2a')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >{item.label}</div>
                      </a>
                    ))}

                    {/* Préférences */}
                    {(role === 'client' || role === null) && (
                      <>
                        <div style={{ height: '0.5px', background: '#2a2a3a' }}/>
                        <div style={{ padding: '8px 14px 4px', fontSize: 10, color: '#444', fontWeight: 800, letterSpacing: '0.08em' }}>{t('nav.preferences')}</div>
                        <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, color: '#F0EDE8', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>{t('nav.language')}</span>
                          <LangToggle/>
                        </div>
                        <div style={{ height: '0.5px', background: '#2a2a3a' }}/>
                        <div style={{ padding: '8px 14px 4px', fontSize: 10, color: '#444', fontWeight: 800, letterSpacing: '0.08em' }}>{t('nav.account')}</div>
                        {[
                          { href: '/parametres', label: t('nav.settings') },
                          { href: '/aide',       label: t('nav.help')     },
                        ].map(item => (
                          <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
                            <div style={{ padding: '10px 14px', cursor: 'pointer', transition: 'background 0.15s', fontSize: 12, color: '#F0EDE8', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#1e1e2a')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >{item.label}</div>
                          </a>
                        ))}
                      </>
                    )}

                    <div style={{ height: '0.5px', background: '#2a2a3a' }}/>
                    <div onClick={async () => { await supabase.auth.signOut(); router.push('/') }} style={{ padding: '10px 14px', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1a0a0a')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ fontSize: 12, color: '#f87171', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>{t('nav.logout')}</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <a href="/auth/login">
                <button style={{ padding: '6px 14px', borderRadius: 7, background: 'transparent', border: '0.5px solid #2a2a3a', color: '#888', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300, transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#C9A84C'; (e.target as HTMLElement).style.color = '#C9A84C' }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#2a2a3a'; (e.target as HTMLElement).style.color = '#888' }}
                >{t('nav.login')}</button>
              </a>
              <a href="/auth/signup">
                <button style={{ padding: '6px 14px', borderRadius: 7, background: '#C9A84C', border: 'none', color: '#0D0D12', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s' }}
                  onMouseEnter={e => (e.target as HTMLElement).style.background = '#d4b55a'}
                  onMouseLeave={e => (e.target as HTMLElement).style.background = '#C9A84C'}
                >{t('nav.signup')}</button>
              </a>
            </>
          )}
        </div>
      </nav>

      {menuOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setMenuOpen(false)}/>}
    </>
  )
}
