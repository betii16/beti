'use client'

// components/Navigation.tsx
// Navigation globale BETI — rôle client/artisan + liens carte

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<'client' | 'artisan' | 'admin' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)

    // Auth
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser(data.user)
        // Récupérer le rôle
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()
        if (profile) setRole(profile.role)

        // Notifications non lues
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', data.user.id)
          .eq('is_read', false)
        setNotifCount(count || 0)

        // Écoute temps réel des notifs
        supabase
          .channel(`notifs-${data.user.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${data.user.id}` },
            () => setNotifCount(prev => prev + 1)
          )
          .subscribe()
      }
    })

    // Auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user) {
        setUser(session.user)
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
        if (profile) setRole(profile.role)
      } else {
        setUser(null)
        setRole(null)
        setNotifCount(0)
      }
    })

    return () => {
      window.removeEventListener('scroll', onScroll)
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const getDashboardLink = () => {
    if (role === 'artisan') return '/artisan-dashboard'
    if (role === 'admin') return '/admin'
    return '/mon-espace'
  }

  const getDashboardLabel = () => {
    if (role === 'artisan') return 'Mon dashboard'
    if (role === 'admin') return 'Admin'
    return 'Mon espace'
  }

  const isActive = (path: string) => pathname === path

  const navLinks = [
    { href: '/#services', label: 'Services' },
    { href: '/#artisans', label: 'Artisans' },
    { href: '/map', label: '🗺 Carte' },
    { href: '/#comment', label: 'Comment ça marche' },
  ]

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: 64, padding: '0 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'all 0.3s ease',
        background: scrolled ? 'rgba(9,9,15,0.97)' : 'transparent',
        borderBottom: scrolled ? '0.5px solid #1e1e2a' : 'none',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
      }}>
        {/* Logo */}
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: '#C9A84C', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#0D0D12' }}>B</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#F0EDE8', letterSpacing: '0.1em', fontFamily: 'Nexa, sans-serif' }}>BETI</span>
        </a>

        {/* Liens nav */}
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          {navLinks.map(link => (
            <a key={link.href} href={link.href} style={{
              fontSize: 13, fontWeight: 300, fontFamily: 'Nexa, sans-serif',
              color: link.href === '/map' ? '#C9A84C' : isActive(link.href) ? '#F0EDE8' : '#555',
              textDecoration: 'none', transition: 'color 0.2s',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
              onMouseEnter={e => (e.target as HTMLElement).style.color = link.href === '/map' ? '#d4b55a' : '#F0EDE8'}
              onMouseLeave={e => (e.target as HTMLElement).style.color = link.href === '/map' ? '#C9A84C' : isActive(link.href) ? '#F0EDE8' : '#555'}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user ? (
            <>
              {/* Badge notifications */}
              {notifCount > 0 && (
                <a href={getDashboardLink()} style={{ textDecoration: 'none', position: 'relative' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: '#161620', border: '0.5px solid #2a2a3a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', position: 'relative',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#C9A84C', border: '2px solid #0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#0D0D12' }}>
                      {notifCount > 9 ? '9+' : notifCount}
                    </div>
                  </div>
                </a>
              )}

              {/* Avatar + menu */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 12px 6px 6px', borderRadius: 40,
                    background: '#161620', border: '0.5px solid #2a2a3a',
                    cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#C9A84C44')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
                >
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#C9A84C22', border: '1.5px solid #C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#C9A84C' }}>
                    {(user.email || 'U')[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize: 12, color: '#888', fontWeight: 300 }}>
                    {role === 'artisan' ? '🔧' : role === 'admin' ? '⚙' : '👤'} {role || 'Client'}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" style={{ transform: menuOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>

                {/* Dropdown menu */}
                {menuOpen && (
                  <div style={{
                    position: 'absolute', top: 48, right: 0,
                    background: '#161620', border: '0.5px solid #2a2a3a',
                    borderRadius: 14, overflow: 'hidden', minWidth: 200, zIndex: 300,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  }}
                    onMouseLeave={() => setMenuOpen(false)}
                  >
                    {/* Infos utilisateur */}
                    <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #2a2a3a', background: '#0D0D12' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#F0EDE8', marginBottom: 2 }}>
                        {user.email}
                      </div>
                      <div style={{ fontSize: 11, color: '#555', fontWeight: 300, letterSpacing: '0.05em' }}>
                        {role === 'artisan' ? 'COMPTE ARTISAN' : role === 'admin' ? 'ADMINISTRATEUR' : 'COMPTE CLIENT'}
                      </div>
                    </div>

                    {/* Liens */}
                    {[
                      { href: getDashboardLink(), icon: '📋', label: getDashboardLabel() },
                      { href: '/map', icon: '🗺', label: 'Carte des artisans' },
                      ...(role === 'artisan' ? [{ href: '/artisan-dashboard', icon: '⚙', label: 'Mes missions' }] : []),
                      ...(role === 'admin' ? [{ href: '/admin', icon: '🛠', label: 'Administration' }] : []),
                    ].map(item => (
                      <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
                        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#1e1e2a')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span style={{ fontSize: 15 }}>{item.icon}</span>
                          <span style={{ fontSize: 13, color: '#F0EDE8', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>{item.label}</span>
                        </div>
                      </a>
                    ))}

                    <div style={{ height: '0.5px', background: '#2a2a3a' }}/>

                    {/* Déconnexion */}
                    <div onClick={handleSignOut} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1a0a0a')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ fontSize: 15 }}>🚪</span>
                      <span style={{ fontSize: 13, color: '#f87171', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>Déconnexion</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <a href="/auth/login">
                <button style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', border: '0.5px solid #2a2a3a', color: '#888', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300, transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#C9A84C'; (e.target as HTMLElement).style.color = '#C9A84C' }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#2a2a3a'; (e.target as HTMLElement).style.color = '#888' }}
                >Se connecter</button>
              </a>
              <a href="/auth/signup">
                <button style={{ padding: '8px 18px', borderRadius: 8, background: '#C9A84C', border: 'none', color: '#0D0D12', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.background = '#d4b55a'; (e.target as HTMLElement).style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background = '#C9A84C'; (e.target as HTMLElement).style.transform = 'translateY(0)' }}
                >Commencer</button>
              </a>
            </>
          )}
        </div>
      </nav>

      {/* Overlay pour fermer le menu */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setMenuOpen(false)}/>
      )}
    </>
  )
}
