-- ============================================================================
-- BETI : correctifs d'INTEGRITE (lus dans la base de production le 2026-11-01)
-- Additif, aucune suppression de donnees. Re-executable.
--
-- PREREQUIS : supabase/fix_booking_status.sql DEJA execute (valeur 'confirmed'),
-- puis supabase/emergency_hardening.sql.
--
-- Failles corrigees :
--  1. notifications : la regle d'insertion etait `with check (true)` : n'importe qui
--     pouvait inserer une notification a n'importe quel utilisateur (hameconnage,
--     spam). Les declencheurs (security definer) continuent d'inserer.
--  2. messages : la regle de mise a jour laissait n'importe quel utilisateur connecte
--     (meme etranger a la reservation) modifier le contenu des messages des autres.
--  3. avis : la regle verifiait seulement « une mission terminee avec cet artisan »,
--     pas la reservation : plusieurs avis (booking_id nul) apres une seule mission.
--  4. reservations : les deux parties pouvaient mettre n'importe quel statut
--     (le client pouvait se mettre « completed » sans l'accord de l'artisan et
--     deverrouiller un avis ; l'artisan gonfler son compteur de missions).
--     Flux reel de l'application : l'artisan accepte (confirmed) ou refuse,
--     signale « travail termine » (in_progress), le client confirme (completed).
--  5. compteur de missions : c'est le client qui passe 'completed', mais le declencheur
--     n'avait pas les droits sur artisans (RLS) : total_missions ne montait jamais.
--  6. artisans : un artisan pouvait ecrire lui-meme rating_avg / rating_count /
--     total_missions (seul `plan` etait garde a la mise a jour).
-- ============================================================================

-- 1. Notifications : insertion directe interdite aux utilisateurs.
drop policy if exists notifs_insert on public.notifications;

-- 2. Messages : seul le destinataire (participant, pas l'expediteur) peut marquer
--    comme lu ; le contenu et l'identite ne sont jamais modifiables.
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages
  for update to authenticated
  using (
    auth.uid() <> sender_id
    and exists (
      select 1 from public.bookings b
      where b.id = messages.booking_id
        and (b.client_id = auth.uid() or b.artisan_id = auth.uid())
    )
  )
  with check (auth.uid() <> sender_id);

create or replace function public.guard_message_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.content     := old.content;
    new.sender_id   := old.sender_id;
    new.booking_id  := old.booking_id;
    new.sender_name := old.sender_name;
    new.sender_role := old.sender_role;
    new.created_at  := old.created_at;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_message_update on public.messages;
create trigger trg_guard_message_update
  before update on public.messages
  for each row execute function public.guard_message_update();

-- 3. Avis : une reservation precise, terminee, appartenant au client et a l'artisan.
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews
  for insert to authenticated
  with check (
    auth.uid() = client_id
    and booking_id is not null
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id
        and b.client_id = auth.uid()
        and b.artisan_id = reviews.artisan_id
        and b.status = 'completed'::public.booking_status
    )
  );

-- 4. Reservations : transitions de statut autorisees selon le role.
create or replace function public.guard_booking_status()
returns trigger language plpgsql set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if current_user in ('authenticated', 'anon')
     and not public.is_admin()
     and new.status is distinct from old.status then
    if uid is not null and uid = old.artisan_id then
      if not (
           (old.status::text = 'pending'     and new.status::text in ('confirmed', 'refused'))
        or (old.status::text = 'confirmed'   and new.status::text in ('in_progress', 'cancelled'))
        or (old.status::text = 'in_progress' and new.status::text in ('cancelled'))
      ) then
        raise exception 'transition de statut non autorisee pour l''artisan' using errcode = '42501';
      end if;
    elsif uid is not null and uid = old.client_id then
      if not (
           (old.status::text in ('pending', 'confirmed') and new.status::text = 'cancelled')
        or (old.status::text = 'in_progress'             and new.status::text = 'completed')
      ) then
        raise exception 'transition de statut non autorisee pour le client' using errcode = '42501';
      end if;
    else
      raise exception 'modification de statut non autorisee' using errcode = '42501';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_booking_status on public.bookings;
create trigger trg_guard_booking_status
  before update on public.bookings
  for each row execute function public.guard_booking_status();

-- 5. Compteur de missions : c'est le CLIENT qui passe la reservation a 'completed'.
--    Le declencheur s'executait avec ses droits, et la regle artisans_update
--    (auth.uid() = id) rejetait silencieusement l'UPDATE (0 ligne, aucune erreur) :
--    total_missions ne montait jamais. Il devient security definer.
create or replace function public.increment_artisan_missions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status::text = 'completed' and old.status::text <> 'completed' then
    update public.artisans set total_missions = total_missions + 1 where id = new.artisan_id;
  end if;
  return new;
end; $$;
revoke execute on function public.increment_artisan_missions() from public, anon, authenticated;

-- 6. Statistiques d'artisan : la regle artisans_update (auth.uid() = id) laisse l'artisan
--    ecrire toute sa ligne. Seul `plan` etait garde ; il pouvait donc se fixer
--    rating_avg / rating_count / total_missions. (guard_artisan_insert les remet deja
--    a zero a la creation, mais rien ne le faisait a la mise a jour.)
--    Les declencheurs security definer (avis, missions) s'executent en tant que
--    proprietaire de la fonction, donc ne sont pas touches par ce garde.
create or replace function public.guard_artisan_stats()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.rating_avg     := old.rating_avg;
    new.rating_count   := old.rating_count;
    new.total_missions := old.total_missions;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_artisan_stats on public.artisans;
create trigger trg_guard_artisan_stats
  before update on public.artisans
  for each row execute function public.guard_artisan_stats();
revoke execute on function public.guard_artisan_stats() from public, anon, authenticated;

revoke execute on function public.guard_message_update() from public, anon, authenticated;
revoke execute on function public.guard_booking_status() from public, anon, authenticated;

-- ============================================================================
-- VERIFICATIONS (lecture seule, apres execution)
-- select policyname from pg_policies where schemaname='public' and tablename='notifications';  -- sans notifs_insert
-- select tgname from pg_trigger where tgname in ('trg_guard_message_update','trg_guard_booking_status'); -- 2 lignes
-- Test d'attaque (le client tente 'completed' depuis 'pending' : doit lever une erreur) :
-- do $$ declare b record; begin
--   select id, client_id into b from public.bookings where status::text='pending' limit 1;
--   perform set_config('request.jwt.claims', json_build_object('sub', b.client_id, 'role','authenticated')::text, true);
--   set local role authenticated;
--   update public.bookings set status = 'completed' where id = b.id;
--   raise exception 'ECHEC DU TEST : la transition a ete acceptee';
-- end $$;   -- attendu : "transition de statut non autorisee pour le client"
-- ============================================================================
