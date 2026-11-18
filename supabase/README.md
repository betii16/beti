# Base de données BETI v2

## Le principe

L'API (rôles `anon` et `authenticated`) **lit** les tables à travers les règles RLS et **n'écrit jamais** dedans. Toute écriture passe par une fonction :

- `migrations/…300_api.sql` : ce qu'un utilisateur peut faire (demande, message, avis, fiche…) ;
- `migrations/…400_admin.sql` : ce que l'équipe peut faire, avec une ligne dans `audit_log` à chaque action.

Les données privées ont leur table et leur règle : téléphone (`user_contacts`, donné à l'autre partie seulement après acceptation, par `booking_contact()`), adresse du client (`booking_private`), position exacte (`artisan_live_location`). L'équipe (`private.staff`) n'est accessible par aucune route de l'API : on ajoute un admin à la main dans le SQL Editor.

## Les dossiers

| Dossier | Contenu |
|---|---|
| `migrations/` | Le schéma v2, à jouer dans l'ordre des noms. C'est la seule source de vérité. |
| `tests/supabase_stub.sql` | Ce que Supabase fournit avant nos migrations, imité pour les tests. |
| `cutover/` | Les deux scripts de bascule depuis la v1, exécutés le 2026-11-15. **Ne pas les rejouer.** |
| `archive-v1/` | Les anciens scripts SQL de la v1 et ses règles de stockage relevées en production. **Ne plus rien exécuter de ce dossier.** |

## Tester

```bash
npm run test:db
```

Les tests (`tests/db/`) démarrent un vrai Postgres embarqué, jouent les migrations, puis agissent comme l'API : un rôle Postgres et le jeton d'un utilisateur. Ils vérifient le parcours normal et les attaques (lire les données d'un autre, sauter une étape, se donner un abonnement, appeler une fonction d'admin…).

`tests/db/surface.test.ts` contient la liste, écrite à la main, des tables lisibles et des fonctions appelables. **Toute nouvelle table ou fonction doit y être inscrite**, sinon le test échoue.

## Règles pour écrire une fonction

- `security definer` avec `set search_path = ''` et des noms complets (`public.bookings`, `auth.uid()`).
- Ne jamais tester `current_user` dans une fonction `security definer` : il vaut le propriétaire (`postgres`), pas l'appelant. Identifier l'appelant avec `private.require_user()` ou `private.require_staff()`.
- Comparer avec `is distinct from` dès qu'une colonne peut être `NULL` : `x not in (a, b)` vaut `NULL` si `a` ou `b` est `NULL`, et la vérification saute.
- Les six premiers fichiers sont installés en production : ne plus les modifier. Une nouvelle fonction va dans un nouveau fichier de migration, qui retire lui-même les droits que Supabase donne par défaut (`revoke execute on function … from public, anon, authenticated`), accorde celui qu'il faut, et s'inscrit dans `surface.test.ts`. Puis `npm run gen:types` met à jour les types de l'application.

## Bascule depuis la v1 (faite le 2026-11-15)

Faite sur le projet Supabase `cqsejaarturvbilyvbfs`, dans cet ordre :

1. `cutover/01_archive_v1.sql` : tables, fonctions et types de la v1 déplacés dans le schéma `v1_archive`, fermé à l'API ; leurs liens vers `auth.users` coupés ; anciennes règles de stockage retirées (copie dans `archive-v1/storage_policies_prod_2026-11-15.sql`). Rien n'a été supprimé. L'ancien site a cessé de fonctionner.
2. Les six fichiers de `migrations/`, enregistrés en production sous les noms `v2_100_schema` à `v2_600_seed`.
3. `cutover/02_backfill_accounts.sql` : fiche et contact recréés pour les 10 comptes existants. Les annonces, demandes et messages de la v1 étaient des essais : ils restent dans l'archive.

Contrôle fait ensuite : fonctions, colonnes, contraintes, index, règles RLS, déclencheurs et droits de la base en ligne comparés par empreinte à ceux de la base des tests, tous identiques.

Reste à faire, avec l'accord du propriétaire :

- ajouter le premier admin (exemple en bas de `cutover/02_backfill_accounts.sql`) : `private.staff` est vide ;
- retirer les anciens droits de lecture restés sur les tables archivées (`revoke all on all tables in schema v1_archive from anon, authenticated;`), sans effet aujourd'hui puisque le schéma est fermé ;
- supprimer un jour `v1_archive`, puis PostGIS.

## Droits de lecture par colonne (`…000700_column_grants.sql`)

Les règles RLS choisissent les lignes, pas les colonnes. Sur `artisans` et `reviews`, les seules tables publiques qui portent des colonnes à ne pas montrer, le droit de lecture est donc donné colonne par colonne :

- fermées à tous : `reviews.client_id`, `artisans.plan`, `artisans.plan_until` ;
- fermée aux visiteurs anonymes seulement : `reviews.booking_id`.

Un artisan lit son abonnement dans `subscriptions` (ses propres lignes), l'équipe aussi. Une colonne ajoutée à l'une de ces deux tables est fermée tant qu'une migration ne l'accorde pas, et `tests/db/surface.test.ts` en tient la liste. Les types de l'application ne contiennent que les colonnes lisibles.

Cette migration est testée mais n'est pas encore appliquée en production (2026-11-18) : elle attend l'accord du propriétaire.

## À savoir

- La période de lancement (tous les artisans publiés sont visibles, abonnés ou non) est fixée à deux mois après l'installation. Un admin la change depuis le panneau.
- PostGIS reste installé pour ne pas abîmer l'archive ; la v2 ne s'en sert pas (distance calculée par une formule). Le contrôle de sécurité de Supabase le signale (table `spatial_ref_sys` sans RLS, trois fonctions `st_estimatedextent`) : attendu tant qu'il est là.
