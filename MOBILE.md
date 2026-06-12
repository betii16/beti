# BETI — Application mobile (Capacitor)

L'app mobile est une coquille native (WebView) qui charge le site BETI déployé.
Une seule base de code : le site Next.js = l'app. Chaque mise à jour du site
est instantanément visible dans l'app, sans repasser par les stores.

## Architecture

```
capacitor.config.ts   → configuration (URL du site, couleurs, app ID)
www/index.html        → page de secours hors-ligne
android/              → projet Android natif (généré)
ios/                  → projet iOS natif (généré)
```

- **App ID** : `dz.beti.app`
- **Nom** : BETI
- **Permissions** : géolocalisation, caméra, photos (Android + iOS)

## Site déployé

L'app charge le site depuis internet : **https://beti-ten.vercel.app**
(projet Vercel `beti`, compte `betii16s-projects` — variables Supabase déjà configurées).

⚠️ `beti.vercel.app` (sans `-ten`) appartient à un autre projet, ne pas l'utiliser.

Pour mettre la production à jour après des changements :
```powershell
vercel --prod
```
L'app mobile affichera automatiquement la nouvelle version (c'est une WebView).

## Android

### Compiler l'APK (test)
```powershell
cd android
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew assembleDebug
```
APK généré : `android/app/build/outputs/apk/debug/app-debug.apk`
→ Envoie-le sur ton téléphone et installe-le directement.

### Ouvrir dans Android Studio
```powershell
npm run mobile:android
```

### Publier sur Google Play
1. Compte développeur Google Play (25 $ une seule fois) : [play.google.com/console](https://play.google.com/console)
2. Générer une clé de signature : Android Studio → Build → Generate Signed Bundle
3. Build un `.aab` (release) et l'uploader sur la console

## iOS

⚠️ **Nécessite un Mac** avec Xcode (impossible de compiler iOS sur Windows).

Sur un Mac :
```bash
npm install
npx cap sync ios
npx cap open ios
```
Puis dans Xcode : sélectionner ton équipe de développement → Build.

### Publier sur l'App Store
1. Compte Apple Developer (99 $/an) : [developer.apple.com](https://developer.apple.com)
2. Archive dans Xcode → Distribute App
3. Note : Apple peut être exigeant avec les apps WebView. Les permissions
   natives (géoloc, caméra) et le vrai service rendu jouent en notre faveur.

## Workflow quotidien

| Action | Commande |
|---|---|
| Modifier le site | rien à faire — l'app se met à jour toute seule |
| Changer la config Capacitor | `npm run mobile:sync` |
| Rebuilder l'APK | `cd android && .\gradlew assembleDebug` |
