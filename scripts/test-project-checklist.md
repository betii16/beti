# Preparer le projet Supabase de TEST

Objectif : un projet Supabase JETABLE, distinct de la production (reference `cqsejaarturvbilyvbfs`), pour
lancer `npm run test:real` sans SMS. Les comptes de test sont crees par l'API d'administration
(e-mail + mot de passe), puis la session est injectee dans le navigateur (cle `beti-auth`).

1. **Creer le projet.** supabase.com > New project, nom `beti-test`. Region proche, mot de passe de base quelconque.
2. **Executer le SQL, dans cet ordre** (SQL Editor, un fichier a la fois, sans erreur avant de passer au suivant) :
   1. `supabase/rls_policies.sql`
   2. `supabase/security_hardening.sql`
   3. `supabase/privacy_hardening.sql`
   4. `supabase/launch_hardening.sql`
   5. `supabase/emergency_hardening.sql`

   Les schemas par fonctionnalite necessaires au parcours (`prelaunch_schema.sql`, `messages_table.sql`,
   `portfolio_and_reviews.sql`, `subscriptions_schema.sql`, `offers_schema.sql`, `profile_trigger.sql`...) doivent
   exister AVANT la chaine de durcissement : applique-les d'abord s'ils manquent, puis relance la chaine.
   Ne re-execute jamais apres coup les fichiers listes dans `supabase/README_ORDRE.md` (ils annulent le durcissement).
   Les fonctions `get_nearby_artisans` et `update_artisan_location` ne sont pas creees par le depot : copie-les
   depuis la base de production (Database > Functions) si elles manquent.
3. **Creer le bucket** : Storage > New bucket > `beti-photos`, cocher *Public bucket*.
4. **Auth** : Authentication > Providers > Email active (mot de passe autorise). Pas besoin de SMTP : les comptes
   sont crees deja confirmes. Laisse le fournisseur Phone tel quel.
5. **Noter les cles** : Project Settings > API : `URL`, `anon public`, `service_role` (secret, ne jamais l'envoyer ni la commiter).
6. **Creer `.env.test.local`** a la racine (copie `.env.test.local.example`, fichier ignore par git) :
   ```
   TEST_SUPABASE_URL=https://<ref-de-test>.supabase.co
   TEST_SUPABASE_ANON_KEY=...
   TEST_SUPABASE_SERVICE_ROLE_KEY=...
   ```
7. **Verifier** : `npm run test:real:setup` (aucun secret affiche), puis `npm run test:real`.

Garde-fous : le harnais quitte sans rien executer si `.env.test.local` manque, si une variable est vide, ou si l'URL,
le fichier ou une cle JWT contient la reference de production. Il n'utilise jamais de variables du shell ni
`.env.local`. Les comptes crees (`qa+<run>-...@beti-test.invalid`) sont supprimes apres chaque test et
balayes en fin d'execution.
