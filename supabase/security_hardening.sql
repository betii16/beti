-- ============================================================================
-- BETI — Durcissement sécurité (audit QA 2026-10-05)
-- ============================================================================
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS :
--   rls_policies.sql, prelaunch_schema.sql, subscriptions_schema.sql,
--   storage_policies.sql, subscription_notifications.sql
-- Idempotent : peut être relancé sans risque.
--
-- Corrige :
--   1. Élévation de privilèges : un utilisateur pouvait se passer admin.
--   2. Statut des réservations modifiable librement (faux « terminé » → faux avis).
--   3. Note / missions de l'artisan falsifiables ; abonnement auto-créé « actif ».
--   4. Storage : tout connecté pouvait écraser/supprimer les fichiers des autres.
--   5. Notifs manquantes (travail signalé terminé, annulation) + compteur missions.
--   6. Realtime : notifications absentes de la publication (badges figés).
--
-- Principe des gardes : les fonctions « security definer » (triggers internes)
-- s'exécutent sous le rôle propriétaire, pas sous `authenticated`/`anon`.
-- On ne bride donc que les écritures venant directement du client.
-- ============================================================================

create or replace function public.is_client_write()
returns boolean language sql stable as $$
  select current_user in ('authenticated', 'anon') and not public.is_admin();
$$;

-- ── 1. PROFILES : le rôle n'est modifiable que par un admin ─────────────────
create or replace function public.guard_profile_role()
returns trigger language plpgsql as $$
begin
  if public.is_client_write() then
    if tg_op = 'INSERT' then
      if new.role::text not in ('client', 'artisan') then
        new.role := 'client';
      end if;
    elsif new.role is distinct from old.role then
      new.role := old.role;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_profile_role on public.profiles;
create trigger trg_guard_profile_role
  before insert or update on public.profiles
  for each row execute function public.guard_profile_role();

-- Création auto du profil : n'accepte que client/artisan depuis le metadata.
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

-- ── 2. BOOKINGS : transitions de statut autorisées selon le rôle ────────────
--   artisan : pending → confirmed | refused ; pending|confirmed → in_progress
--   client  : pending|confirmed → cancelled ; in_progress → completed
--   admin   : libre.  client_id / artisan_id immuables côté client.
create or replace function public.guard_booking_update()
returns trigger language plpgsql as $$
declare
  o text := old.status::text;
  n text := new.status::text;
  ok boolean;
begin
  if not public.is_client_write() then
    return new;
  end if;

  new.client_id  := old.client_id;
  new.artisan_id := old.artisan_id;

  if n is distinct from o then
    if auth.uid() = old.artisan_id then
      ok := (o = 'pending' and n in ('confirmed', 'refused'))
         or (o in ('pending', 'confirmed') and n = 'in_progress');
    elsif auth.uid() = old.client_id then
      ok := (o in ('pending', 'confirmed') and n = 'cancelled')
         or (o = 'in_progress' and n = 'completed');
    else
      ok := false;
    end if;

    if not ok then
      raise exception 'Transition de statut non autorisée (% → %)', o, n
        using errcode = '42501';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_booking_update on public.bookings;
create trigger trg_guard_booking_update
  before update on public.bookings
  for each row execute function public.guard_booking_update();

-- Une réservation se crée toujours « pending » par le client lui-même.
create or replace function public.guard_booking_insert()
returns trigger language plpgsql as $$
begin
  if public.is_client_write() then
    if new.client_id is distinct from auth.uid() then
      raise exception 'client_id doit être l''utilisateur courant' using errcode = '42501';
    end if;
    new.status := 'pending';
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_booking_insert on public.bookings;
create trigger trg_guard_booking_insert
  before insert on public.bookings
  for each row execute function public.guard_booking_insert();

-- ── 3. ARTISANS : note et compteur de missions non modifiables par le client ─
create or replace function public.guard_artisan_stats()
returns trigger language plpgsql as $$
begin
  if public.is_client_write() then
    if tg_op = 'INSERT' then
      new.rating_avg := 0;
      new.rating_count := 0;
      new.total_missions := 0;
    else
      new.rating_avg := old.rating_avg;
      new.rating_count := old.rating_count;
      new.total_missions := old.total_missions;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_artisan_stats on public.artisans;
create trigger trg_guard_artisan_stats
  before insert or update on public.artisans
  for each row execute function public.guard_artisan_stats();

-- Abonnement : l'artisan ne peut créer qu'une demande « pending ».
drop policy if exists subscriptions_insert on public.subscriptions;
create policy subscriptions_insert on public.subscriptions
  for insert with check (artisan_id = auth.uid() and status = 'pending');

-- ── 4. STORAGE : chacun ne gère que ses propres fichiers ────────────────────
-- Insert : avatars/ et portfolio/ limités au dossier/préfixe de l'utilisateur.
drop policy if exists "beti-photos insert" on storage.objects;
create policy "beti-photos insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'beti-photos'
    and (
      (storage.foldername(name))[1] not in ('avatars', 'portfolio')
      or name like 'avatars/' || auth.uid()::text || '/%'
      or name like 'avatars/' || auth.uid()::text || '\_%'
      or name like 'portfolio/' || auth.uid()::text || '/%'
    )
  );

drop policy if exists "beti-photos update" on storage.objects;
create policy "beti-photos update" on storage.objects
  for update to authenticated
  using (bucket_id = 'beti-photos' and (owner = auth.uid() or public.is_admin()));

drop policy if exists "beti-photos delete" on storage.objects;
create policy "beti-photos delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'beti-photos' and (owner = auth.uid() or public.is_admin()));

-- ── 5. Notifications de statut complètes + compteur de missions ─────────────
create or replace function public.notify_on_booking_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if new.status::text = 'confirmed' then
      insert into public.notifications(user_id, type, title, message)
      values (new.client_id, 'booking_confirmed', 'Demande acceptée',
              'Votre demande a été acceptée par l''artisan.');
    elsif new.status::text = 'refused' then
      insert into public.notifications(user_id, type, title, message)
      values (new.client_id, 'booking_refused', 'Demande refusée',
              'Votre demande a été refusée.');
    elsif new.status::text = 'in_progress' then
      insert into public.notifications(user_id, type, title, message)
      values (new.client_id, 'booking_done_pending', 'Travail terminé ?',
              'L''artisan a signalé la fin du travail. Confirmez pour pouvoir laisser un avis.');
    elsif new.status::text = 'cancelled' then
      insert into public.notifications(user_id, type, title, message)
      values (new.artisan_id, 'booking_cancelled', 'Demande annulée',
              'Le client a annulé sa demande.');
    elsif new.status::text = 'completed' then
      insert into public.notifications(user_id, type, title, message)
      values (new.artisan_id, 'booking_completed', 'Prestation terminée',
              'La prestation a été marquée comme terminée.');
      update public.artisans
        set total_missions = (select count(*) from public.bookings
                              where artisan_id = new.artisan_id and status::text = 'completed')
        where id = new.artisan_id;
    end if;
  end if;
  return new;
end; $$;

-- ── 6. Realtime : diffuser les notifications (badges en direct) ─────────────
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- VÉRIFICATION
--   select tgname from pg_trigger where tgname like 'trg_guard%';
--   -- en tant qu'utilisateur normal, doit échouer ou être ignoré :
--   -- update profiles set role = 'admin' where id = auth.uid();
-- ============================================================================
