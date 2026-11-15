-- ============================================================================
-- BETI v2 : fonctions internes, déclencheurs, règles RLS, droits de lecture
-- ============================================================================
-- Règles pour toute fonction SECURITY DEFINER de ce projet :
--   * search_path vide et noms complets (public.x, private.y, auth.uid()) ;
--   * jamais de test sur current_user : dans une fonction definer il vaut le
--     propriétaire (postgres), pas l'appelant. On s'appuie sur auth.uid() ;
--   * droit EXECUTE retiré à tous, puis rendu rôle par rôle (fin de la migration 400).
-- Le schéma private n'est pas exposé par l'API : ses fonctions ne sont pas
-- appelables depuis un navigateur, seulement depuis les règles et les fonctions.
-- ============================================================================

-- ── Fonctions internes ──────────────────────────────────────────────────────
create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create function private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.staff s where s.user_id = auth.uid());
$$;

-- Période de lancement : tous les artisans publiés sont visibles, abonnés ou non.
create function private.launch_free() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select c.launch_free_until > now() from public.app_config c), false);
$$;

-- Fiche visible du public ? Même règle que la policy artisans_select (un test
-- vérifie que les deux restent d'accord).
create function private.artisan_visible(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.artisans a
    where a.id = p_id and a.published and not a.suspended
      and (private.launch_free() or (a.plan <> 'free' and a.plan_until is not null and a.plan_until > now()))
  );
$$;

-- L'appelant et p_other ont-ils une demande en commun (dans un sens ou l'autre) ?
create function private.shares_booking(p_other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.bookings b
    where (b.client_id = auth.uid() and b.artisan_id = p_other)
       or (b.artisan_id = auth.uid() and b.client_id = p_other)
  );
$$;

create function private.is_booking_party(p_booking_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.bookings b
    where b.id = p_booking_id and auth.uid() in (b.client_id, b.artisan_id)
  );
$$;

-- L'équipe ne lit une conversation ou une adresse que si la demande a été signalée.
create function private.booking_reported(p_booking_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.reports r where r.booking_id = p_booking_id);
$$;

-- Renvoie l'utilisateur connecté, ou lève une erreur s'il n'y en a pas ou s'il est suspendu.
create function private.require_user() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.is_active) then
    raise exception 'account_suspended' using errcode = '42501';
  end if;
  return v_uid;
end $$;

create function private.require_staff() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from private.staff s where s.user_id = v_uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return v_uid;
end $$;

create function private.notify(p_user uuid, p_type text, p_booking uuid default null, p_data jsonb default '{}'::jsonb)
returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, booking_id, data)
  select p_user, p_type, p_booking, coalesce(p_data, '{}'::jsonb)
  where exists (select 1 from public.profiles p where p.id = p_user);
$$;

create function private.audit(p_action text, p_target text, p_details jsonb default '{}'::jsonb)
returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, action, target, details)
  values (auth.uid(), p_action, p_target, coalesce(p_details, '{}'::jsonb));
$$;

-- Distance à vol d'oiseau en km (haversine).
create function private.distance_km(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric) returns numeric
language sql immutable set search_path = '' as $$
  select round((2 * 6371 * asin(sqrt(
    power(sin(radians((lat2 - lat1)::double precision) / 2), 2)
    + cos(radians(lat1::double precision)) * cos(radians(lat2::double precision))
      * power(sin(radians((lng2 - lng1)::double precision) / 2), 2)
  )))::numeric, 1);
$$;

-- ── Déclencheurs ────────────────────────────────────────────────────────────
create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger artisans_touch before update on public.artisans
  for each row execute function private.touch_updated_at();
create trigger bookings_touch before update on public.bookings
  for each row execute function private.touch_updated_at();
create trigger reports_touch before update on public.reports
  for each row execute function private.touch_updated_at();

-- Note moyenne : un seul calcul, qui ignore les avis masqués.
create function private.refresh_artisan_rating() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  for v_id in
    select distinct x from unnest(array[
      case when tg_op in ('INSERT', 'UPDATE') then new.artisan_id end,
      case when tg_op in ('UPDATE', 'DELETE') then old.artisan_id end
    ]) as x where x is not null
  loop
    update public.artisans a set
      rating_avg = coalesce((select round(avg(r.rating)::numeric, 2) from public.reviews r
                             where r.artisan_id = v_id and r.is_visible), 0),
      rating_count = (select count(*) from public.reviews r where r.artisan_id = v_id and r.is_visible)
    where a.id = v_id;
  end loop;
  return null;
end $$;
create trigger reviews_refresh_rating after insert or update or delete on public.reviews
  for each row execute function private.refresh_artisan_rating();

create function private.audit_log_append_only() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'audit_log_append_only' using errcode = '42501';
end $$;
create trigger audit_log_append_only before update or delete on public.audit_log
  for each row execute function private.audit_log_append_only();

-- Création du compte : fiche privée + contact. Le rôle demandé à l'inscription ne
-- peut être que client ou artisan ; l'équipe (private.staff) ne se crée pas ici.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m          jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_phone    text;
  v_verified boolean := false;
begin
  insert into public.profiles (id, role, full_name, lang)
  values (
    new.id,
    case when m ->> 'role' = 'artisan' then 'artisan' else 'client' end,
    left(btrim(coalesce(m ->> 'full_name', '')), 80),
    case when m ->> 'lang' = 'ar' then 'ar' else 'fr' end
  )
  on conflict (id) do nothing;

  if coalesce(new.phone, '') <> '' then
    v_phone := '+' || ltrim(new.phone, '+');
    v_verified := new.phone_confirmed_at is not null;
  else
    v_phone := m ->> 'phone';
  end if;
  if v_phone is null or v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    v_phone := null;
    v_verified := false;
  end if;

  insert into public.user_contacts (user_id, phone, phone_verified)
  values (new.id, v_phone, v_verified)
  on conflict (user_id) do nothing;
  return new;
