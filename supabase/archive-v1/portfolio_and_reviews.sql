-- ============================================================================
-- BETI — Portfolio des artisans + Avis avec photos (clients ayant terminé)
-- ============================================================================
-- À exécuter dans Supabase > SQL Editor.
-- Idempotent : peut être relancé sans risque.
-- ============================================================================

-- ── 1. PORTFOLIO ────────────────────────────────────────────────────────────
-- Chaque artisan publie des "posts" de ses travaux (façon fil d'actualité) :
-- une description + plusieurs photos (avant/après, réalisations, etc.).

create table if not exists public.portfolio_posts (
  id          uuid primary key default gen_random_uuid(),
  artisan_id  uuid not null references public.profiles(id) on delete cascade,
  description text,
  photos      text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists portfolio_posts_artisan_idx
  on public.portfolio_posts (artisan_id, created_at desc);

alter table public.portfolio_posts enable row level security;

-- Lecture publique : tout le monde voit le portfolio sur le profil public.
drop policy if exists portfolio_select on public.portfolio_posts;
create policy portfolio_select on public.portfolio_posts
  for select using (true);

-- Écriture : uniquement l'artisan propriétaire (et il ne peut publier que pour lui).
drop policy if exists portfolio_insert on public.portfolio_posts;
create policy portfolio_insert on public.portfolio_posts
  for insert with check (artisan_id = auth.uid());

drop policy if exists portfolio_update on public.portfolio_posts;
create policy portfolio_update on public.portfolio_posts
  for update using (artisan_id = auth.uid()) with check (artisan_id = auth.uid());

drop policy if exists portfolio_delete on public.portfolio_posts;
create policy portfolio_delete on public.portfolio_posts
  for delete using (artisan_id = auth.uid());

-- ── 2. AVIS AVEC PHOTOS ─────────────────────────────────────────────────────
-- S'assure que la colonne photos existe (la page publique la lit déjà).
alter table public.reviews add column if not exists photos text[] default '{}';

-- ── 3. AVIS RÉSERVÉS AUX CLIENTS AYANT TERMINÉ LA COMMANDE ───────────────────
-- Seul un client dont LA réservation auprès de cet artisan est `completed`
-- peut publier un avis. (Remplace la policy plus permissive de rls_policies.sql.)
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews
  for insert with check (
    client_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id
        and b.client_id = auth.uid()
        and b.artisan_id = reviews.artisan_id
        and b.status = 'completed'
    )
  );

-- Optionnel mais recommandé : un seul avis par réservation.
create unique index if not exists reviews_one_per_booking
  on public.reviews (booking_id);

-- ============================================================================
-- Vérification : après exécution, un artisan connecté peut INSERT dans
-- portfolio_posts (avec artisan_id = son id), et un client ne peut laisser
-- un avis que si sa réservation correspondante est `completed`.
-- ============================================================================
