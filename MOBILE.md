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

## Fonctions natives (components/NativeBridge.tsx)

Actives uniquement dans l'app (`Capacitor.isNativePlatform()`), sans effet sur le web :
bouton retour Android (historique, quitte à la racine `/`), barre d'état suivant
`data-theme`, splash masqué au chargement de la page (`launchAutoHide: false`),
haptique sur boutons de validation (anti-spam 120 ms), écran hors-ligne FR/AR avec
Réessayer, champ actif recentré à l'ouverture du clavier, liens `tel:`/`mailto:`/
`geo:`/domaines externes confiés à l'app système. Si le site est injoignable au
lancement, `server.errorPath` affiche `www/index.html`.

## Permissions déclarées (toutes utilisées)

- Android : INTERNET, ACCESS_FINE/COARSE_LOCATION (artisans proches), CAMERA et
  READ_MEDIA_IMAGES (photos profil, portfolio, avis). Camera/GPS en `required="false"`.
- iOS (Info.plist, en français) : NSLocationWhenInUse, NSCamera, NSPhotoLibrary.
  `ITSAppUsesNonExemptEncryption=false` évite la question export à chaque envoi.

## Android

### Compiler l'APK (test)
```powershell
npm install
npx cap sync android
cd android
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew assembleDebug
```
APK : `android/app/build/outputs/apk/debug/app-debug.apk` (à installer sur le téléphone).

### Publier sur Google Play
1. Compte développeur Google Play (25 $, une fois) : play.google.com/console
2. Créer un keystore, le sauvegarder hors dépôt (sa perte bloque les mises à jour).
3. `cd android && .\gradlew bundleRelease`, puis signer le `.aab`
   (Android Studio : Build > Generate Signed Bundle) et l'envoyer sur la console.
4. Fiche : politique de confidentialité (URL publique), formulaire « Sécurité des
   données », lien de suppression de compte (`/api/account/delete`), captures d'écran.
5. Augmenter `versionCode` dans `android/app/build.gradle` à chaque envoi.

## iOS

Nécessite un Mac avec Xcode (impossible sur Windows).
```bash
npm install
npx cap sync ios
npx cap open ios
```
Xcode : choisir l'équipe, définir version/build, Product > Archive > Distribute App.
Compte Apple Developer : 99 $/an. App Store Connect : confidentialité, suppression
de compte dans l'app, captures. Risque de rejet 4.2 (« simple site web ») : mettre
en avant géolocalisation, caméra, haptique, réservation et messagerie natives.

## Workflow quotidien

| Action | Commande |
|---|---|
| Modifier le site | `vercel --prod` ou push `main` : l'app se met à jour seule |
| Changer config/plugin Capacitor | `npm run mobile:sync` puis rebuild natif |
| Rebuilder l'APK | `cd android && .\gradlew assembleDebug` |