end $$;

-- Numéro confirmé par code après coup : on recopie l'état « vérifié ».
create function private.sync_user_phone() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_phone text;
begin
  if coalesce(new.phone, '') = '' then
    return new;
  end if;
  v_phone := '+' || ltrim(new.phone, '+');
  if v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    return new;
  end if;
  insert into public.user_contacts (user_id, phone, phone_verified)
  values (new.id, v_phone, new.phone_confirmed_at is not null)
  on conflict (user_id) do update
    set phone = excluded.phone, phone_verified = excluded.phone_verified;
  update public.artisans set phone_verified = (new.phone_confirmed_at is not null) where id = new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();
drop trigger if exists on_auth_user_phone on auth.users;
create trigger on_auth_user_phone after update of phone, phone_confirmed_at on auth.users
  for each row execute function private.sync_user_phone();

-- ── RLS : lecture seule, table par table ────────────────────────────────────
alter table public.categories            enable row level security;
alter table public.plans                 enable row level security;
alter table public.app_config            enable row level security;
alter table public.profiles              enable row level security;
alter table public.user_contacts         enable row level security;
alter table private.staff                enable row level security;
alter table public.artisans              enable row level security;
alter table public.portfolio_posts       enable row level security;
alter table public.artisan_live_location enable row level security;
alter table public.bookings              enable row level security;
alter table public.booking_private       enable row level security;
alter table public.messages              enable row level security;
alter table public.reviews               enable row level security;
alter table public.notifications         enable row level security;
alter table public.subscriptions         enable row level security;
alter table public.reports               enable row level security;
alter table public.report_notes          enable row level security;
alter table public.audit_log             enable row level security;

create policy categories_select on public.categories for select using (true);
create policy plans_select on public.plans for select using (true);
create policy app_config_select on public.app_config for select using (true);

-- Fiche privée : soi, l'équipe, et la personne avec qui on a une demande en commun.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_staff()) or private.shares_booking(id));

-- Téléphone : soi et l'équipe. L'autre partie d'une demande passe par booking_contact().
create policy user_contacts_select on public.user_contacts for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));

-- Vitrine : publiée, non suspendue, et abonnée (ou période de lancement).
-- L'artisan voit toujours la sienne ; un client garde l'accès à un artisan avec
-- qui il a une demande.
create policy artisans_select on public.artisans for select
  using (
    (published and not suspended
      and ((select private.launch_free()) or (plan <> 'free' and plan_until is not null and plan_until > now())))
    or id = (select auth.uid())
    or (select private.is_staff())
    or private.shares_booking(id)
  );

-- Visible si la fiche de l'artisan l'est (la sous-requête passe par artisans_select).
create policy portfolio_posts_select on public.portfolio_posts for select
  using (exists (select 1 from public.artisans a where a.id = portfolio_posts.artisan_id));

create policy live_location_select on public.artisan_live_location for select to authenticated
  using (
    artisan_id = (select auth.uid())
    or (select private.is_staff())
    or (
      updated_at > now() - interval '15 minutes'
      and exists (
        select 1 from public.bookings b
        where b.artisan_id = artisan_live_location.artisan_id
          and b.client_id = (select auth.uid())
          and b.status = 'accepted' and b.sharing_location
      )
    )
  );

create policy bookings_select on public.bookings for select to authenticated
  using (client_id = (select auth.uid()) or artisan_id = (select auth.uid()) or (select private.is_staff()));

-- Adresse : le client toujours, l'artisan une fois la demande acceptée, l'équipe
-- seulement si la demande a été signalée.
create policy booking_private_select on public.booking_private for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_private.booking_id
        and (b.client_id = (select auth.uid())
          or (b.artisan_id = (select auth.uid()) and b.status in ('accepted', 'finished', 'completed')))
    )
    or ((select private.is_staff()) and private.booking_reported(booking_id))
  );

create policy messages_select on public.messages for select to authenticated
  using (
    private.is_booking_party(booking_id)
    or ((select private.is_staff()) and private.booking_reported(booking_id))
  );

create policy reviews_select on public.reviews for select
  using (
    (is_visible and exists (select 1 from public.artisans a where a.id = reviews.artisan_id))
    or client_id = (select auth.uid())
    or artisan_id = (select auth.uid())
    or (select private.is_staff())
  );

create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy subscriptions_select on public.subscriptions for select to authenticated
  using (artisan_id = (select auth.uid()) or (select private.is_staff()));

create policy reports_select on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.is_staff()));

create policy report_notes_select on public.report_notes for select to authenticated
  using ((select private.is_staff()));

create policy audit_log_select on public.audit_log for select to authenticated
  using ((select private.is_staff()));

-- ── Droits de table : lecture seulement ─────────────────────────────────────
-- Aucun INSERT / UPDATE / DELETE pour anon et authenticated, sur aucune table.
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;

grant usage on schema private to anon, authenticated, service_role;

grant select on
  public.categories, public.plans, public.app_config,
  public.artisans, public.portfolio_posts, public.reviews
  to anon, authenticated;

grant select on
  public.profiles, public.user_contacts, public.bookings, public.booking_private,
  public.messages, public.notifications, public.subscriptions,
  public.artisan_live_location, public.reports, public.report_notes, public.audit_log
  to authenticated;

grant all on all tables in schema public to service_role;
grant all on all tables in schema private to service_role;

-- ── Temps réel ──────────────────────────────────────────────────────────────
-- Le temps réel applique les règles RLS : chacun ne reçoit que ses lignes.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.messages, public.notifications, public.bookings, public.artisan_live_location;
  end if;
end $$;
