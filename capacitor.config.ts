import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'dz.beti.app',
  appName: 'BETI',
  webDir: 'www',
  server: {
    // URL de production du site (projet Vercel « beti », domaine public beti-ten.vercel.app)
    url: 'https://beti-ten.vercel.app',
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0b0b12',
  },
  ios: {
    backgroundColor: '#0b0b12',
    contentInset: 'automatic',
  },
  plugins: {
    SplashScreen: {
      // Splash sombre BETI au lancement puis masqué automatiquement
      // (coquille distante : aucun JS local pour appeler hide()).
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0b0b12',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
}

export default config
