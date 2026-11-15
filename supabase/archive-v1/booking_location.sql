-- ============================================================================
-- BETI — Position GPS de la réservation (curseur carte façon Uber/Yassir)
-- ============================================================================
-- À exécuter UNE FOIS dans Supabase > SQL Editor. Idempotent.
--
-- Contexte : à l'étape adresse du flux de réservation, le client ajuste un
-- curseur sur une mini-carte ; l'adresse est remplie automatiquement par
-- reverse-geocoding. On stocke aussi les coordonnées exactes pour que l'artisan
-- puisse ouvrir l'itinéraire directement.
-- ============================================================================

alter table public.bookings add column if not exists lat double precision;
alter table public.bookings add column if not exists lng double precision;
