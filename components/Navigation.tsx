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
  const [dark, setDark] = useState(true)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('beti-theme')
    if (saved === 'light') setDark(false)
  }, [])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('beti-theme', next ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
  }

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
    return () => {
      alive = false
      window.removeEventListener('scroll', onScroll)
      if (notifChannel) supabase.removeChannel(notifChannel)
    }
  }, [])

  const getDashboardLink = () => role === 'artisan' ? '/artisan-dashboard' : role === 'admin' ? '/admin' : '/mon-espace'

  const LINKS = [
    { href: '/#services',  label: t('nav.services') },
    { href: '/#artisans',  label: t('nav.artisans') },
    { href: '/map',        label: t('nav.map'), gold: true },
    { href: '/#comment',   label: t('nav.howItWorks') },
  ]

  // Nav transparente seulement sur l'accueil (par-dessus le hero) ;
  // opaque partout ailleurs et dès qu'on scrolle (sinon illisible, ex. sur la carte).
  const solid = scrolled || pathname !== '/'

  function LangToggle() {
    return (
      <div style={{ display: 'flex', gap: 3 }}>
        {(['fr', 'ar'] as const).map(l => (
          <button key={l} onClick={() => setLang(l)}
            style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: lang === l ? 'var(--accent, #6366f1)' : 'var(--border, #2a2a3a)', color: lang === l ? '#fff' : 'var(--tx3, #555)', fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Nexa, sans-serif' }}>
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
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
        background: solid ? 'var(--nav-bg)' : 'transparent',
        borderBottom: solid ? '0.5px solid var(--border)' : '0.5px solid transparent',
        backdropFilter: solid ? 'blur(20px) saturate(180%)' : 'none',
        WebkitBackdropFilter: solid ? 'blur(20px) saturate(180%)' : 'none',
        transition: 'all 0.3s ease',
        direction: isAr ? 'rtl' : 'ltr',
      }}>

        {/* Logo */}
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, justifySelf: 'start' }}>
          <div style={{ width: 28, height: 28, background: 'var(--gradient, linear-gradient(135deg,#6366f1,#8b5cf6))', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>B</div>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', letterSpacing: '0.1em', fontFamily: 'Nexa, sans-serif' }}>BETI</span>
        </a>

        {/* Liens */}
        <div style={{ display: 'flex', gap: 30, alignItems: 'center', justifySelf: 'center' }}>
          {LINKS.map(l => {
            const active = l.href === pathname
            const base = l.gold ? 'var(--accent, #6366f1)' : 'var(--tx2)'
            return (
              <a key={l.href} href={l.href}
                className={`nav-link${active ? ' nav-link-active' : ''}`}
                onClick={e => {
                  if (l.href.startsWith('/#')) {
                    const id = l.href.replace('/#', '')
                    const el = document.getElementById(id)
                    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
                  }
                }}
                style={{ fontSize: 13, fontWeight: 500, fontFamily: 'Nexa, sans-serif', color: base, textDecoration: 'none', transition: 'color 0.2s', letterSpacing: '0.01em' }}
                onMouseEnter={e => (e.currentTarget.style.color = l.gold ? 'var(--accent, #6366f1)' : 'var(--tx)')}
                onMouseLeave={e => (e.currentTarget.style.color = base)}
              >{l.label}</a>
            )
          })}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifySelf: 'end' }}>
          <LangToggle/>

          {/* Theme toggle */}
          <button onClick={toggleTheme} title={dark ? 'Mode clair' : 'Mode sombre'}
            style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--border)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, transition: 'all 0.2s', color: 'var(--tx)' }}>
            {dark ? '☀' : '☾'}
          </button>

          {user ? (
            <>
              <a href={getDashboardLink()} style={{ textDecoration: 'none', position: 'relative', display: 'flex' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--border)', border: '0.5px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #6366f1)" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  {notifCount > 0 && (
                    <div style={{ position: 'absolute', top: -3, right: -3, width: 15, height: 15, borderRadius: '50%', background: 'var(--accent, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#fff' }}>{notifCount > 9 ? '9+' : notifCount}</div>
                  )}
                </div>
              </a>

              <div style={{ position: 'relative' }}>
                <button onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 4px', borderRadius: 40, background: 'var(--border)', border: '0.5px solid var(--border2)', cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'border-color 0.2s' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent, #6366f1)22', border: '1.5px solid var(--accent, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'var(--accent, #6366f1)' }}>{(user.email || 'U')[0].toUpperCase()}</div>
                  <span style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 300 }}>{role || 'Client'}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth="2" style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6"/></svg>
                </button>

                {menuOpen && (
                  <div style={{ position: 'absolute', top: 42, right: isAr ? 'auto' : 0, left: isAr ? 0 : 'auto', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', minWidth: 220, zIndex: 300, boxShadow: 'var(--card-shadow)' }}
                    onMouseLeave={() => setMenuOpen(false)}>

                    <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg)' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--tx)', marginBottom: 2 }}>{user.email}</div>
                      <div style={{ fontSize: 10, color: 'var(--accent, #6366f1)', fontWeight: 700, letterSpacing: '0.06em' }}>
                        {role === 'artisan' ? t('nav.artisanAcc') : role === 'admin' ? t('nav.adminAcc') : t('nav.clientAcc')}
                      </div>
                    </div>

                    {role === 'artisan' && [
                      { href: '/artisan-dashboard', label: 'Mon dashboard' },
                      { href: '/artisan-dashboard/profil', label: 'Mon profil' },
                      { href: '/artisan-dashboard/planning', label: 'Planning' },
                      { href: '/artisan-dashboard/revenus', label: 'Revenus' },
                      { href: '/map', label: t('nav.mapArtisans') },
                    ].map(item => (
                      <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
                        <div style={{ padding: '10px 14px', cursor: 'pointer', transition: 'background 0.15s', fontSize: 12, color: 'var(--tx)', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >{item.label}</div>
                      </a>
                    ))}

                    {(role === 'client' || role === null) && [
                      { href: '/mon-espace', label: t('nav.mySpace') },
                      { href: '/mon-espace/reservations', label: t('nav.myBookings') },
                      { href: '/map', label: t('nav.mapArtisans') },
                    ].map(item => (
                      <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
                        <div style={{ padding: '10px 14px', cursor: 'pointer', transition: 'background 0.15s', fontSize: 12, color: 'var(--tx)', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >{item.label}</div>
                      </a>
                    ))}

                    <div style={{ height: '0.5px', background: 'var(--border)' }}/>
                    {[
                      { href: '/parametres', label: t('nav.settings') },
                      { href: '/aide', label: t('nav.help') },
                    ].map(item => (
                      <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
                        <div style={{ padding: '10px 14px', cursor: 'pointer', transition: 'background 0.15s', fontSize: 12, color: 'var(--tx2)', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >{item.label}</div>
                      </a>
                    ))}

                    <div style={{ height: '0.5px', background: 'var(--border)' }}/>
                    <div onClick={async () => { await supabase.auth.signOut(); router.push('/'); router.refresh() }} style={{ padding: '10px 14px', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <span style={{ fontSize: 12, color: '#ef4444', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>{t('nav.logout')}</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <a href="/auth/login">
                <button style={{ padding: '6px 14px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--tx2)', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300, transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent, #6366f1)'; e.currentTarget.style.color = 'var(--accent, #6366f1)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--tx2)' }}
                >{t('nav.login')}</button>
              </a>
              <a href="/auth/signup">
                <button style={{ padding: '6px 14px', borderRadius: 8, background: 'var(--gradient, linear-gradient(135deg,#6366f1,#8b5cf6))', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s', boxShadow: '0 2px 8px #6366f122' }}>{t('nav.signup')}</button>
              </a>
            </>
          )}
        </div>
      </nav>

      {menuOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setMenuOpen(false)}/>}
    </>
  )
}
