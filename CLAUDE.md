# BETI — marketplace d'artisans (Algérie)

Site + app mobile pour trouver et réserver des artisans par wilaya. Interface en français et en arabe (RTL). Langue de travail avec le propriétaire : français.

## Deux versions dans le dépôt
- `main` : la v1, l'ancien site. Ne plus la faire évoluer, sauf correctif urgent.
- `refonte` : la v2, réécriture à neuf décidée par le propriétaire le 2026-11-15 (nouvelle structure, nouvelle identité visuelle, base de données neuve). Rien n'est poussé sur GitHub.
- Relire l'ancien code sans changer de branche : `git show main:<chemin>` ou `git grep <motif> main`.

## Stack (v2)
- Next.js 16 (App Router, code dans `src/`), React 19, TypeScript strict, Tailwind 4, zod, MapLibre.
- Supabase : Postgres, auth par code (e-mail ou téléphone), temps réel, stockage. Session en cookies avec `@supabase/ssr`.
- App mobile Capacitor (`dz.beti.app`) : `capacitor.config.ts` charge le site en ligne (`server.url`). Un correctif web vaut donc aussi pour l'app, sans republier sur les stores.
- Déploiement : Vercel (projet `beti`, dépôt GitHub `betii16/beti`, branche `main`).
- Avant d'écrire du code Next : lire le guide concerné dans `node_modules/next/dist/docs/` (voir `AGENTS.md`). Next 16 a changé des conventions.

## Commandes
- `npm run dev` / `npm run build` / `npm run lint` / `npm run typecheck`
- `npm test` : tous les tests (vitest). `npm run test:db` : la base seule.

## Base de données : la règle à ne jamais casser
- L'API (rôles `anon`, `authenticated`) lit les tables à travers le RLS et n'écrit jamais dedans. Toute écriture passe par une fonction de `supabase/migrations/…300_api.sql` (utilisateurs) ou `…400_admin.sql` (équipe, journalisée dans `audit_log`).
- Toute nouvelle table ou fonction s'inscrit à la main dans `tests/db/surface.test.ts` et dans la liste des droits en fin de `…400_admin.sql`.
- Principe, règles d'écriture d'une fonction et bascule depuis la v1 : `supabase/README.md`.
- `supabase/archive-v1/` : anciens scripts de la v1, ne plus rien en exécuter.
- Ne jamais supposer qu'un fichier SQL du dépôt est en production : lire la base (connecteur Supabase, projet `cqsejaarturvbilyvbfs`, requêtes sur le catalogue uniquement, jamais les données des personnes).

## Gestion des erreurs
- Les fonctions SQL renvoient des codes stables (`invalid_transition`, `rate_limited`, `not_found`…) que l'application traduit en français ou en arabe. Jamais de message SQL brut à l'écran.
- Jamais de `catch {}` vide ni d'erreur Supabase ignorée sur un chemin critique (demande, message, avis, abonnement, suppression de compte, photos, code de connexion).

## Design et i18n
- Nouvelle identité en cours de choix. Trois directions montrées au propriétaire le 2026-11-15 : A « Enseigne », B « Plein cadre », C « Affiche », sur le canevas https://claude.ai/artifact/3q8s7T1bMZdBi133vCngZp. Ne rien construire de visuel avant sa réponse.
- Son reproche à la v1 : « trop fade, trop claudifié ». Donc de vraies images dans les écrans ; pas de fond crème, pas de cartes arrondies identiques partout, pas d'étiquette en capitales au-dessus de chaque titre.
- Images : `public/images/`. Cinq photos générées avec son compte Higgsfield le 2026-11-15 ; trois manquent (ménage, climatisation, portrait d'artisan : limite quotidienne de son compte atteinte). Chaque génération coûte ses crédits : une seule prise par image, jamais de relance sans son accord. Ce sont des photos d'illustration : jamais de faux profil d'artisan ni de faux avis.
- Français et arabe (RTL) : propriétés logiques CSS (`margin-inline-start`…), jamais `left` / `right` sauf carte et champ téléphone.
- Textes juridiques (CGU, confidentialité, mentions) : français uniquement, à reprendre tels quels de la v1. Ne pas les traduire ni les réécrire sans relecture humaine.

## Pièges connus
- SQL : dans une fonction `security definer`, `current_user` vaut le propriétaire (`postgres`), jamais l'appelant. Un garde qui le teste ne bride personne.
- SQL : `x not in (a, b)` vaut `NULL` si `a` ou `b` est `NULL`, et la vérification saute. Utiliser `is distinct from`.
- Le projet Supabase gratuit se met en pause après une semaine sans activité (constaté le 2026-11-15) : le site n'a alors plus ni données ni connexion.
- Warnings « LF will be replaced by CRLF » : bruit de fins de ligne.
- `.claude/` : non suivi par git, ne pas le commiter.
- Hooks locaux (GateGuard) : la première commande Bash et la première écriture de chaque fichier sont refusées une fois. Présenter les faits demandés, puis réessayer.

## Conventions de travail
- Commits en français, style `type(portée): message`, avec la ligne `Co-Authored-By` demandée par le harnais. Le propriétaire a autorisé les commits par étape sur `refonte`.
- Ne pousser sur GitHub que sur demande explicite du propriétaire.
- Lui demander avant toute écriture en production (Supabase) et avant toute dépense de crédits (images).

## État du chantier v2 (2026-11-15)
- Fait : base de données v2 et ses 59 tests ; scripts de bascule ; trois directions visuelles sur le canevas ; cinq photos ; squelette de l'app (`src/` : pages sous `/fr` et `/ar`, proxy de langue et de session, clients Supabase, en-têtes de sécurité), compilé et vérifié dans le navigateur.
- `eslint.config.mjs` est protégé par un hook : ne pas le modifier. Le lint vise donc `src` et `tests` (`npm run lint`), ce qui évite aussi de parcourir `.claude/worktrees/`.
- En attente du propriétaire : choix de la direction visuelle ; accord pour installer la base v2 sur le projet Supabase (l'ancien site cessera alors de fonctionner) ; compte qui sera le premier admin.
- Reste à construire : socle de l'application (configuration, i18n, auth, accès aux données), pages publiques, connexion, demande / conversation / avis, espaces client et artisan, panneau admin, PWA et pont Capacitor, tests de parcours.
- Actions du propriétaire héritées de la v1, toujours valables : service d'envoi des codes par e-mail (SMTP), variables Vercel dont la clé service, nom de domaine, juriste. Détail : `A_FAIRE_PROPRIETAIRE.md`.
