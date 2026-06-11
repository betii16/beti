# Audit de sécurité — BETI

_Date : 2026-06-10 · Portée : code applicatif (le contenu réel des policies Supabase n'a pas pu être inspecté à distance)._

## Résumé

L'application est **100 % client-side** : chaque page est un composant `'use client'` qui interroge Supabase directement depuis le navigateur avec la **clé anon** (publique). Il n'y a **aucune couche serveur** qui valide les accès (la seule route API est `/api/stripe/create-payment`).

**Conséquence : la seule barrière de sécurité réelle est le RLS (Row Level Security) de Supabase.** Tout contrôle écrit en React (redirections, gating admin) est purement cosmétique et contournable. Si le RLS n'est pas correctement configuré, toute la base est lisible/modifiable par quiconque récupère la clé anon (visible dans le code du navigateur).

➡️ **Action principale : exécuter `supabase/rls_policies.sql`** puis vérifier qu'aucune table n'a le RLS désactivé.

---

## Constats

### 🔴 Critique

| # | Constat | Détail | Remédiation |
|---|---------|--------|-------------|
| C1 | **Sécurité = RLS uniquement** | Accès direct à Supabase via clé anon depuis le client. | Activer RLS sur toutes les tables (`rls_policies.sql`). |
| C2 | **Gating admin cosmétique** | `app/admin/page.tsx` redirige si `role !== 'admin'`, mais un attaquant ignore le redirect et requête la DB directement. | La policy `is_admin()` du SQL protège réellement les données admin. |
| C3 | **Notifications insérées pour autrui** | `app/page.tsx` insère une notif avec `user_id = artisan`. Une policy stricte casserait ce flux ; sans policy, l'insert est bloqué. | Remplacer l'insert client par les **triggers** `notify_on_booking` / `notify_on_message` (fournis). Puis retirer les `insert('notifications')` du code client (voir « Changements de code »). |

### 🟠 Élevé

| # | Constat | Détail | Remédiation |
|---|---------|--------|-------------|
| H1 | **Note artisan falsifiable** | `artisans.rating_avg/rating_count/total_missions` modifiables par l'artisan via `update`. | Trigger `recalc_artisan_rating` (fourni) recalcule à partir de `reviews` ; ne pas exposer ces colonnes à l'update client. |
| H2 | **Prix modifiable après accord** | `bookings.price_agreed` reste modifiable par les deux parties tant qu'un `update` est permis. | Ajouter un trigger `BEFORE UPDATE` figeant `price_agreed` une fois `status` = confirmed/completed. |
| H3 | **Téléphone exposé** | `profiles` est en lecture publique et contient `phone`. | Déplacer `phone` dans une table privée, ou exposer les profils publics via une vue sans `phone`. |

### 🟡 Moyen

| # | Constat | Détail |
|---|---------|--------|
| M1 | **9 vulnérabilités npm** (3 modérées, 6 hautes) signalées à l'install. Lancer `npm audit` et corriger ce qui est sans risque. |
| M2 | **`zod` installé mais inutilisé** : aucune validation d'entrée. Comme il n'y a pas de serveur, la validation se ferait côté client (faible) — la vraie validation doit être en RLS/contraintes DB. |
| M3 | **Stripe en EUR sur un marché en DA** : décision assumée (cf. paiement). Le montant `price_agreed` (DA) est traité comme EUR. À surveiller. |

### 🔵 Faible / hygiène

- **Fichiers orphelins sans extension** (non compilés, non importés) : `components/NotificationBell`, `components/ReviewSystem`. Même bug que les fichiers Stripe (corrigés). À supprimer ou renommer si on veut les utiliser — attention à ne pas masquer les composants actifs `NotificationSystem.tsx` / `ReviewPhotos.tsx`.
- **`useState<any>` quasi systématique** : `strict: true` contourné, typage des données Supabase absent.

---

## Changements de code nécessaires (après application du SQL)

1. **`app/page.tsx`** — la fonction `contact()` insère une notification pour l'artisan. Une fois le trigger `notify_on_booking` actif, cet insert devient **redondant et bloqué par RLS**. → Retirer le bloc `await Promise.resolve(supabase.from("notifications").insert({...}))`.
2. Vérifier les autres `insert('notifications')` (3 au total dans le code) et les remplacer par les triggers.
3. Ne plus écrire `rating_avg`/`rating_count`/`total_missions` depuis le client.

---

## Ce qui n'a PAS pu être vérifié

- L'état **réel** du RLS sur l'instance Supabase (nécessite un accès au dashboard / service_role). Le SQL fourni est *idempotent* : on peut le lancer sans risque, il (re)pose les bonnes policies.
- L'existence exacte des colonnes (déduites du code). Vérifier les noms avant d'exécuter le SQL.
