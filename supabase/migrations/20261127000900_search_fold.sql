-- ============================================================================
-- BETI v2 : recherche par mot-clé sans accents ni variantes d'écriture (2026-11-27)
-- ============================================================================
-- Jusqu'ici search_artisans comparait le mot tapé tel quel (ilike) : « electricien »
-- ne trouvait pas « Électricien », « اصلاح » ne trouvait pas « إصلاح », et le métier
-- choisi par l'artisan n'était pas cherché du tout. private.fold() ramène les deux
-- côtés à une forme simple : minuscules, sans accents ; en arabe, alif sans hamza,
-- ta marbouta en ha, alif maqsoura en ya, sans voyelles ni tatweel. La recherche
-- compare ces formes et regarde aussi le métier (slug : « plomberie », « electricite »).
-- Le reste de search_artisans ne change pas : mêmes paramètres, même résultat,
-- toujours security definer (…000700) ; ses droits d'exécution sont gardés.
--
-- Retour arrière : recréer search_artisans comme dans …000300 en security definer,
--   puis drop function private.fold(text).
-- ============================================================================

-- translate() remplace lettre à lettre ; les lettres de la première liste sans
-- correspondante dans la seconde (tatweel, voyelles arabes) sont retirées.
create function private.fold(p_text text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select lower(translate(
    coalesce(p_text, ''),
    'ÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝàâäáãåçéèêëíìîïñóòôöõúùûüýÿأإآٱةىـًٌٍَُِّْٰ',
    'AAAAAACEEEEIIIINOOOOOUUUUYaaaaaaceeeeiiiinooooouuuuyyااااهي'
  ))
$$;

-- Fonction interne : seule la recherche (security definer) s'en sert.
revoke all on function private.fold(text) from public, anon, authenticated;
grant execute on function private.fold(text) to service_role;

create or replace function public.search_artisans(
  p_category    text default null,
  p_wilaya_code integer default null,
  p_q           text default null,
  p_lat         numeric default null,
  p_lng         numeric default null,
  p_limit       integer default 24,
  p_offset      integer default 0
) returns table (
  id             uuid,
  display_name   text,
  category       text,
  skills         text[],
  bio            text,
  hourly_rate    integer,
  wilaya_code    smallint,
  commune        text,
  lat            numeric,
  lng            numeric,
  avatar_path    text,
  cover_path     text,
  is_available   boolean,
  is_premium     boolean,
  phone_verified boolean,
  verified       boolean,
  rating_avg     numeric,
  rating_count   integer,
  jobs_done      integer,
  distance_km    numeric
)
language sql stable security definer set search_path = '' as $$
  select s.*
  from (
    select
      a.id, a.display_name, a.category, a.skills, a.bio, a.hourly_rate, a.wilaya_code, a.commune,
      a.lat, a.lng, a.avatar_path, a.cover_path, a.is_available,
      (a.plan = 'premium' and a.plan_until is not null and a.plan_until > now()) as is_premium,
      a.phone_verified,
      (a.verified_at is not null) as verified,
      a.rating_avg, a.rating_count, a.jobs_done,
      case when p_lat is not null and p_lng is not null and a.lat is not null and a.lng is not null
           then private.distance_km(p_lat, p_lng, a.lat, a.lng) end as distance_km
    from public.artisans a
    cross join (
      select replace(replace(replace(private.fold(left(btrim(coalesce(p_q, '')), 60)), '\', '\\'), '%', '\%'), '_', '\_') as q
    ) f
    where a.published and not a.suspended
      and (private.launch_free() or (a.plan <> 'free' and a.plan_until is not null and a.plan_until > now()))
      and (p_category is null or a.category = p_category)
      and (p_wilaya_code is null or a.wilaya_code = p_wilaya_code)
      and (
        f.q = ''
        or a.category like '%' || f.q || '%'
        or private.fold(a.display_name) like '%' || f.q || '%'
        or private.fold(a.bio) like '%' || f.q || '%'
        or exists (select 1 from unnest(a.skills) as sk where private.fold(sk) like '%' || f.q || '%')
      )
  ) s
  order by s.is_premium desc, s.distance_km asc nulls last, s.rating_avg desc, s.jobs_done desc, s.id
  limit least(greatest(coalesce(p_limit, 24), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;
