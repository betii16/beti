-- ============================================================================
-- BETI : CORRECTIF BLOQUANT (constate sur la base de production le 2026-11-01)
--
-- Probleme : le type public.booking_status vaut
--   pending, accepted, refused, in_progress, completed, cancelled
-- alors que l'application (acceptation d'une reservation par l'artisan, planning,
-- chat, suivi, recherche de doublons dans BookingFlow et contactArtisan) utilise
-- la valeur 'confirmed', qui n'existe pas. Consequence : l'acceptation echoue
-- (invalid input value for enum booking_status: "confirmed") et les 7 reservations
-- existantes sont toutes restees 'pending'.
--
-- Correctif : ajouter la valeur manquante. 'accepted' reste dans le type (inutilise).
--
-- A EXECUTER SEUL, dans une requete a part (ALTER TYPE ... ADD VALUE ne doit pas
-- etre melange a d'autres instructions qui utiliseraient la nouvelle valeur),
-- dans Supabase > SQL Editor. Re-executable sans erreur.
-- ============================================================================

alter type public.booking_status add value if not exists 'confirmed';

-- VERIFICATION (a lancer ensuite, lecture seule) :
-- select enumlabel from pg_enum where enumtypid = 'public.booking_status'::regtype order by enumsortorder;
-- -- doit lister : pending, accepted, refused, in_progress, completed, cancelled, confirmed
