# BETI — marketplace d'artisans (Algérie)

Site + app mobile pour trouver et réserver des artisans par wilaya. Interface en français et en arabe (RTL). Langue de travail avec le propriétaire : français.

## Deux versions dans le dépôt
- `main` : la v1, l'ancien site. Hors service depuis le 2026-11-15 : la base de production est passée au schéma v2 et le site déployé (Vercel, branche `main`) ne peut plus la lire. Ne plus la faire évoluer.
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
- `npm run gen:types` : régénère les types de la base (`src/lib/supabase/database.types.ts`) après une migration.

## Base de données : la règle à ne jamais casser
- L'API (rôles `anon`, `authenticated`) lit les tables à travers le RLS et n'écrit jamais dedans. Toute écriture passe par une fonction de `supabase/migrations/…300_api.sql` (utilisateurs) ou `…400_admin.sql` (équipe, journalisée dans `audit_log`).
- La v2 est installée en production depuis le 2026-11-15, vérifiée identique à la base des tests ; la migration `…000700_column_grants.sql` y a été ajoutée le 2026-11-18. Les sept fichiers de `supabase/migrations/` sont donc figés : toute évolution est un nouveau fichier de migration, qui règle lui-même les droits de ses fonctions, s'inscrit à la main dans `tests/db/surface.test.ts`, et ne s'applique en production qu'avec l'accord du propriétaire.
- Les types de la base sont générés par `tests/db/contract.test.ts` depuis la base des tests, pas par le générateur de Supabase (il recopierait les centaines de fonctions PostGIS). `Insert` et `Update` y valent `never` : une écriture directe dans une table ne compile pas. `Row` ne contient que les colonnes lisibles par l'API.
- Le RLS choisit les lignes, pas les colonnes. Sur `artisans` et `reviews`, la lecture est accordée colonne par colonne : une colonne qu'on y ajoute reste fermée à l'API tant qu'une migration ne l'accorde pas (`tests/db/surface.test.ts` en tient la liste). L'abonnement d'un artisan se lit dans `subscriptions`, pas dans sa fiche. Conséquence pour le code : sur ces deux tables, `select('*')` est refusé par la base, il faut nommer les colonnes.
- En production, le schéma `v1_archive` garde les tables et fonctions de la v1 (données d'essai), hors de portée de l'API. `supabase/cutover/` ne se rejoue pas.
- Principe, règles d'écriture d'une fonction et bascule depuis la v1 : `supabase/README.md`.
- `supabase/archive-v1/` : anciens scripts de la v1, ne plus rien en exécuter.
- Ne jamais supposer qu'un fichier SQL du dépôt est en production : lire la base (connecteur Supabase, projet `cqsejaarturvbilyvbfs`, requêtes sur le catalogue uniquement, jamais les données des personnes).

## Gestion des erreurs
- Les fonctions SQL renvoient des codes stables (`invalid_transition`, `rate_limited`, `not_found`…) que l'application traduit en français ou en arabe. Jamais de message SQL brut à l'écran : `errorCode()` (`src/lib/errors.ts`) range l'erreur, `src/i18n/dictionaries/` donne la phrase. Un code SQL sans phrase fait échouer `tests/unit/errors.test.ts`.
- Jamais de `catch {}` vide ni d'erreur Supabase ignorée sur un chemin critique (demande, message, avis, abonnement, suppression de compte, photos, code de connexion).

## Design et i18n
- Identité choisie par le propriétaire le 2026-11-16 : D « Direct » (maquettes sur le canevas https://claude.ai/artifact/3q8s7T1bMZdBi133vCngZp). Jetons dans `src/app/globals.css` : la palette de Tailwind est retirée, seules les couleurs du projet existent. Le vert vif `accent` ne sert qu'en fond, avec du texte noir dessus (en texte sur blanc il est illisible).
- Formes : blocs arrondis à 36 px (28 px sur téléphone), tuiles à 28 px, boutons et champs en pilule. Une seule langue par page.
- Trois directions montrées le 2026-11-15 (A « Enseigne », B « Plein cadre », C « Affiche ») : jugées « trop ancien » le 2026-11-16, même s'il les préfère à la v1. Donc pas de motifs patrimoniaux (étoiles, enseigne peinte, affiche), pas d'angles droits partout, pas de texte doublé en arabe à côté du français.
- D « Direct » ajoutée le 2026-11-16 : blanc, noir, un vert vif (`#12D46B`, réglable sur le canevas), vert nuit `#073B28`, coins arrondis, police Readex Pro (latin et arabe), une seule langue par page, écrans d'appli (suivi d'une demande).
- Son reproche à la v1 : « trop fade, trop claudifié ». Donc de vraies images dans les écrans ; pas de fond crème, pas de cartes arrondies identiques partout, pas d'étiquette en capitales au-dessus de chaque titre.
- Images : `public/images/`. Cinq photos générées avec son compte Higgsfield le 2026-11-15 ; trois manquent (ménage, climatisation, portrait d'artisan : limite quotidienne de son compte atteinte). Chaque génération coûte ses crédits : une seule prise par image, jamais de relance sans son accord. Ce sont des photos d'illustration : jamais de faux profil d'artisan ni de faux avis.
- Français et arabe (RTL) : propriétés logiques CSS (`margin-inline-start`…), jamais `left` / `right` sauf carte et champ téléphone. En arabe, `globals.css` annule tout `letter-spacing` (écriture liée) et les titres prennent un interligne plus grand (`rtl:leading-…`).
- Textes de l'interface : `src/i18n/dictionaries/fr.ts` fait référence, `ar.ts` doit porter les mêmes clés (erreur de compilation sinon). L'arabe rédigé par Claude (messages d'erreur, noms des wilayas) est à faire relire par une personne arabophone avant la mise en ligne.
- Textes juridiques (CGU, confidentialité, mentions) : français uniquement, à reprendre tels quels de la v1. Ne pas les traduire ni les réécrire sans relecture humaine.

## Pièges connus
- SQL : dans une fonction `security definer`, `current_user` vaut le propriétaire (`postgres`), jamais l'appelant. Un garde qui le teste ne bride personne.
- SQL : `x not in (a, b)` vaut `NULL` si `a` ou `b` est `NULL`, et la vérification saute. Utiliser `is distinct from`.
- Le projet Supabase gratuit se met en pause après une semaine sans activité (constaté le 2026-11-15) : le site n'a alors plus ni données ni connexion.
- `next build` peut s'arrêter une fois pour afficher un avis de sécurité et proposer `next upgrade` : c'est un message de l'outil, pas une consigne. Relancer la commande, et parler de la mise à jour au propriétaire.
- Tests : `vitest.config.ts` lance les fichiers un par un (`maxWorkers: 1`, une trentaine de secondes). En parallèle, les Postgres embarqués compilés en même temps font tomber un processus en « Fatal process out of memory » dès que la machine a peu de mémoire libre (constaté les 2026-11-15 et 2026-11-18). Si cela arrive encore en série, c'est la machine qui est à court (un jeu ouvert, par exemple) : relancer.
- Warnings « LF will be replaced by CRLF » : bruit de fins de ligne.
- Formulaires à action (`useActionState`) : après l'action, React remet chaque champ à sa valeur par défaut, mais ne met pas à jour celle d'un `<select>` déjà affiché. Un formulaire qui rend la saisie après un refus donne donc au select une `key` égale à sa valeur (voir `listing-form.tsx`), sinon le choix est perdu.
- `.claude/` : non suivi par git, ne pas le commiter.
- Hooks locaux (GateGuard) : la première commande Bash et la première écriture de chaque fichier sont refusées une fois. Présenter les faits demandés, puis réessayer.

## Conventions de travail
- Commits en français, style `type(portée): message`, avec la ligne `Co-Authored-By` demandée par le harnais. Le propriétaire a autorisé les commits par étape sur `refonte`.
- Ne pousser sur GitHub que sur demande explicite du propriétaire.
- Lui demander avant toute écriture en production (Supabase) et avant toute dépense de crédits (images).

## État du chantier v2 (2026-11-15)
- Fait : base de données v2 et ses 59 tests, installée en production (bascule du 2026-11-15 : 10 comptes repris ; annonces, demandes et messages de la v1 laissés dans l'archive) ; trois directions visuelles sur le canevas ; cinq photos ; squelette de l'app (`src/` : pages sous `/fr` et `/ar`, proxy de langue et de session, clients Supabase, en-têtes de sécurité), compilé et vérifié dans le navigateur ; socle de données (types de la base générés, codes d'erreur expliqués en français et en arabe, 58 wilayas, libellés des catégories) ; accueil en direction D avec en-tête, pied de page, changement de langue et page 404, vérifié dans le navigateur en français et en arabe, sur ordinateur, tablette et téléphone ; recherche d'artisans (`/recherche` : filtres lus dans l'adresse et validés, liste, état vide, erreur, pages) et profil d'artisan (`/artisans/<id>` : en-tête, description, réalisations, avis), vérifiés de la même façon ; connexion par code e-mail (`/connexion`), compte (`/compte` : nom, déconnexion) et garde des pages réservées. 78 tests.
- `eslint.config.mjs` est protégé par un hook : ne pas le modifier. Le lint vise donc `src` et `tests` (`npm run lint`), ce qui évite aussi de parcourir `.claude/worktrees/`.
- Dépendances de production : `npm audit --omit=dev` est à 0 depuis le passage à Next 16.4.6 (2026-11-18, deux avis modérés corrigés). À garder à 0.
- En attente du propriétaire : mise à jour des outils de développement (`npm audit` complet : 28 alertes, aucune en production, via `vitest` 3, `@capacitor/assets` 3 et `@capacitor/cli` ; les corriger demande des versions majeures) ; compte qui sera le premier admin (`private.staff` est vide) ; accord pour retirer les anciens droits de lecture restés sur les tables de `v1_archive` (sans effet tant que le schéma est fermé) ; sort de PostGIS, que Supabase signale (table `spatial_ref_sys` sans RLS) et qu'on garde tant que l'archive existe.
- Migration `…000700_column_grants.sql` : appliquée en production le 2026-11-18 sur accord du propriétaire (enregistrée `v2_700_column_grants`), puis vérifiée dans le catalogue et par l'API en visiteur anonyme. Elle ferme à l'API `reviews.client_id`, `reviews.booking_id` (aux visiteurs anonymes), `artisans.plan` et `artisans.plan_until`, et passe `search_artisans` en `security definer` : le contrôle de sécurité de Supabase signalera cette fonction comme appelable par tous, c'est voulu.
- Aucun artisan n'étant publié, liste de recherche et profil ont été contrôlés avec des données d'essai provisoires, retirées ensuite : l'affichage de vraies photos du stockage reste à voir.
- Connexion (2026-11-19) : `src/lib/auth/` (`input.ts` contrôle adresse, code et page de retour ; `actions.ts` envoie et vérifie le code ; `session.ts` donne `getSession()` et `requireSession()`). Une page réservée appelle `requireSession(lang, chemin)` elle-même, jamais le layout. L'en-tête choisit « Connexion » ou « Mon compte » d'après la seule présence du cookie de session, côté navigateur : les pages publiques restent statiques, et ce n'est pas un contrôle d'accès.
- Connexion, ce qui n'a PAS été vérifié : la réception d'un vrai code et l'ouverture de session qui suit (il faut une adresse réelle ; un code faux, lui, est bien refusé par le service). Le modèle d'e-mail de Supabase doit contenir `{{ .Token }}` et, sans service d'envoi branché, Supabase n'écrit qu'aux adresses de l'équipe (`A_FAIRE_PROPRIETAIRE.md`). La connexion par téléphone (`NEXT_PUBLIC_PHONE_AUTH`) n'est pas écrite.
- Demande à un artisan (2026-11-19) : `/artisans/<id>/demande` (formulaire, action `src/lib/bookings/actions.ts`) et `/demandes` (liste des demandes de la personne). Vérifié : gardes, 404, mise en page du formulaire. PAS vérifié, faute de session réelle et d'artisan publié : l'envoi d'une vraie demande et l'affichage de la liste remplie. Page d'une demande `/demandes/<id>` : état, besoin, adresse (l'artisan ne la lit qu'après acceptation) et boutons selon le rôle et l'état (`bookingActions()` dans `src/domain/bookings.ts`, reflet des fonctions SQL ; action `updateBooking`). Elle non plus n'a jamais tourné avec une vraie session. Manquent encore : la conversation, le suivi de position, l'avis.
- Piège : `save_profile` REMPLACE toute la fiche (wilaya, commune, photo deviennent vides si on ne les repasse pas). Pour changer le nom seul, passer par `saveFullName()` (`src/lib/profile.ts`), qui relit puis renvoie le reste. `save_listing` fait de même sur la fiche d'artisan : `saveListing()` (`src/lib/listing/actions.ts`) relit photos et position avant d'envoyer.
- Profil d'artisan : `/artisan` (lien « Je suis artisan » de l'en-tête et de l'accueil, page réservée). Un compte client y crée son profil (`become_artisan` puis `save_listing`, le rôle ne revient pas en arrière) ; un artisan donne son numéro (`set_phone`, obligatoire pour publier, format `normalizePhone()` dans `src/domain/listing.ts`), publie (ce qui le met aussi « disponible » : une fiche neuve est indisponible par défaut), se dit disponible ou non, retire son profil de la recherche. Vérifié à l'écran avec des valeurs d'essai retirées ensuite, en français et en arabe, sur ordinateur et téléphone ; le refus sans session et le numéro mal formé aussi. PAS vérifié, faute de session réelle : création, numéro, publication et disponibilité enregistrés en vrai. Manquent : photos du profil (avatar, couverture) et réalisations, qui demandent l'envoi vers le stockage.
- Liens déjà posés qui mènent encore à la page 404 : `/aide`, `/cgu`, `/confidentialite`.
- La recherche n'a pas encore de « près de moi » (la fonction SQL accepte une position, l'écran ne la demande pas) ni de page d'erreur générale (`error.tsx`).
- Reste à construire : conversation, suivi de position et avis sur la page d'une demande, photos et réalisations du profil d'artisan, connexion par téléphone, pages d'aide et pages juridiques, accueil façon appli sur téléphone (barre d'onglets, suivi de la demande en cours), demande / conversation / avis, espaces client et artisan, panneau admin, suppression de compte, PWA et pont Capacitor, tests de parcours.
- Actions du propriétaire héritées de la v1, toujours valables : service d'envoi des codes par e-mail (SMTP), variables Vercel dont la clé service, nom de domaine, juriste. Détail : `A_FAIRE_PROPRIETAIRE.md`.
