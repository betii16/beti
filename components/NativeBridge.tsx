'use client'

// components/NativeBridge.tsx
// Pont entre le site (chargé dans la WebView Capacitor) et les capacités natives.
// Le site est servi à distance : ce composant détecte s'il tourne DANS l'app
// native et, si oui, branche les vrais réglages iOS/Android. Sur un navigateur
// web classique, tout est court-circuité (Capacitor.isNativePlatform() === false)
// — donc aucun effet, aucun coût, aucune régression sur le web.
//
// Ce qu'il apporte, et qui manque à tout simple « wrapper web » :
//  1. Bouton retour Android → revient en arrière dans l'app (au lieu de quitter).
//  2. Haptique RÉELLE sur iPhone (navigator.vibrate est ignoré par WKWebView).
//  3. Barre de statut qui suit le thème (icônes lisibles en clair comme en sombre).
//  4. Écran hors-ligne plein écran (FR/AR) avec bouton Réessayer.
//  5. Splash masqué dès que la page est prête (lancement plus net).
//  6. Clavier : le champ actif reste visible.
//  7. Liens externes (WhatsApp, cartes, sites) ouverts hors de la WebView.

import { useEffect, useRef, useState } from 'react'

export default function NativeBridge() {
  const [offline, setOffline] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ar, setAr] = useState(false)
  const checkRef = useRef<null | (() => Promise<boolean>)>(null)

  useEffect(() => {
    let cleanup: Array<() => void> = []
    try { setAr(localStorage.getItem('beti-lang') === 'ar') } catch {}
    let cancelled = false

    ;(async () => {
      const { Capacitor } = await import('@capacitor/core')
      if (!Capacitor.isNativePlatform()) return // navigateur web → on ne touche à rien

      const platform = Capacitor.getPlatform() // 'ios' | 'android'

      // ── 1. Splash : on le masque dès que le contenu distant est monté ──
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        const hide = () => { SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {}) }
        if (document.readyState === 'complete') requestAnimationFrame(hide)
        else window.addEventListener('load', () => requestAnimationFrame(hide), { once: true })
        setTimeout(hide, 4000) // filet de sécurité
      } catch {}

      // ── 2. Haptique native + monkey-patch de navigator.vibrate ──
      // Tous les appels existants `navigator.vibrate(n)` (barre d'onglets, etc.)
      // deviennent ainsi de vrais retours haptiques, y compris sur iPhone.
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
        let last = 0
        const impact = (ms = 10) => {
          const now = Date.now()
          if (now - last < 120) return // anti-spam
          last = now
          const style = ms >= 24 ? ImpactStyle.Medium : ImpactStyle.Light
          Haptics.impact({ style }).catch(() => {})
        }
        // Expose un helper global pour les actions importantes (réservation, succès…)
        ;(window as any).betiHaptic = impact
        // Actions clés (réservation, envoi de message…) : boutons de validation
        const onClick = (e: MouseEvent) => {
          const el = (e.target as Element | null)?.closest?.('button[type="submit"], .btn-primary, [data-haptic]')
          if (el && !(el as HTMLButtonElement).disabled) impact(24)
        }
        document.addEventListener('click', onClick, true)
        cleanup.push(() => document.removeEventListener('click', onClick, true))
        // Redirige l'API web vers le natif (sans casser le type de retour)
        try {
          const original = navigator.vibrate?.bind(navigator)
          ;(navigator as any).vibrate = (pattern: number | number[]) => {
            const ms = Array.isArray(pattern) ? pattern[0] : pattern
            impact(typeof ms === 'number' ? ms : 10)
            return true
          }
          cleanup.push(() => { if (original) (navigator as any).vibrate = original })
        } catch {}
      } catch {}

      // ── 3. Barre de statut synchronisée avec le thème ──
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        const apply = () => {
          const theme = document.documentElement.getAttribute('data-theme') || 'dark'
          // Style.Dark = contenu clair (sur fond sombre) ; Style.Light = contenu sombre.
          StatusBar.setStyle({ style: theme === 'light' ? Style.Light : Style.Dark }).catch(() => {})
          if (platform === 'android') {
            const bg = theme === 'light' ? '#F0ECE3' : '#0E1922'
            StatusBar.setBackgroundColor({ color: bg }).catch(() => {})
          }
        }
        apply()
        // Re-applique quand l'utilisateur bascule clair/sombre
        const mo = new MutationObserver(apply)
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
        cleanup.push(() => mo.disconnect())
      } catch {}

      // ── 4. Bouton retour matériel Android ──
      try {
        const { App } = await import('@capacitor/app')
        const handle = await App.addListener('backButton', ({ canGoBack }) => {
          const atRoot = window.location.pathname === '/' || window.location.pathname === ''
          if (!atRoot && (canGoBack || window.history.length > 1)) window.history.back()
          else App.exitApp() // quitte seulement à la racine
        })
        cleanup.push(() => handle.remove())
      } catch {}

      // ── 5. Réseau : écran hors-ligne ──
      try {
        const { Network } = await import('@capacitor/network')
        const status = await Network.getStatus()
        if (!cancelled) setOffline(!status.connected)
        const handle = await Network.addListener('networkStatusChange', (s) => {
          setOffline(!s.connected)
        })
        cleanup.push(() => handle.remove())
        checkRef.current = async () => {
          const st = await Network.getStatus()
          setOffline(!st.connected)
          return st.connected
        }
      } catch {}

      // ── 6. Clavier : le champ actif reste visible ──
      try {
        const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard')
        Keyboard.setResizeMode({ mode: KeyboardResize.Native }).catch(() => {})
        if (platform === 'ios') Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {})
        const reveal = () => {
          setTimeout(() => {
            const el = document.activeElement as HTMLElement | null
            if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) {
              el.scrollIntoView({ block: 'center', behavior: 'smooth' })
            }
          }, 120)
        }
        const h1 = await Keyboard.addListener('keyboardDidShow', reveal)
        cleanup.push(() => h1.remove())
      } catch {}

      // ── 7. Liens externes hors WebView ──
      // tel:, mailto:, geo:, liens http(s) vers un autre domaine : la navigation
      // native les confie à l'app système (téléphone, WhatsApp, Maps, navigateur).
      const isExternal = (href: string) => {
        if (/^(tel:|mailto:|sms:|geo:|whatsapp:|maps:|intent:)/i.test(href)) return true
        try {
          const u = new URL(href, window.location.href)
          return /^https?:$/.test(u.protocol) && u.origin !== window.location.origin
        } catch { return false }
      }
      const onLink = (e: MouseEvent) => {
        const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
        if (!a || e.defaultPrevented) return
        const href = a.getAttribute('href') || ''
        if (isExternal(href) && (a.target === '_blank' || /^(tel:|mailto:|sms:|geo:)/i.test(href))) {
          e.preventDefault()
          window.location.href = a.href
        }
      }
      document.addEventListener('click', onLink)
      cleanup.push(() => document.removeEventListener('click', onLink))
      const origOpen = window.open
      window.open = ((url?: string | URL, ...rest: any[]) => {
        const u = url ? String(url) : ''
        if (u && isExternal(u)) { window.location.href = u; return null }
        return (origOpen as any).call(window, url, ...rest)
      }) as typeof window.open
      cleanup.push(() => { window.open = origOpen })
    })()

    return () => {
      cancelled = true
      cleanup.forEach((fn) => { try { fn() } catch {} })
    }
  }, [])

  if (!offline) return null

  const retry = async () => {
    setBusy(true)
    let ok = navigator.onLine
    try { if (checkRef.current) ok = await checkRef.current() } catch {}
    setBusy(false)
    if (ok) window.location.reload()
  }

  return (
    <div
      role="alertdialog"
      dir={ar ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 14, padding: 24, textAlign: 'center',
        paddingTop: 'calc(24px + env(safe-area-inset-top))',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
        background: 'var(--bg)', color: 'var(--tx)',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.12em' }}>BETI</div>
      <p style={{ fontSize: 15, lineHeight: 1.6, maxWidth: 280, margin: 0 }}>
        {ar ? 'لا يوجد اتصال بالإنترنت. تحقق من الشبكة ثم أعد المحاولة.' : 'Pas de connexion internet. Vérifie ton réseau puis réessaie.'}
      </p>
      <button className="btn-primary" onClick={retry} disabled={busy} style={{ minWidth: 160 }}>
        {ar ? 'إعادة المحاولة' : 'Réessayer'}
      </button>
    </div>
  )
}
