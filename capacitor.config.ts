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
}

export default config
