-- ============================================================================
-- BETI — Table messages + activation Realtime
-- ============================================================================
-- À exécuter dans Supabase > SQL Editor AVANT rls_policies.sql
-- ============================================================================

-- 1. Créer la table messages si elle n'existe pas
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  sender_id   uuid not null references auth.users(id) on delete cascade,
  sender_name text not null default '',
  sender_role text not null default 'client',
  content     text not null,
  created_at  timestamptz not null default now()
);

-- Index pour les requêtes par booking (chargement de la conversation)
create index if not exists messages_booking_id_idx on public.messages(booking_id, created_at);

-- 2. Activer RLS
alter table public.messages enable row level security;

-- 3. Policies RLS (idempotentes)
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select using (public.is_booking_party(booking_id) or public.is_admin());

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid() and public.is_booking_party(booking_id)
  );

-- 4. Activer Realtime sur la table messages
-- (nécessaire pour que les nouveaux messages arrivent en temps réel)
alter publication supabase_realtime add table public.messages;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
-- select * from public.messages limit 5;
-- select * from pg_publication_tables where pubname = 'supabase_realtime';
