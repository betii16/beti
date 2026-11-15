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
| `cutover/` | Les deux scripts de bascule depuis la v1, à jouer une seule fois. |
| `archive-v1/` | Les anciens scripts SQL de la v1. **Ne plus rien exécuter de ce dossier.** |

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
- Ajouter la fonction à la liste des droits en fin de `…400_admin.sql`, et à `surface.test.ts`.

## Bascule depuis la v1 (une seule fois)

1. `cutover/01_archive_v1.sql` : déplace les tables de la v1 dans le schéma `v1_archive`. Rien n'est supprimé. L'ancien site cesse de fonctionner.
2. Les six fichiers de `migrations/`, dans l'ordre.
3. `cutover/02_backfill_accounts.sql` : recrée la fiche des comptes existants.
4. Ajouter le premier admin (exemple en bas du script précédent).

## À savoir

- La période de lancement (tous les artisans publiés sont visibles, abonnés ou non) est fixée à deux mois après l'installation. Un admin la change depuis le panneau.
- PostGIS reste installé pour ne pas abîmer l'archive ; la v2 ne s'en sert pas (distance calculée par une formule).
