# Ordre d'exécution des fichiers SQL (Supabase > SQL Editor)

Exécution à la main, dans cet ordre :

1. `rls_policies.sql`
2. `security_hardening.sql`
3. `privacy_hardening.sql`
4. `launch_hardening.sql`

Tester d'abord sur une branche Supabase, jamais directement en production.

## À NE JAMAIS ré-exécuter après le durcissement
Ces fichiers écrasent des versions durcies (policies, triggers, fonctions) :
- `profile_trigger.sql` (handle_new_user : perd le filtre de rôle et profile_private)
- `storage_policies.sql` (rouvre la lecture/écriture large du bucket)
- `subscriptions_schema.sql` (policy d'insertion abonnement non restreinte)
- `prelaunch_schema.sql`, `messages_table.sql` (colonnes/policies sans les gardes)

Les autres fichiers (`offers_schema.sql`, `portfolio_and_reviews.sql`, `payments_schema.sql`...) sont des schémas par fonctionnalité : ne ré-exécuter qu'avec relecture, puis relancer `launch_hardening.sql`.
