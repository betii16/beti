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
//  4. Bandeau hors-ligne natif quand le réseau tombe.
//  5. Splash masqué dès que la page est prête (lancement plus net).

import { useEffect, useState } from 'react'

export default function NativeBridge() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    let cleanup: Array<() => void> = []
    let cancelled = false

    ;(async () => {
      const { Capacitor } = await import('@capacitor/core')
      if (!Capacitor.isNativePlatform()) return // navigateur web → on ne touche à rien

      const platform = Capacitor.getPlatform() // 'ios' | 'android'

      // ── 1. Splash : on le masque dès que le contenu distant est monté ──
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide()
      } catch {}

      // ── 2. Haptique native + monkey-patch de navigator.vibrate ──
      // Tous les appels existants `navigator.vibrate(n)` (barre d'onglets, etc.)
      // deviennent ainsi de vrais retours haptiques, y compris sur iPhone.
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
        const impact = (ms = 10) => {
          const style = ms >= 24 ? ImpactStyle.Medium : ImpactStyle.Light
          Haptics.impact({ style }).catch(() => {})
        }
        // Expose un helper global pour les actions importantes (réservation, succès…)
        ;(window as any).betiHaptic = impact
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
            const bg = theme === 'light' ? '#EEEDF4' : '#0b0b12'
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
          if (canGoBack || window.history.length > 1) window.history.back()
          else App.exitApp()
        })
        cleanup.push(() => handle.remove())
      } catch {}

      // ── 5. Réseau : bandeau hors-ligne ──
      try {
        const { Network } = await import('@capacitor/network')
        const status = await Network.getStatus()
        if (!cancelled) setOffline(!status.connected)
        const handle = await Network.addListener('networkStatusChange', (s) => {
          setOffline(!s.connected)
        })
        cleanup.push(() => handle.remove())
      } catch {}

      // ── 6. Clavier : redimensionnement natif propre (iOS) ──
      try {
        const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard')
        Keyboard.setResizeMode({ mode: KeyboardResize.Native }).catch(() => {})
        if (platform === 'ios') Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {})
      } catch {}
    })()

    return () => {
      cancelled = true
      cleanup.forEach((fn) => { try { fn() } catch {} })
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'calc(92px + env(safe-area-inset-bottom))',
        zIndex: 400,
        margin: '0 12px',
        padding: '10px 14px',
        borderRadius: 14,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: 700,
        color: '#fff',
        background: 'rgba(239,68,68,0.96)',
        boxShadow: '0 10px 30px rgba(239,68,68,0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      Pas de connexion — vérifie ton réseau
    </div>
  )
}
