# BETI — marketplace d'artisans (Algérie)

Site + app mobile pour trouver et réserver des artisans par wilaya. Interface en français et en arabe (RTL). Langue de travail avec le propriétaire : français.

## Stack
- Next.js 16 (App Router), React 18, TypeScript, Tailwind 3, MapLibre pour la carte.
- Supabase : auth par code OTP WhatsApp/SMS (téléphone), Postgres, realtime, storage.
- App mobile Capacitor (`dz.beti.app`) : `capacitor.config.ts` charge le site en ligne (`server.url`). Une route API ou un correctif web marche donc aussi dans l'app, sans republier sur les stores.
- Déploiement : Vercel (projet `beti`, dépôt GitHub `betii16/beti`, branche `main`).

## Commandes
- `npm run dev` / `npm run build` / `npm run lint` / `npx tsc --noEmit`
- Le build applique maintenant les erreurs de types et de lint (elles étaient masquées avant la mise à jour Next 16). Avant de pousser : `npx tsc --noEmit` puis `npx next build`.
- Dans un worktree git, Turbopack ne suit pas un lien vers `node_modules` : utiliser `--webpack`.

## Sécurité : à ne jamais oublier
- L'app est surtout client-side avec la clé anon Supabase. La session est dans `localStorage` (`beti-auth`), pas en cookies : un `proxy.ts` ou middleware ne verrait jamais l'utilisateur. Les redirections React (admin, dashboard) ne servent qu'à l'affichage.
- **La seule vraie barrière est le RLS Supabase.** Tout nouvel accès aux données passe par une policy.
- SQL à exécuter à la main dans le SQL Editor de Supabase, dans cet ordre : `rls_policies.sql` → `security_hardening.sql` → `privacy_hardening.sql`. Les autres fichiers de `supabase/` sont des schémas par fonctionnalité. Ne jamais supposer qu'un fichier SQL du dépôt a été exécuté en production.
- Vie privée : le téléphone vit dans `profile_private` (lecture via `lib/phones.ts`, jamais `profiles.phone`). La position GPS exacte vit dans `artisan_live_location`; `artisans.lat/lng` est arrondi à ~1 km. Le code tolère l'absence de ces tables, donc ne pas l'en croire protégé.
- Suppression de compte réelle : `app/api/account/delete/route.ts` (exigence App Store / Google Play). Utilise la clé service (`lib/supabaseAdmin.ts`), jamais côté client.

## Gestion des erreurs
- Jamais de `catch {}` vide ni d'erreur Supabase ignorée (`const { data } = await …` sans lire `error`) sur un chemin critique (réservation, chat, abonnement, suppression de compte, photos, OTP).
- Utiliser `logError(scope, error, context?)` de `lib/logError.ts` : console structurée, clés sensibles (phone, token, email, password, authorization…) filtrées, anti-doublon et limite de débit, envoi best-effort vers `NEXT_PUBLIC_ERROR_ENDPOINT` si défini. Ne jamais passer de donnée personnelle en contexte.
- Si l'échec compte pour l'utilisateur : journaliser ET afficher un message clair avec réessai (textes `cxe.` / `cxb.` dans `lib/translations.ts`). Si l'échec est ignorable (ex. table absente avant `privacy_hardening.sql`) : commentaire d'une ligne qui dit pourquoi.
- Brancher Sentry / Better Stack plus tard : un seul appel `setErrorSink((evt, original) => …)` au démarrage, sans retoucher les appels.

## Design et i18n
- Identité « Chaux & Zellige » : variables CSS et classes dans `app/globals.css` (`var(--tx)`, `var(--accent)`, `.btn-primary`, `.field`…). Pas de violet, pas de verre, pas de dégradés de texte.
- Thème et langue : clés `localStorage` `beti-theme` et `beti-lang`; textes dans `lib/translations.ts`, contexte dans `lib/LangContext.tsx`.
- RTL : utiliser les propriétés logiques (`marginInlineStart`, `insetInlineEnd`, `textAlign: 'start'`), jamais `left`/`right` sauf cartes, sliders et champs téléphone en `dir="ltr"`.
- Pages légales (`components/LegalPage.tsx`) et pages SEO `app/artisans/[wilaya]/…` : contenu français uniquement, forcé en `dir="ltr"`. Ne pas traduire le texte juridique sans relecture humaine.

## Pièges connus
- Le dossier `app/facture/[bookingId]` s'affiche `FACTURE` sur le disque Windows (casse insensible). Git suit la version en minuscules, c'est la bonne.
- Warnings « LF will be replaced by CRLF » : bruit de fins de ligne, ne pas commiter des fichiers modifiés uniquement pour ça.
- `.claude/worktrees/` contient les copies de travail des agents : non suivi par git, ne pas le commiter.
- Hooks locaux (GateGuard) : la première commande Bash et la première édition d'un fichier demandent de présenter des faits avant de réessayer.

## Conventions de travail
- Commits en français, style `type(portée): message`, avec la ligne `Co-Authored-By` demandée par le harnais.
- Ne pousser sur GitHub que sur demande explicite du propriétaire.
- Pour des tâches parallèles, un agent par périmètre distinct, chacun dans son worktree; vérifier qu'il est parti du dernier commit de `main` avant de fusionner.

## État et reste à faire (2026-11-02)
- Fait : refonte du design, suppression de compte, facture, Next 16, RTL; en production et vérifiés : `fix_booking_status.sql`, `fix_integrity.sql` (§5 et §6), `privacy_hardening.sql`.
- Action propriétaire : SMTP e-mail (Brevo/Resend) + templates `{{ .Token }}` dans Supabase; variables Vercel (dont `NEXT_PUBLIC_LAUNCH_DATE` et clé service). Détail : `A_FAIRE_PROPRIETAIRE.md`.
- Non testé de bout en bout (vrais comptes) : acceptation, clôture, avis, chat, facture, suppression de compte.
- Décisions ouvertes : avis masqué dans la note ?, `artisans.location` non arrondi, `siret`/assurance lisibles par anon. Push GitHub (~48 commits d'avance) seulement sur demande.
- Plus tard : légal/SEO en arabe (relecture humaine), fiches App Store / Google Play, Sentry après lancement.
