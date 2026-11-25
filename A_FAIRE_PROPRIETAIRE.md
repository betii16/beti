# À faire par toi (propriétaire) : état au 2026-11-26

## L'essentiel aujourd'hui (v2)
La v2 a été envoyée sur GitHub le 2026-11-23 (`main`), ce qui la met en ligne par Vercel. Ce qui reste, par ordre d'importance :

1. **Service d'envoi d'e-mails** (section 1 plus bas, toujours valable). Sans lui, seules les adresses de ton équipe reçoivent le code de connexion : aucun vrai utilisateur ne peut s'inscrire.
2. **Clé `service_role` dans Vercel** (variable `SUPABASE_SERVICE_ROLE_KEY`, à prendre dans Supabase > Project Settings > API keys). Elle sert à « Supprimer mon compte ». Tu la colles toi-même dans Vercel, jamais dans le chat. Ensuite, essai avec un compte jetable (pas le tien : un compte de l'équipe est refusé, exprès).
3. **Supprimer les quatre projets Vercel en trop** (`beti-sada`, `beti-rkc2`, `beti-ok8c`, `beti-bo7h`). Ils sont tous branchés sur le dépôt : chaque envoi les reconstruit tous. Garde `beti`.
4. **Essai entre deux comptes** : demande, acceptation avec prix, conversation, suivi de position, avis. Jamais fait, faute de second compte.
5. **Coordonnées de paiement** des abonnements (CCP, BaridiMob…). Sans elles, la demande d'abonnement reste fermée. Le lancement gratuit se termine vers le 15 janvier 2027 (date réglable dans le panneau admin).
6. **Relectures** : l'arabe par une personne arabophone ; les CGU, la confidentialité et les mentions par un juriste (détail : « Papiers pour lancer », point 7).
7. **Ton profil d'essai** est publié, visible de tous : à garder ou à retirer (« Je suis artisan » > « Retirer de la recherche »).
8. **Le dépôt GitHub est public** : le code et les notes de travail sont lisibles par tous. Tu peux le passer en privé (GitHub > Settings > General > Danger Zone), Vercel continue de fonctionner.

Les papiers pour exister légalement et lancer (statut, domaine, marque, données personnelles, stores) sont dans la section suivante.

## Papiers pour lancer BETI en Algérie (point du 2026-11-26)
Informations, pas un avis juridique : chaque choix se fait avec un juriste ou un comptable. Lu le 2026-11-26 dans les sources officielles, depuis le navigateur du propriétaire : la loi 18-05 (Journal officiel n° 28 de 2018), la loi 18-07 (JO n° 34 de 2018), la loi 25-11 (JO n° 48 de 2025), nic.dz, anae.dz, inapi.dz. Les textes du JO sont ceux de leur parution : une modification plus récente n'a pas été cherchée. Pas pu lire : commerce.gov.dz et anpdp.dz (connexion refusée), la loi 22-23 sur l'auto-entrepreneur et la charte de nommage du `.dz` (PDF illisibles par l'outil). Ce qui reste marqué « à confirmer » vient de guides.

**Réponses retenues le 2026-11-26** (le propriétaire ne veut pas dépendre d'un juriste ; guide pas à pas : https://claude.ai/artifact/H7VZaPDebpQQAkJpPGL3LH). Les questions en gras ci-dessous se posent aux guichets, gratuitement : antenne du CNRC de la wilaya, ANAE, ANPDP.
- Statut : registre du commerce (en nom propre ou en EURL), pas la carte d'auto-entrepreneur.
- Hébergement : en Algérie et en `.com.dz` avant de vendre les abonnements ; tant que BETI est gratuit, il reste où il est. Héberger en Algérie règle aussi le transfert des données : chantier technique à prévoir (site et base sur un serveur algérien).
- Données : d'ici là, case de consentement exprès à l'inscription (loi 18-07, art. 45), qui dit où sont les données. Pas encore écrite dans le site.

**Cette semaine** : passer au guichet du CNRC, prendre un domaine générique pour débloquer les e-mails, lancer la recherche d'antériorité sur « BETI ».

1. **Statut** (avec un comptable). Tout le reste en dépend : NIF, compte pro, `.com.dz`, paiement en ligne, déclaration ANPDP, mentions légales.
   - Auto-entrepreneur : carte ANAE demandée en ligne (activités sur activities.anae.dz), sans registre du commerce ni local, impôt réduit, plafond de 5 M DA de chiffre d'affaires par an (≈ 166 artisans Basique ou 83 Premium à l'année).
   - Société (EURL si seul) au CNRC : RC, NIF, compte bancaire pro. Plus de démarches (notaire, comptable), mais ouvre `.com.dz`, Chargily, les comptes « organisation » des stores et le label start-up.
   - Loi 18-05, lue au JO. Art. 6 : vendre un service à distance est du commerce électronique (les abonnements de BETI en sont). Art. 8 : l'activité est « soumise à inscription, selon le cas, au registre du commerce ou au registre de l'artisanat et des métiers ». Art. 42 : le nom de domaine de celui qui vend en ligne sans inscription au registre du commerce est suspendu sur décision du ministère du Commerce.
   - Liste ANAE, lue sur activities.anae.dz : les 288 activités « Services numériques » sont des métiers exercés seul (développeur, community manager, marketeur e-commerce…). Aucune ne décrit l'exploitation d'une plateforme qui vend des abonnements.
   - **Question au juriste ou au CNRC** : la carte ANAE suffit-elle pour vendre les abonnements de BETI, ou faut-il le registre du commerce (donc la société) ? Les deux lectures ci-dessus penchent vers le registre du commerce.
   - Label start-up (startup.dz) : après la société (dossier avec RC, NIF, business model ; réponse en 30 jours ouvrables). Selon la loi de finances 2026 : exonération d'impôt pendant 4 ans, accès à l'Algeria Startup Fund.
   - Bloque l'encaissement des abonnements, pas le site gratuit.
2. **Nom de domaine. Bloque le lancement** : sans lui, le service d'e-mails (section 1) n'envoie pas les codes, et personne hors de l'équipe ne peut s'inscrire.
   - Rapide : un domaine générique (`.com`, `.app`…) chez un registrar étranger, payé par carte internationale ou virtuelle.
   - `.dz` (lu sur nic.dz) : toute demande passe par un registrar agréé, avec un formulaire signé et une pièce qui justifie le nom : copie du registre du commerce, ou dépôt de marque à l'INAPI, ou décret de création. Donc rien pour un particulier sans RC ni marque.
   - Loi 18-05, lue au JO. Art. 8 : le vendeur en ligne doit publier « un site ou une page web hébergé en Algérie avec une extension .com.dz ». Art. 9 : le nom de domaine se dépose au CNRC, qui tient le fichier national des e-fournisseurs. Or BETI est hébergé hors d'Algérie, sur une adresse `vercel.app`. **Question au juriste** : que faut-il héberger en Algérie, et pour quand (dès la vente des abonnements) ?
3. **Marque « BETI » à l'INAPI** : protège le nom 10 ans (renouvelable) et ouvre `beti.dz`. Ne bloque pas, mais le premier qui dépose garde le nom. Lu sur inapi.dz :
   - Recherche d'antériorité d'abord : 1 600 DA à l'identique (une marque, une classe, + 400 DA par classe en plus) ou 3 000 DA en similitude (jusqu'à 3 classes). Rapport sous 48 h.
   - Dépôt : 15 000 DA (16 000 DA avec couleurs) + 2 000 DA par classe jusqu'à la troisième, 5 000 DA au-delà.
   - Comment : compte sur inapi.dz, formulaire en ligne, paiement en espèces dans une agence CNEP, puis dossier papier en 3 exemplaires à déposer à l'INAPI (Alger, Boumerdès, Sétif ou Oran).
4. **Données personnelles : ANPDP** (loi 18-07, modifiée par la loi 25-11 de juillet 2025). À régler avant d'ouvrir largement les inscriptions. Lu au JO :
   - Art. 12 et 13 : tout traitement demande une déclaration préalable à l'ANPDP (ou une autorisation, selon le cas). Elle peut se faire par voie électronique ; le récépissé arrive sous 48 h et permet de commencer. Elle se fait au nom du statut choisi.
   - Art. 44 : pas de transfert vers un État étranger sans autorisation de l'ANPDP, et seulement si cet État protège assez les données. Art. 45, exceptions : consentement exprès de la personne, transfert nécessaire à l'exécution d'un contrat avec elle, accord international. Or les données de BETI sont hors d'Algérie (base Supabase en Irlande, `eu-west-1` ; site sur Vercel, États-Unis par défaut).
   - Loi 25-11 (juillet 2025), nouvelles obligations : désigner un délégué à la protection des données et le signaler à l'ANPDP (art. 41 bis), tenir un registre des traitements (art. 41 bis 2) et un journal automatisé des opérations (art. 41 bis 3, modalités à venir par décret). Elle ne touche pas aux art. 44 et 45. L'étude d'impact et la notification des fuites figurent dans un titre consacré à la police et à la justice.
   - **Questions au juriste** : pour l'étranger, demander l'autorisation, s'appuyer sur une exception, ou héberger en Algérie (gros chantier, seulement après son avis, et à rapprocher de l'art. 8 de la loi 18-05, point 2) ? Les obligations de la loi 25-11 (délégué, étude d'impact, notification) valent-elles pour une petite structure comme BETI ?
5. **Paiement des abonnements**, avant la fin du lancement gratuit (date réglable dans le panneau admin, sans code, si le statut n'est pas prêt).
   - CCP / BaridiMob validé à la main : déjà prévu par le site, il ne manque que les coordonnées (`src/domain/payment.ts`). Pas sur un CCP personnel : il faut le statut pour facturer.
   - Carte CIB / Edahabia par Chargily Pay : nationalité algérienne, résidence en Algérie, site inscrit au registre du commerce ou au répertoire des métiers ; sans abonnement, 1,5 % à 4,5 % par paiement, 300 paiements offerts au départ ; pas de prélèvement automatique (l'artisan repaie chaque mois).
   - Loi 18-05, lue au JO. Art. 27 : un paiement électronique passe par une plateforme exploitée par une banque agréée ou par Algérie Poste. Art. 11 : l'offre affiche le NIF, les adresses physique et électronique, le téléphone, le n° de registre du commerce ou de carte d'artisan, le prix TTC, les conditions générales de vente (avec la protection des données), les modalités de paiement et de résiliation ; un manquement coûte de 50 000 à 500 000 DA (art. 39). Art. 25 : garder le registre des ventes et le transmettre au CNRC.
6. **Stores**, pour l'appli seulement (le site s'installe déjà sur le téléphone sans store).
   - Google Play d'abord : 25 $ une fois (carte internationale). Compte personnel : test fermé avec 12 testeurs pendant 14 jours avant de publier. Compte organisation : numéro D-U-N-S, donc une société.
   - Apple : 99 $ par an. Risque de refus (règle 4.2) : l'appli charge le site en ligne.
   - Les deux : page de confidentialité corrigée (point 7) et suppression de compte qui marche (clé service, point 2 de « L'essentiel »).
7. **Relecture des textes juridiques** (`src/legal/documents.ts`, non réécrits). Ce qui ne colle plus à la v2 :
   - CGU : inscription « par numéro de téléphone », code par SMS ou WhatsApp (la v2 envoie un code par e-mail ; le téléphone n'est obligatoire que pour qu'un artisan publie) ; formules « Standard ou Premium » (le site dit Basique 2 500 DA et Premium 5 000 DA) ; moyens de paiement cités pas encore fixés ; rien sur le partage de position ni les signalements.
   - Confidentialité : le compte se crée par e-mail, pas par téléphone ; SMS/WhatsApp cités deux fois, service d'envoi d'e-mails absent. Manquent : la position en direct de l'artisan (toutes les 10 s pendant une demande acceptée), sa zone arrondie à 1 km visible de tous, « Près de moi », les photos (position GPS retirée), la carte OpenFreeMap (adresse IP du visiteur), le lieu des données (Irlande, États-Unis), des durées de conservation. Le « thème clair/sombre en stockage local » n'existe pas (session en cookies).
   - Mentions légales : champs entre crochets, à remplir selon le statut (pour une société : raison sociale, RC, NIF, siège) ; Supabase cité sans société ni pays.
   - Partout : `support@beti.dz` (domaine pas acheté), « Dernière mise à jour : juin 2026 ».

Ensuite, dans l'ordre : statut, NIF et compte, ANPDP, marque, `.com.dz`, paiement, relecture des textes, Google Play, label start-up.

Les sections suivantes datent de la v1 (état au 2026-11-02). Les sections 1 et 3 restent utiles ; les fichiers SQL qu'elles citent n'existent plus dans la v2.

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
- (v1 seulement : la v2 lit la date de fin du lancement dans la base, réglable dans le panneau admin.) Définir **`NEXT_PUBLIC_LAUNCH_DATE`** (début des 2 mois gratuits). Sans elle, la gratuité est considérée comme **déjà finie** (date par défaut : 1er juillet 2026) et les artisans non abonnés sont **cachés** : l'annuaire paraît vide.
- Vérifier que le projet Vercel qui sert `beti-ten.vercel.app` a les variables Supabase : URL, clé anon, et clé service (nécessaire pour la suppression de compte).
- v2 (2026-11-22) : la suppression de compte est écrite, mais elle n'a jamais tourné. Il lui faut `SUPABASE_SERVICE_ROLE_KEY` (Supabase > Project Settings > API keys > `service_role`) : dans Vercel pour le site, et dans `.env.local` pour l'essayer ici. Tu la colles toi-même dans le fichier ou dans Vercel, jamais dans le chat. Ensuite, essai avec un compte jetable (pas le tien : un compte de l'équipe est refusé, exprès).
- Il existe plusieurs projets `beti*` dans ton compte (`beti`, `beti-rkc2`, `beti-sada`, `beti-bo7h`, `beti-ok8c`). Garde le bon, supprime les autres.

## 4. Pousser sur GitHub
Fait le 2026-11-23 : la v2 est sur GitHub (`main`). Pour un nouvel envoi, dis « pousse » ; je ne pousse jamais de moi-même.

## 5. Décisions ouvertes
- **Avis masqué** : tranché le 2026-11-02, un avis masqué ne compte pas dans la note (`fix_integrity2.sql`, appliqué en production).
- **`artisans.location`** : le centre de la zone d'intervention reste lisible par tous et n'est pas arrondi. Ce n'est pas la position en direct. L'accepter ou l'arrondir ?
- **`siret` et assurance** : ces deux champs sont lisibles par tout visiteur (aucune valeur saisie aujourd'hui). Les cacher avant que des artisans les remplissent ?
- **Titre de l'accueil** : « Votre quartier est plein de bons artisans » est trompeur tant que l'annuaire est quasi vide.
- **Paiement des artisans** : abonnement 2 500 / 5 000 DA par mois, ou crédits prépayés (à tester avec ~10 artisans). Faire vérifier par un juriste que les crédits ne ressemblent pas à une commission.
- **Coordonnées de paiement des abonnements (v2)** : me donner où les artisans paient (RIB, CCP, BaridiMob). Elles vont dans `src/domain/payment.ts` ; tant qu'elles manquent, l'écran d'abonnement montre les formules mais la demande reste fermée (sans effet pendant le lancement gratuit, jusqu'au 15 janvier 2027).
- **Nom de domaine, encaissement, juriste, stores** : repris dans « Papiers pour lancer » (2026-11-26).
- **Vérification des artisans** : choisir le niveau réel. Jusque-là, ne jamais écrire « certifié ».
- **Logo** et **pub vidéo** : valider le logo (`C:\tmp\beti-logo-pistes\`), puis dire si tu veux la vidéo refaite (`C:\Users\raouf\Desktop\betii-video\out\`) et quelle voix.

## 6. Ce que je ferai à ta prochaine venue (dis « reprends »)
1. Corriger la page des réglages (elle écrit encore `profiles.phone`).
2. Mettre à jour `maplibre-gl` (faille de nettoyage HTML, à tester sur la carte).
3. Brancher Better Stack / Sentry (voir `CLAUDE.md`).
4. Nettoyer ESLint (220 erreurs anciennes, CI non bloquante).

## Rappels
- Note actuelle estimée : **≈ 60/100**. Le code seul peut monter vers 75–80 ; au-delà, il faut de vrais artisans, un juriste et une entité légale.
- Les MCP Supabase, Vercel et Better Stack sont connectés. Le garde-fou de Claude Code **refuse** mes écritures en production : les scripts SQL sont à coller par toi.
