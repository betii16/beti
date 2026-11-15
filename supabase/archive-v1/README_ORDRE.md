# Scripts SQL : ce qui tourne en production et quoi exécuter

Exécution à la main dans Supabase > SQL Editor. Les fichiers du dépôt ne prouvent rien : l'état réel lu dans la base est dans `SCHEMA_SNAPSHOT.md`.

## Déjà appliqués en production (vérifiés en lecture, ne pas rejouer)
1. `emergency_hardening.sql`
2. `fix_booking_status.sql` (2026-11-02)
3. `fix_integrity.sql`, §5 et §6 compris (2026-11-02)
4. `privacy_hardening.sql` (2026-11-02)
5. `fix_integrity2.sql`

## À exécuter, dans cet ordre
6. `moderation.sql` : signalements et suspension de compte (pas encore appliqué au 2026-11-03, à vérifier).
7. `audit_fixes_2026_11_11.sql`, version corrigée du 2026-11-15, **avant** de déployer le code.

## À ne jamais exécuter sur la production
Ancienne génération : ces fichiers écrasent des fonctions plus récentes ou cassent les écritures.
- `rls_policies.sql` : rouvre à l'admin la lecture de tous les chats et recalcule les notes en comptant les avis masqués.
- `security_hardening.sql` : remplace les gardes actuels par d'anciennes versions et ajoute un second jeu de règles de statut, contradictoire avec celui de `fix_integrity.sql`.
- `launch_hardening.sql` : ses gardes appellent `is_client_write()`, absente en production (vérifié le 2026-11-03). Toute écriture sur `artisans`, `bookings` et `offers` échouerait.
- `profile_trigger.sql`, `storage_policies.sql`, `subscriptions_schema.sql`, `prelaunch_schema.sql`, `messages_table.sql` : écrasent des versions durcies.

Les schémas par fonctionnalité (`offers_schema.sql`, `portfolio_and_reviews.sql`, `payments_schema.sql`…) demandent une relecture avant toute exécution.

## Règle pour écrire un garde
Dans une fonction `security definer`, `current_user` vaut le propriétaire de la fonction (`postgres`), jamais l'appelant. Un garde qui teste `current_user in ('authenticated', 'anon')` doit donc être `security invoker` (le défaut), comme ceux de `fix_integrity.sql`.
