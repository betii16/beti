-- ============================================================================
-- BETI : bascule v1 → v2, étape 3 sur 3. Recrée les fiches des comptes existants.
-- ============================================================================
-- À exécuter UNE FOIS, APRÈS les migrations v2. Les comptes de connexion
-- (auth.users) n'ont pas bougé ; il leur manque la fiche privée et le contact de
-- la v2. Rejouable sans risque (on conflict do nothing).
-- Les fiches d'artisan, demandes et messages de la v1 ne sont pas repris : ce
-- sont des essais. Ils restent consultables dans v1_archive.
-- ============================================================================

insert into public.profiles (id, role, full_name, lang)
select u.id,
       case when coalesce(o.role::text, u.raw_user_meta_data ->> 'role') = 'artisan' then 'artisan' else 'client' end,
       left(btrim(coalesce(nullif(o.full_name, ''), u.raw_user_meta_data ->> 'full_name', '')), 80),
       'fr'
  from auth.users u
  left join v1_archive.profiles o on o.id = u.id
on conflict (id) do nothing;

-- Un numéro n'est « vérifié » que s'il vient de la connexion par code (auth.users.phone).
insert into public.user_contacts (user_id, phone, phone_verified)
select u.id,
       case when x.phone ~ '^\+[1-9][0-9]{7,14}$' then x.phone end,
       coalesce(x.from_auth and u.phone_confirmed_at is not null and x.phone ~ '^\+[1-9][0-9]{7,14}$', false)
  from auth.users u
  left join v1_archive.profile_private pp on pp.id = u.id
 cross join lateral (
   select case when coalesce(u.phone, '') <> '' then '+' || ltrim(u.phone, '+') else pp.phone end as phone,
          coalesce(u.phone, '') <> '' as from_auth
 ) x
on conflict (user_id) do nothing;

-- Premier administrateur : à faire à la main, avec l'adresse du compte voulu.
-- insert into private.staff (user_id, role)
-- select id, 'admin' from auth.users where email = 'adresse@exemple.dz';
