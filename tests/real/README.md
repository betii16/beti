# Tests reels (projet Supabase de TEST)

Scenarios Playwright contre `next dev --webpack` branche sur un projet Supabase de TEST, jamais la production.

- Preparation : `scripts/test-project-checklist.md`
- Diagnostic sans secret : `npm run test:real:setup`
- Lancement : `npm run test:real`

| Fichier | Contenu |
| --- | --- |
| `journey.spec.ts` | recherche, fiche, reservation, chat (2 contextes), acceptation, mission, avis, facture (3000 DA), suppression de compte |
| `security.spec.ts` | attaques qui doivent echouer : role admin, plan premium, storage d'autrui, listage anonyme, RPC de position, telephones |
| `protected-pages.spec.ts` | redirection vers `/auth/login` (avec `?next`) sans session ; acces `/admin` selon le role |
| `fixtures.ts` | comptes (API admin), sessions, injection `beti-auth`, seeds, `cleanup()` |

Chaque attaque a un temoin (action legitime qui doit reussir). Un echec cite le fichier SQL a appliquer
(ex. `supabase/emergency_hardening.sql non applique sur le projet de test`). Le test des telephones est
marque `fixme` tant que `profile_private` n'existe pas.

Le serveur de dev est toujours demarre par la config (jamais reutilise) avec les cles de test. Pas de trace, video ni capture.
