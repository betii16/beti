-- ============================================================================
-- BETI — Abonnements artisans (modèle annuaire, aucune commission)
-- ============================================================================
-- À exécuter UNE FOIS dans Supabase > SQL Editor. Idempotent.
--
-- Deux objets :
--   1. public.subscriptions  → le « ledger » : chaque demande / abonnement.
--   2. public.artisans.plan / plan_until → l'ÉTAT COURANT dénormalisé, lisible
--      publiquement (badge Premium, tri priorité dans la recherche).
--
-- Sécurité : l'artisan peut créer une demande (status 'pending') et lire les
-- siennes ; SEUL un admin peut la passer 'active'. Le plan effectif vit sur
-- artisans.plan, qu'un trigger empêche tout non-admin de modifier (même si
-- l'artisan a le droit de mettre à jour sa propre ligne artisans par ailleurs).
-- ============================================================================

create table if not exists public.subscriptions (
  id              uuid primary key default gen_random_uuid(),
  artisan_id      uuid not null references public.profiles(id) on delete cascade,
  plan            text not null check (plan in ('basic','premium')),
  cycle           text not null check (cycle in ('monthly','yearly')),
  amount          integer not null default 0,             -- DZD
  status          text not null default 'pending'
                    check (status in ('pending','active','rejected','expired','cancelled')),
  payment_method  text not null default 'transfer',       -- transfer | deposit | edahabia | cib | card
  payment_ref     text,                                   -- réf saisie par l'artisan (n° bordereau…)
  proof_url       text,                                   -- preuve uploadée (optionnel)
  note            text,                                   -- note admin (motif de rejet…)
  started_at      timestamptz,
  expires_at      timestamptz,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists subscriptions_artisan_idx on public.subscriptions(artisan_id);
create index if not exists subscriptions_status_idx  on public.subscriptions(status);

-- ── État courant dénormalisé sur artisans (lecture publique rapide) ──────────
alter table public.artisans add column if not exists plan       text not null default 'free';
alter table public.artisans add column if not exists plan_until timestamptz;

-- ── Trigger : interdit à un non-admin de toucher plan / plan_until ───────────
create or replace function public.guard_artisan_plan()
returns trigger language plpgsql security definer as $$
begin
  if (new.plan is distinct from old.plan
      or new.plan_until is distinct from old.plan_until)
     and not public.is_admin() then
    new.plan := old.plan;
    new.plan_until := old.plan_until;
  end if;
  return new;
end; $$;

drop trigger if exists artisans_guard_plan on public.artisans;
create trigger artisans_guard_plan
  before update on public.artisans
  for each row execute function public.guard_artisan_plan();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.subscriptions enable row level security;

-- Lecture : l'artisan concerné ou un admin.
drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions
  for select using (artisan_id = auth.uid() or public.is_admin());

-- Création : l'artisan crée une demande pour lui-même (l'admin valide ensuite).
drop policy if exists subscriptions_insert on public.subscriptions;
create policy subscriptions_insert on public.subscriptions
  for insert with check (artisan_id = auth.uid());

-- Mise à jour : réservée à l'admin (valider / rejeter).
drop policy if exists subscriptions_update on public.subscriptions;
create policy subscriptions_update on public.subscriptions
  for update using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- VÉRIFICATION
--   select plan, count(*) from public.artisans group by 1;
--   select status, plan, count(*) from public.subscriptions group by 1,2;
-- ============================================================================
