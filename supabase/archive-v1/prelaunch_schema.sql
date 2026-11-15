-- ============================================================================
-- BETI — Réconciliation du schéma AVANT LANCEMENT
-- ============================================================================
-- À exécuter UNE FOIS dans Supabase > SQL Editor. 100% idempotent.
--
-- POURQUOI : l'app tape Supabase via PostgREST. Si le code fait un
--   .select('...,colonne_X,...') et que `colonne_X` n'existe pas en base,
--   TOUTE la requête échoue (pas juste la colonne) → écran vide.
-- Ce script garantit que toutes les colonnes lues/écrites par le code existent,
-- quelle que soit la dérive du schéma. Sans risque sur des colonnes déjà là.
-- ============================================================================

-- ── PROFILES ────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists notif_email boolean default true;
alter table public.profiles add column if not exists notif_sms   boolean default false;

-- ── ARTISANS ────────────────────────────────────────────────────────────────
-- La bio de l'artisan vit sur `artisans` (lue par l'accueil, la carte, le
-- dashboard). Les autres colonnes alimentent le profil et la zone.
alter table public.artisans add column if not exists bio                    text;
alter table public.artisans add column if not exists tags                   text[] default '{}';
alter table public.artisans add column if not exists services               jsonb;
alter table public.artisans add column if not exists years_experience       integer default 0;
alter table public.artisans add column if not exists location_city          text;
alter table public.artisans add column if not exists intervention_radius_km integer default 20;
alter table public.artisans add column if not exists lat                    double precision;
alter table public.artisans add column if not exists lng                    double precision;
alter table public.artisans add column if not exists hourly_rate            integer default 0;
alter table public.artisans add column if not exists is_available           boolean default false;
alter table public.artisans add column if not exists rating_avg             numeric default 0;
alter table public.artisans add column if not exists rating_count           integer default 0;
alter table public.artisans add column if not exists total_missions         integer default 0;

-- ── BOOKINGS ────────────────────────────────────────────────────────────────
-- Colonnes insérées par contactArtisan / le dashboard. scheduled_at est
-- rendue nullable : un message spontané n'a pas de rendez-vous planifié.
alter table public.bookings add column if not exists category     text;
alter table public.bookings add column if not exists title        text;
alter table public.bookings add column if not exists description  text;
alter table public.bookings add column if not exists address      text;
alter table public.bookings add column if not exists price_agreed integer default 0;
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='bookings' and column_name='scheduled_at'
  ) then
    alter table public.bookings alter column scheduled_at drop not null;
  else
    alter table public.bookings add column scheduled_at timestamptz;
  end if;
end $$;

-- ── MESSAGES ────────────────────────────────────────────────────────────────
alter table public.messages add column if not exists sender_name text not null default '';
alter table public.messages add column if not exists sender_role text not null default 'client';
alter table public.messages add column if not exists content     text;

-- ── NOTIFICATIONS ───────────────────────────────────────────────────────────
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists is_read boolean default false;

-- ── REVIEWS ─────────────────────────────────────────────────────────────────
alter table public.reviews add column if not exists photos  text[] default '{}';
alter table public.reviews add column if not exists comment text;

-- ── TRIGGER : notifier au changement de statut d'une réservation ────────────
-- Les inserts de notifications côté client sont bloqués par RLS (deny-all).
-- Ce trigger (security definer) génère les notifs « acceptée / refusée /
-- terminée » côté serveur, de façon fiable.
create or replace function public.notify_on_booking_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'confirmed' then
      insert into public.notifications(user_id, type, title, message)
      values (new.client_id, 'booking_confirmed', 'Demande acceptée',
              'Votre demande a été acceptée par l''artisan.');
    elsif new.status = 'refused' then
      insert into public.notifications(user_id, type, title, message)
      values (new.client_id, 'booking_refused', 'Demande refusée',
              'Votre demande a été refusée.');
    elsif new.status = 'completed' then
      insert into public.notifications(user_id, type, title, message)
      values (new.artisan_id, 'booking_completed', 'Prestation terminée',
              'La prestation a été marquée comme terminée.');
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_notify_on_booking_status on public.bookings;
create trigger trg_notify_on_booking_status
  after update on public.bookings
  for each row execute function public.notify_on_booking_status();

-- ============================================================================
-- VÉRIFICATION : lister les colonnes effectivement présentes
-- ============================================================================
-- select table_name, column_name from information_schema.columns
--   where table_schema='public'
--     and table_name in ('profiles','artisans','bookings','messages','notifications','reviews')
--   order by table_name, ordinal_position;
