-- ============================================================================
-- BETI : la recherche par proximite (get_nearby_artisans) est CASSEE en production.
-- Constate le 2026-11-03 sur la base reelle.
--
-- Deux versions existent (parametre service_category et parametre text) :
--  * PostgREST ne sait pas laquelle appeler (erreur PGRST203) : la page Recherche
--    affiche « Impossible de charger les artisans » ;
--  * chaque version plante aussi toute seule : les parametres `lat` et `lng`
--    portent le meme nom que les colonnes de artisans (42702 « column reference
--    is ambiguous »).
--
-- Correctif : une seule fonction, qui garde les noms de parametres utilises par
-- l'application (lat, lng, radius_km, category_filter) et renvoie les colonnes
-- attendues par app/recherche/page.tsx et app/page.tsx. Elle lit artisans.lat/lng
-- (position ARRONDIE, ~1 km : voir privacy_hardening.sql), jamais la position exacte,
-- et s'execute avec les droits de l'appelant (pas de security definer, aucun telephone).
--
-- A executer dans le SQL Editor de Supabase (Supabase demande une confirmation
-- a cause des « drop function »). Re-executable.
-- ============================================================================

drop function if exists public.get_nearby_artisans(double precision, double precision, double precision, public.service_category);
drop function if exists public.get_nearby_artisans(double precision, double precision, double precision, text);

create or replace function public.get_nearby_artisans(
  lat double precision,
  lng double precision,
  radius_km double precision default 20,
  category_filter text default null
)
returns table (
  artisan_id uuid, full_name text, avatar_url text, category text,
  rating_avg numeric, rating_count integer, hourly_rate numeric,
  distance_km double precision, is_available boolean, total_missions integer, bio text
)
language plpgsql stable set search_path = public as $$
#variable_conflict use_variable
begin
  return query
  select a.id, p.full_name, p.avatar_url, a.category::text,
         a.rating_avg, a.rating_count, a.hourly_rate,
         d.km, a.is_available, a.total_missions, a.bio
  from public.artisans a
  join public.profiles p on p.id = a.id
  cross join lateral (
    select (6371 * acos(least(1.0, greatest(-1.0,
      cos(radians(lat)) * cos(radians(a.lat)) * cos(radians(a.lng) - radians(lng))
      + sin(radians(lat)) * sin(radians(a.lat)))))) as km
  ) d
  where a.lat is not null and a.lng is not null
    and p.is_active is not false
    and (category_filter is null or a.category::text = category_filter)
    and d.km <= radius_km
  order by d.km
  limit 50;
end; $$;

-- VERIFICATIONS (lecture seule, apres execution)
-- select count(*) from pg_proc where proname = 'get_nearby_artisans' and pronamespace = 'public'::regnamespace;  -- 1
-- select artisan_id, distance_km from public.get_nearby_artisans(36.75, 3.06, 50);  -- 2 artisans (ceux qui ont lat/lng)
-- select * from public.get_nearby_artisans(lat => 36.75, lng => 3.06, radius_km => 50, category_filter => null);  -- sans erreur
