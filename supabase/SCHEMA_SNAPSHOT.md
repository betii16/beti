# Instantané de la base de production BETI (lecture seule)

Lu le 2026-11-01 sur le projet Supabase `BETI` (`cqsejaarturvbilyvbfs`). Aucune écriture.
But : savoir ce qui tourne **vraiment** (les fichiers SQL du dépôt ne prouvent rien).
Ce fichier est une photo à une date donnée : à relire avant de s'y fier.

## Correctifs appliqués en production le 2026-11-02 (puis vérifiés en lecture)

Le reste de ce fichier décrit l'état **du 2026-11-01, avant** ces trois scripts. Les sections « Policies », « Triggers » et « Défauts » sont donc à lire comme l'état d'avant.

| Script | Résultat vérifié |
|---|---|
| `fix_booking_status.sql` | l'enum `booking_status` contient `confirmed` |
| `fix_integrity.sql` (avec §5 et §6) | `notifs_insert` supprimée ; triggers `trg_guard_booking_status`, `trg_guard_message_update`, `trg_guard_artisan_stats` présents ; `reviews_insert` liée à `booking_id` ; `increment_artisan_missions` en `security definer` |
| `privacy_hardening.sql` | 0 téléphone dans `profiles`, 2 migrés vers `profile_private` ; `lat/lng` arrondis ; `anon` ne lit ni `profile_private` ni `artisan_live_location` ; realtime activé sur `artisan_live_location` |

Reste exposé volontairement ou à trancher :
- `artisans.location` (PostGIS, centre de la zone d'intervention choisie par l'artisan) reste lisible par tous : c'est ce que lit `get_nearby_artisans` (variante enum). Ce n'est pas le GPS live, mais ce n'est pas arrondi.
- `artisans.siret` et `artisans.insurance_number` sont lisibles par `anon` (aucune valeur renseignée aujourd'hui).
- Les 7 réservations sont toujours `pending` : l'acceptation est débloquée, mais aucun artisan ne l'a encore refaite.

## Tables (RLS activé partout sauf `spatial_ref_sys`, table PostGIS)

- `profiles` : id, role (user_role), full_name, phone, avatar_url, address, city, country, is_verified, is_active, bio, notif_email, notif_sms…
- `artisans` : id, category, subcategories, bio, hourly_rate, intervention_radius_km, location (PostGIS), lat/lng/latitude/longitude, siret, insurance_number, is_available, rating_avg, rating_count, total_missions, stripe_account_id, services (jsonb), plan, plan_until, tags…
- `bookings` : client_id, artisan_id, service_id, status, title, category, address, location, lat/lng, scheduled_at, completed_at, price_agreed, price_final, payment_method (défaut `cash`), payment_status, travel_fee, duration_hours…
- `messages` : booking_id, sender_id, content, is_read, sender_name, sender_role
- `notifications` : user_id, type, title, message/body, data, is_read
- `reviews` : booking_id, client_id, artisan_id, rating, comment, reply, is_visible, photos
- `offers` : booking_id, sender_id, amount, status
- `payments` : booking_id, client_id, artisan_id, amount, commission, artisan_amount, method, satim_order_id, status, payout_status
- `portfolio_posts` : artisan_id, description, photos
- `services` : artisan_id, title, category, price_type, price…
- `subscriptions` : artisan_id, plan, cycle, amount, status, payment_ref, proof_url…

## Policies RLS actuelles (public)

- `profiles` : select **pour tous** (`true`), insert/update sur soi.
- `artisans` : select pour tous, insert (`id = auth.uid()`), update sur soi (toute la ligne).
- `bookings` : select/update pour client **ou** artisan (sans contrôle de statut), insert si `client_id = auth.uid()`.
- `messages` : select/insert limités aux deux parties de la réservation ; update : `auth.uid() <> sender_id` seulement.
- `notifications` : select/update/delete sur soi ; insert **ouvert à tous** (`notifs_insert`, `with check true`). Policies en double (`notifications_*` et `notifs_*`).
- `reviews` : select pour tous ; insert si une mission `completed` existe avec l'artisan (sans lier `booking_id`) ; delete par l'auteur ou admin.
- `offers` : via `is_booking_party()` ; update ouvert aux deux parties sur toute la ligne.
- `payments` : select parties + admin ; aucune policy d'écriture (écriture par clé service).
- `portfolio_posts` : lecture publique, écriture par l'artisan.
- `subscriptions` : insert par l'artisan, select soi/admin, update admin.

## Fonctions (public) et qui peut les appeler

- `security definer` : `is_admin`, `is_booking_party`, `update_artisan_location` (vérifie `auth.uid()` : OK), `notify_on_booking`, `notify_on_booking_status`, `notify_on_message`, `recalc_artisan_rating`, `guard_artisan_plan`, `handle_new_user`.
- Sans `security definer` : `increment_artisan_missions`, `update_artisan_rating`, `set_completed_at`, `freeze_price_after_commit`, `guard_profile_role`, `guard_artisan_insert`.
- Appelables par `anon` : `get_nearby_artisans` (2 variantes), `search_artisans_by_tag`, `is_admin`, `is_booking_party` et les fonctions de trigger non révoquées.

## Triggers

- `artisans` : `artisans_guard_plan` (update), `trg_guard_artisan_insert` (insert).
- `bookings` (update) : `bookings_updated_at`, `on_booking_completed`, `trg_freeze_price`, `bookings_increment_missions` (after), `trg_notify_on_booking_status` (after) ; insert : `trg_notify_on_booking`.
- `messages` : `trg_notify_on_message` (insert).
- `profiles` : `profiles_updated_at`, `trg_guard_profile_role`.
- `reviews` : `reviews_update_rating` **et** `trg_recalc_rating` (deux calculs de note concurrents).

## Défauts relevés (état réel, indépendants des fichiers du dépôt)

1. **Notes en double** : `update_artisan_rating` (filtre `is_visible`, sans droits sur `artisans` donc sans effet pour un client) et `recalc_artisan_rating` (sans filtre `is_visible`). Seule la seconde agit, et elle compte aussi les avis masqués. À trancher : un avis masqué doit-il compter ?
2. **Compteur de missions** jamais incrémenté quand le client clôture (trigger sans `security definer`, `artisans_update` impose `auth.uid() = id`). Corrigé dans `fix_integrity.sql` §5.
3. **Statistiques d'artisan modifiables** (`rating_avg`, `rating_count`, `total_missions`) par l'artisan lui-même. Corrigé dans `fix_integrity.sql` §6.
4. **`offers_update`** : chaque partie peut modifier n'importe quelle colonne d'une offre (montant et statut compris), y compris accepter sa propre offre. À examiner si les offres servent de base de prix ; `freeze_price_after_commit` ne fige le prix qu'à partir de `in_progress`.
5. **Vie privée** : voir le tableau du haut ; `privacy_hardening.sql` reste à exécuter.
