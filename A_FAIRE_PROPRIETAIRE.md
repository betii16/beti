# À faire par toi (propriétaire) : état au 2026-11-01

Rien n'est poussé sur GitHub (≈ 48 commits locaux sur `main`). Le code attend certains scripts SQL : **exécute le SQL avant de pousser**.

## 1. URGENT : base Supabase de production (projet BETI), éditeur SQL
Supabase > projet **BETI** > **SQL Editor** > **New query** (une requête vide à chaque fois).

1. `supabase/fix_booking_status.sql` : **une seule ligne**, à exécuter SEULE.
   `alter type public.booking_status add value if not exists 'confirmed';`
   Sans elle, **aucun artisan ne peut accepter une réservation** (les 7 réservations existantes sont toutes `pending`).
2. `supabase/fix_integrity.sql` (après le 1) : ferme les failles notifications / messages / avis / transitions de statut. Les vérifications sont en commentaire à la fin du fichier.
3. Déjà fait : `supabase/emergency_hardening.sql` (rôle admin, Premium gratuit, photos, position). Vérifié par lecture le 2026-11-01.
4. Plus tard, à tester d'abord sur le projet de test : chaîne `rls_policies` > `security_hardening` > `privacy_hardening` > `launch_hardening` (corrige surtout les **téléphones encore lisibles par tous**). Ne jamais ré-exécuter `profile_trigger.sql`, `storage_policies.sql`, `subscriptions_schema.sql`, `prelaunch_schema.sql`, `messages_table.sql` (voir `supabase/README_ORDRE.md`).

## 2. Connexion client par e-mail : réglages Supabase
- **Authentication > Providers > Email** : activer, longueur du code = **6**.
- **Authentication > Emails > Templates** : modèles **Magic Link** et **Confirm signup** : remplacer le lien par `{{ .Token }}`, objet `Votre code BETI : {{ .Token }}`.
- **SMTP personnalisé** (Authentication > Emails > SMTP Settings) : indispensable pour de vrais clients (le SMTP par défaut est limité à très peu de mails par heure et à ton équipe).
  - Le « mot de passe SMTP » est **généré par le service** (clé SMTP Brevo, clé API Resend `re_…`), tu ne le choisis pas. Ne le colle jamais dans un chat.
  - Brevo bloque sur la validation par SMS du numéro algérien : essayer `+213 5XX…` sans le 0, l'appel vocal, ou passer à Resend.
  - Resend n'envoie qu'à ton propre e-mail tant qu'un **nom de domaine** n'est pas validé chez eux.
  - **Il te faut un nom de domaine à toi** pour des e-mails qui arrivent (achat souvent difficile avec une carte algérienne : carte virtuelle ou aide à l'étranger). Dépannage possible : Gmail avec mot de passe d'application (≈ 500 mails/jour, déconseillé durablement).

## 3. Projet Supabase de TEST (pour que je teste le parcours réel sans SMS)
Checklist exacte : `scripts/test-project-checklist.md`. Résumé :
1. Créer un 2e projet Supabase (jamais la production).
2. Exécuter les scripts SQL (schéma de base à reconstruire : voir §6), puis `emergency_hardening`, `fix_booking_status`, `fix_integrity`.
3. Créer le bucket public `beti-photos`, activer Auth e-mail/mot de passe.
4. Remplir **toi-même** `.env.test.local` (URL, clé anon, clé `service_role` du projet DE TEST). Ne jamais coller la clé `service_role` dans le chat.
5. `npm run test:real:setup` puis `npm run test:real`.

## 4. Vercel / lancement
- Définir **`NEXT_PUBLIC_LAUNCH_DATE`** (début de la période gratuite de 2 mois). Sans elle, la date par défaut (1er juillet 2026) fait que la gratuité est **déjà terminée** et les artisans non abonnés sont **cachés** : l'annuaire paraîtrait vide.
- Vérifier que le projet Vercel qui sert `beti-ten.vercel.app` a bien les variables Supabase (URL, clé anon, clé service pour la suppression de compte). Il existe plusieurs projets `beti*` dans ton compte (`beti`, `beti-rkc2`, `beti-sada`, `beti-bo7h`, `beti-ok8c`) : lequel est le bon ? Supprimer les autres.
- Ne pousse sur GitHub qu'**après** le SQL du §1 (le code utilise `confirmed`). Dis « pousse » et je le fais.

## 5. Décisions à prendre
- **Nom de domaine** (et possèdes-tu `beti.dz` ? les pages légales affichent `support@beti.dz`).
- **Titre de l'accueil** : « Votre quartier est plein de bons artisans » est trompeur tant que l'annuaire est quasi vide. À remplacer par une promesse.
- **Modèle de paiement des artisans** : abonnement 2 500 / 5 000 DA par mois, ou crédits prépayés (idée à tester avec ~10 artisans) ; vérifier avec un juriste que les crédits ne ressemblent pas à une commission.
- **Encaisser en Algérie** : formaliser (auto-entrepreneur ANAE ou société avec RC + NIF + compte pro), virement BaridiMob/CCP validé à la main au début, carte CIB/Edahabia via SATIM ou passerelle (ex. Chargily) ensuite. Demander conditions et tarifs directement à SATIM / Chargily. Faire valider par un expert-comptable algérien. Payer Vercel/Supabase en devises demandera une carte internationale.
- **Vérification des artisans** : la base a déjà `profiles.is_verified`, `artisans.siret`, `artisans.insurance_number` : décider du niveau de vérification réel (jusque-là, ne jamais écrire « certifié »).
- **Juriste algérien** pour CGU, confidentialité, loi 18-07, mentions de facture.
- **Stores** : compte développeur Google/Apple (carte internationale), risque de refus Apple (règle 4.2, WebView), URL de politique de confidentialité.
- **Logo** : valider le logo actuel (maison pleine + B en creux + étoile zellige dorée) ou me dire quoi changer. Planches : `C:\tmp\beti-logo-pistes\`.
- **Pub vidéo** (`C:\Users\raouf\Desktop\betii-video\out\`) à regénérer avec le nouveau logo si tu la veux ; choisir la voix (femme/homme).

## 6. Ce que je ferai à ta prochaine venue (dis « reprends »)
1. Vérifier par lecture l'exécution des §1.1 et §1.2 sur la production.
2. Écrire dans le dépôt le **schéma complet** de la base (le dépôt ne contient pas `profiles`, `artisans`, `bookings`, `notifications`) : déjà lu en lecture seule, reste à l'écrire dans un fichier.
3. Corriger la page des réglages (elle écrit encore `profiles.phone` et parle d'un compte « lié au téléphone »).
4. Mise à jour de `maplibre-gl` (faille de nettoyage HTML, saut de version majeure à tester sur la carte).
5. Lancer le parcours réel sur le projet de test dès que le §3 est fait, puis la chaîne complète de durcissement dessus.
6. Brancher Better Stack / Sentry sur `setErrorSink` (voir `CLAUDE.md`, section Gestion des erreurs).
7. Nettoyer ESLint (220 erreurs préexistantes, CI en mode non bloquant).

## Rappels
- Note actuelle estimée : **≈ 60/100** (le code seul peut monter vers 75–80 ; au-delà dépend d'artisans réels, d'un juriste et d'une entité légale).
- Les MCP Supabase, Vercel et Better Stack sont connectés. Le garde-fou de Claude Code **refuse** les écritures de production par moi : les scripts SQL sont à coller par toi.
