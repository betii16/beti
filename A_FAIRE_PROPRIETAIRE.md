# À faire par toi (propriétaire) : état au 2026-11-02

La base de production est à jour et vérifiée. Il reste surtout la configuration e-mail, un vrai test avec de vrais comptes, et quelques réglages Vercel.

## Déjà fait (ne plus y toucher)
- `supabase/emergency_hardening.sql` : rôle admin, Premium gratuit, photos, position.
- `supabase/fix_booking_status.sql` : l'artisan peut maintenant accepter une réservation (statut `confirmed`). Appliqué et vérifié le 2026-11-02.
- `supabase/fix_integrity.sql` (avec §5 et §6) : notifications, messages, avis et changements de statut sont protégés. Appliqué et vérifié le 2026-11-02.
- `supabase/privacy_hardening.sql` : les téléphones ne sont plus lisibles par tous (0 dans `profiles`, 2 déplacés vers `profile_private`), positions arrondies, position en direct protégée. Appliqué et vérifié le 2026-11-02.
- Ne jamais ré-exécuter `profile_trigger.sql`, `storage_policies.sql`, `subscriptions_schema.sql`, `prelaunch_schema.sql`, `messages_table.sql` (voir `supabase/README_ORDRE.md`).
- Détail vérifié : `supabase/SCHEMA_SNAPSHOT.md`.

## 1. Configuration e-mail (la connexion des clients en dépend)
Dans Supabase > **Authentication** :
1. **Providers > Email** : activer. Longueur du code : l'app accepte de 6 à 10 chiffres (ton projet en envoie plus de 6, constaté le 2026-11-21).
2. **Emails > SMTP Settings** : brancher un service d'envoi (Brevo ou Resend). Sans cela, le SMTP par défaut envoie très peu de mails et seulement à ton équipe.
   - Le « mot de passe SMTP » est **créé par le service** (clé SMTP Brevo, clé API Resend `re_…`). Ne le colle jamais dans un chat.
   - Il faut un **expéditeur validé** : Resend n'envoie qu'à ton propre e-mail tant qu'un nom de domaine à toi n'est pas validé.
   - Brevo bloque parfois sur le SMS de validation d'un numéro algérien : essaie `+213 5XX…` sans le 0, l'appel vocal, ou passe à Resend.
   - Un nom de domaine à toi est nécessaire pour que les mails arrivent (achat souvent difficile avec une carte algérienne : carte virtuelle ou aide de l'étranger). Dépannage court : Gmail avec mot de passe d'application (≈ 500 mails/jour, déconseillé durablement).
3. **Emails > Templates** : modifier **Magic Link** et **Confirm signup**. Remplace le lien par `{{ .Token }}` et mets l'objet `Votre code BETI : {{ .Token }}`.

## 2. Test de bout en bout avec de vrais comptes
Rien n'a encore été essayé en vrai. Crée un compte client et un compte artisan (e-mail), puis vérifie :
1. L'artisan **accepte** une réservation (les 7 réservations existantes sont encore `pending`).
2. La mission est **clôturée**.
3. Le client laisse un **avis**.
4. Le **chat** fonctionne dans les deux sens.
5. La **facture** s'affiche.
6. La **suppression de compte** marche.

Option sans toucher à la production : un 2e projet Supabase de test (checklist : `scripts/test-project-checklist.md`). Ne colle jamais la clé `service_role` dans un chat.

## 3. Variables Vercel
- Définir **`NEXT_PUBLIC_LAUNCH_DATE`** (début des 2 mois gratuits). Sans elle, la gratuité est considérée comme **déjà finie** (date par défaut : 1er juillet 2026) et les artisans non abonnés sont **cachés** : l'annuaire paraît vide.
- Vérifier que le projet Vercel qui sert `beti-ten.vercel.app` a les variables Supabase : URL, clé anon, et clé service (nécessaire pour la suppression de compte).
- Il existe plusieurs projets `beti*` dans ton compte (`beti`, `beti-rkc2`, `beti-sada`, `beti-bo7h`, `beti-ok8c`). Garde le bon, supprime les autres.

## 4. Pousser sur GitHub
`main` a environ 48 commits d'avance sur `origin/main`. Rien n'est parti. La base est prête, donc tu peux le faire quand tu veux. Dis « pousse » et je le fais. Je ne pousse jamais de moi-même.

## 5. Décisions ouvertes
- **Avis masqué** : tranché le 2026-11-02, un avis masqué ne compte pas dans la note (`fix_integrity2.sql`, appliqué en production).
- **`artisans.location`** : le centre de la zone d'intervention reste lisible par tous et n'est pas arrondi. Ce n'est pas la position en direct. L'accepter ou l'arrondir ?
- **`siret` et assurance** : ces deux champs sont lisibles par tout visiteur (aucune valeur saisie aujourd'hui). Les cacher avant que des artisans les remplissent ?
- **Nom de domaine** (possèdes-tu `beti.dz` ? les pages légales affichent `support@beti.dz`).
- **Titre de l'accueil** : « Votre quartier est plein de bons artisans » est trompeur tant que l'annuaire est quasi vide.
- **Paiement des artisans** : abonnement 2 500 / 5 000 DA par mois, ou crédits prépayés (à tester avec ~10 artisans). Faire vérifier par un juriste que les crédits ne ressemblent pas à une commission.
- **Coordonnées de paiement des abonnements (v2)** : me donner où les artisans paient (RIB, CCP, BaridiMob). Elles vont dans `src/domain/payment.ts` ; tant qu'elles manquent, l'écran d'abonnement montre les formules mais la demande reste fermée (sans effet pendant le lancement gratuit, jusqu'au 15 janvier 2027).
- **Encaisser en Algérie** : formaliser (auto-entrepreneur ANAE ou société avec RC + NIF + compte pro), virement BaridiMob/CCP validé à la main au début, puis carte CIB/Edahabia (SATIM ou Chargily). Faire valider par un expert-comptable.
- **Vérification des artisans** : choisir le niveau réel. Jusque-là, ne jamais écrire « certifié ».
- **Juriste algérien** : CGU, confidentialité, loi 18-07, mentions de facture.
- **Stores** : comptes développeur Google/Apple (carte internationale), risque de refus Apple (règle 4.2), URL de politique de confidentialité.
- **Logo** et **pub vidéo** : valider le logo (`C:\tmp\beti-logo-pistes\`), puis dire si tu veux la vidéo refaite (`C:\Users\raouf\Desktop\betii-video\out\`) et quelle voix.

## 6. Ce que je ferai à ta prochaine venue (dis « reprends »)
1. Corriger la page des réglages (elle écrit encore `profiles.phone`).
2. Mettre à jour `maplibre-gl` (faille de nettoyage HTML, à tester sur la carte).
3. Brancher Better Stack / Sentry (voir `CLAUDE.md`).
4. Nettoyer ESLint (220 erreurs anciennes, CI non bloquante).

## Rappels
- Note actuelle estimée : **≈ 60/100**. Le code seul peut monter vers 75–80 ; au-delà, il faut de vrais artisans, un juriste et une entité légale.
- Les MCP Supabase, Vercel et Better Stack sont connectés. Le garde-fou de Claude Code **refuse** mes écritures en production : les scripts SQL sont à coller par toi.
