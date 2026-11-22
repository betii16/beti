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
    // Page locale affichée si le site distant est injoignable
    errorPath: 'index.html',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0E1922',
  },
  ios: {
    backgroundColor: '#0E1922',
    contentInset: 'automatic',
  },
  plugins: {
    SplashScreen: {
      // Écran de lancement masqué par le site lui-même (src/components/native-bridge.tsx), ou par www/index.html en secours.
      launchShowDuration: 0,
      launchAutoHide: false, // masqué par native-bridge.tsx quand la page est chargée
      backgroundColor: '#0E1922',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
}

export default config
