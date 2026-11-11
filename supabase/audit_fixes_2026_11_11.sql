-- ============================================================================
-- BETI — Correctifs d'audit (2026-11-11)
-- ============================================================================
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS rls_policies.sql,
-- security_hardening.sql, privacy_hardening.sql et moderation.sql. Idempotent.
--
-- Corrige :
--  1. messages_select : l'admin lisait TOUS les chats (pas seulement les
--     conversations signalées) — la policy restrictive ajoutée par
--     moderation.sql était en réalité permissive donc sans effet (OR avec
--     l'existante). On retire le volet admin de messages_select et on le
--     restreint explicitement aux bookings ayant au moins un signalement.
--  2. guard_artisan_plan : la clé service (API de suppression de compte) ne
--     pouvait pas remettre plan='free', le trigger réécrivait silencieusement.
--  3. guard_booking_fields minimal : fige price_agreed et address dès qu'une
--     réservation sort de 'pending' (sans attendre launch_hardening.sql).
--  4. messages : sender_name et sender_role forcés depuis profiles (plus de
--     spoof possible côté client).
--  5. RPC approve_subscription : atomique (artisans + subscriptions dans la
--     même transaction, security definer admin-only).
-- ============================================================================

-- ── 1. messages_select : admin limité aux bookings signalés ─────────────────
drop policy if exists messages_select_reported_admin on public.messages;  -- rendu obsolete par ce qui suit
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select using (
    public.is_booking_party(booking_id)
    or (
      public.is_admin()
      and exists (select 1 from public.reports r where r.booking_id = messages.booking_id)
    )
  );

-- ── 2. guard_artisan_plan : exempter la clé service (postgres/service_role) ─
create or replace function public.guard_artisan_plan()
returns trigger language plpgsql security definer as $$
begin
  -- Le rôle service_role (API server-side) et le propriétaire des tables doivent
  -- pouvoir réinitialiser le plan (suppression de compte notamment).
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  if (new.plan is distinct from old.plan
      or new.plan_until is distinct from old.plan_until)
     and not public.is_admin() then
    new.plan := old.plan;
    new.plan_until := old.plan_until;
  end if;
  return new;
end; $$;

-- ── 3. guard_booking_fields : fige price_agreed / address hors 'pending' ────
-- Minimal : ne remplace pas launch_hardening.sql (qui gère aussi lat/lng,
-- payment_method…), mais verrouille les deux champs critiques tout de suite.
create or replace function public.guard_booking_fields_minimal()
returns trigger language plpgsql as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') or public.is_admin() then
    return new;
  end if;
  -- price_agreed : figé dès que la réservation a dépassé 'pending'.
  if old.status::text <> 'pending' and new.price_agreed is distinct from old.price_agreed then
    new.price_agreed := old.price_agreed;
  end if;
  -- address : seul le client, tant que c'est 'pending', peut modifier.
  if new.address is distinct from old.address
     and not (auth.uid() = old.client_id and old.status::text = 'pending') then
    new.address := old.address;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_booking_fields_minimal on public.bookings;
create trigger trg_guard_booking_fields_minimal
  before update on public.bookings
  for each row execute function public.guard_booking_fields_minimal();

-- ── 4. messages : sender_name / sender_role forcés depuis profiles ──────────
create or replace function public.guard_message_sender()
returns trigger language plpgsql security definer set search_path = public as $$
declare prof record;
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  new.sender_id := auth.uid();  -- RLS le vérifie déjà, mais ceinture + bretelles
  select full_name, role::text into prof from public.profiles where id = auth.uid();
  if found then
    new.sender_name := coalesce(prof.full_name, '');
    new.sender_role := prof.role;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_message_sender on public.messages;
create trigger trg_guard_message_sender
  before insert on public.messages
  for each row execute function public.guard_message_sender();

-- ── 5. RPC approve_subscription : artisans + subscriptions atomiquement ─────
create or replace function public.approve_subscription(p_sub_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  s record;
  v_exp timestamptz;
  v_now timestamptz := now();
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  select id, artisan_id, plan, cycle, status into s
    from public.subscriptions where id = p_sub_id for update;
  if not found then
    raise exception 'subscription_not_found' using errcode = 'P0001';
  end if;
  if s.status <> 'pending' then
    raise exception 'subscription_not_pending' using errcode = 'P0001';
  end if;
  v_exp := case when s.cycle = 'yearly' then v_now + interval '1 year' else v_now + interval '1 month' end;

  update public.artisans set plan = s.plan, plan_until = v_exp where id = s.artisan_id;
  update public.subscriptions
    set status = 'active', started_at = v_now, expires_at = v_exp, reviewed_at = v_now
    where id = p_sub_id;
end; $$;

revoke execute on function public.approve_subscription(uuid) from public, anon;
grant execute on function public.approve_subscription(uuid) to authenticated;

-- ============================================================================
-- VÉRIFICATION
--   select policyname, qual from pg_policies
--    where tablename = 'messages' and policyname = 'messages_select';
--   select tgname from pg_trigger
--    where tgname in ('trg_guard_booking_fields_minimal','trg_guard_message_sender');
-- ============================================================================
