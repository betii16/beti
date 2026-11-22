'use client'

// Pont avec l'appli mobile. L'appli Capacitor (dz.beti.app) charge ce site dans une
// vue web et garde son écran de lancement affiché tant que le site ne le masque pas
// (launchAutoHide: false dans capacitor.config.ts) : sans ce composant, elle resterait
// bloquée dessus. Dans un navigateur, window.Capacitor n'existe pas : rien n'est chargé.

import { useEffect } from 'react'

type Native = { isNativePlatform?: () => boolean; getPlatform?: () => string }

// Une capacité absente d'un téléphone ne doit pas empêcher les autres : chaque échec est consigné, pas propagé.
const logged = (what: string) => (error: unknown) => console.error(`[beti] appli mobile, ${what}`, error)

export function NativeBridge() {
  useEffect(() => {
    const native = (window as { Capacitor?: Native }).Capacitor
    if (!native?.isNativePlatform?.()) return
    let stopBack: (() => void) | undefined
    let cancelled = false

    // L'écran de lancement d'abord, seul : rien ne doit pouvoir le retenir.
    import('@capacitor/splash-screen').then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 200 })).catch(logged('écran de lancement'))

    // Le site est blanc : heure et batterie en foncé.
    import('@capacitor/status-bar')
      .then(async ({ StatusBar, Style }) => {
        await StatusBar.setStyle({ style: Style.Light })
        if (native.getPlatform?.() === 'android') await StatusBar.setBackgroundColor({ color: '#ffffff' })
      })
      .catch(logged('barre de statut'))

    // Bouton retour d'Android : page précédente, et on ne quitte l'appli que s'il n'y en a plus.
    import('@capacitor/app')
      .then(async ({ App }) => {
        const listener = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) window.history.back()
          else App.exitApp().catch(logged('fermeture'))
        })
        if (cancelled) void listener.remove()
        else stopBack = () => void listener.remove()
      })
      .catch(logged('bouton retour'))

    return () => {
      cancelled = true
      stopBack?.()
    }
  }, [])
  return null
}
