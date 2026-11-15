-- ============================================================================
-- BETI : correctif d'URGENCE pour la base de production (verifie par lecture
-- de la vraie base le 2026-11-01). Additif : aucune suppression de donnees.
-- A executer UNE FOIS dans Supabase > SQL Editor (projet BETI), puis lancer les
-- verifications en bas. Re-executable sans erreur.
--
-- Failles corrigees (exploitables avec la cle publique du site) :
--  1. devenir admin : profiles_update sans garde + handle_new_user copie le role
--     demande a l'inscription (user_role contient 'admin').
--  2. abonnement Premium gratuit : le garde plan ne couvre que l'UPDATE.
--  3. bucket beti-photos : tout connecte pouvait supprimer/remplacer les photos
--     des autres, listage public, aucun type ni taille limites.
--  4. update_artisan_location appelable sans connexion, sans controle du proprietaire.
-- NON couvert ici (demande la chaine complete) : telephones lisibles par tous
-- (profiles_select) -> privacy_hardening.sql apres security_hardening.sql.
-- ============================================================================

-- 1. Role : jamais 'admin' a l'inscription, jamais modifiable par l'utilisateur.
create or replace function public.guard_profile_role()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    if tg_op = 'INSERT' then
      if new.role::text not in ('client', 'artisan') then new.role := 'client'; end if;
      new.is_verified := false;
    else
      new.role := old.role;
      new.is_verified := old.is_verified;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_profile_role on public.profiles;
create trigger trg_guard_profile_role
  before insert or update on public.profiles
  for each row execute function public.guard_profile_role();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    (case when new.raw_user_meta_data->>'role' in ('client', 'artisan')
          then new.raw_user_meta_data->>'role' else 'client' end)::public.user_role
  )
  on conflict (id) do nothing;
  return new;
end; $$;

-- 2. Abonnement et statistiques : valeurs forcees a la creation de la fiche artisan.
create or replace function public.guard_artisan_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.plan := 'free';
    new.plan_until := null;
    new.rating_avg := 0;
    new.rating_count := 0;
    new.total_missions := 0;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_artisan_insert on public.artisans;
create trigger trg_guard_artisan_insert
  before insert on public.artisans
  for each row execute function public.guard_artisan_insert();

-- 3. Stockage beti-photos : plus de listage public, modification et suppression
--    limitees au proprietaire, 5 Mo et JPG/PNG/WebP maximum.
drop policy if exists "beti-photos read" on storage.objects;
drop policy if exists "beti-photos update" on storage.objects;
drop policy if exists "beti-photos delete" on storage.objects;
drop policy if exists "beti-photos read own" on storage.objects;
drop policy if exists "beti-photos update own" on storage.objects;
drop policy if exists "beti-photos delete own" on storage.objects;

create policy "beti-photos read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'beti-photos' and owner_id = auth.uid()::text);
create policy "beti-photos update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'beti-photos' and owner_id = auth.uid()::text)
  with check (bucket_id = 'beti-photos' and owner_id = auth.uid()::text);
create policy "beti-photos delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'beti-photos' and owner_id = auth.uid()::text);

update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'beti-photos';

-- 4. Position : reservee a l'artisan concerne (ou admin), plus appelable sans connexion.
create or replace function public.update_artisan_location(artisan_id uuid, latitude double precision, longitude double precision)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or (artisan_id is distinct from auth.uid() and not public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.artisans
     set location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
   where id = artisan_id;
end; $$;

revoke execute on function public.update_artisan_location(uuid, double precision, double precision) from public, anon;
grant execute on function public.update_artisan_location(uuid, double precision, double precision) to authenticated;

-- 5. Fonctions de declencheurs : plus appelables directement par l'API publique.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.notify_on_booking() from public, anon, authenticated;
revoke execute on function public.notify_on_booking_status() from public, anon, authenticated;
revoke execute on function public.notify_on_message() from public, anon, authenticated;
revoke execute on function public.recalc_artisan_rating() from public, anon, authenticated;
revoke execute on function public.guard_artisan_plan() from public, anon, authenticated;
revoke execute on function public.guard_profile_role() from public, anon, authenticated;
revoke execute on function public.guard_artisan_insert() from public, anon, authenticated;

-- ============================================================================
-- VERIFICATIONS (lecture seule, a lancer apres)
-- select tgname from pg_trigger where tgname in ('trg_guard_profile_role','trg_guard_artisan_insert');   -- 2 lignes
-- select policyname from pg_policies where schemaname='storage' and policyname like 'beti-photos%';       -- 3 lignes "... own"
-- select file_size_limit, allowed_mime_types from storage.buckets where id='beti-photos';                  -- 5242880 + 3 types
-- select has_function_privilege('anon','public.update_artisan_location(uuid,double precision,double precision)','execute'); -- false
-- Test d'attaque (doit renvoyer 'client', pas 'admin') :
-- do $$ declare r text; uid uuid; begin
--   select id into uid from public.profiles where role::text='client' limit 1;
--   perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role','authenticated')::text, true);
--   set local role authenticated;
--   update public.profiles set role = 'admin' where id = uid;
--   select role::text into r from public.profiles where id = uid;
--   raise exception 'RESULTAT role=% (attendu: client)', r;   -- l'exception annule tout
-- end $$;
