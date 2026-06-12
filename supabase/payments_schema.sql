-- ============================================================================
-- BETI — Table des paiements (SATIM / CIB / Edahabia)
-- ============================================================================
-- À exécuter UNE FOIS dans Supabase > SQL Editor. Idempotent.
--
-- POURQUOI une table dédiée : un paiement carte est un flux financier où BETI
-- encaisse l'argent du client puis reverse à l'artisan (moins la commission).
-- Ces lignes sont la SOURCE DE VÉRITÉ comptable — elles ne doivent JAMAIS être
-- écrites par le navigateur. Seul le serveur (Route Handler avec la clé
-- service-role) les insère/modifie, après vérification du statut auprès de SATIM.
-- ============================================================================

create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings(id) on delete cascade,
  client_id       uuid not null,                 -- payeur
  artisan_id      uuid not null,                 -- bénéficiaire du reversement
  amount          integer not null default 0,    -- montant FACTURÉ au client (DZD)
  commission      integer not null default 0,    -- part BETI (DZD)
  artisan_amount  integer not null default 0,    -- reversé à l'artisan (DZD)
  currency        text    not null default 'DZD',
  method          text    not null default 'cib',     -- cib | edahabia | cash
  order_number    text    not null unique,            -- notre réf envoyée à SATIM
  satim_order_id  text,                               -- orderId renvoyé par SATIM
  status          text    not null default 'pending', -- pending | paid | failed | canceled
  payout_status   text    not null default 'pending', -- pending | paid (reversement artisan)
  error           text,
  created_at      timestamptz not null default now(),
  paid_at         timestamptz
);

create index if not exists payments_booking_idx on public.payments(booking_id);
create index if not exists payments_client_idx  on public.payments(client_id);
create index if not exists payments_artisan_idx on public.payments(artisan_id);
create index if not exists payments_satim_idx   on public.payments(satim_order_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.payments enable row level security;

-- Lecture : le client, l'artisan concerné, ou un admin peuvent voir le paiement.
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select using (
    client_id = auth.uid() or artisan_id = auth.uid() or public.is_admin()
  );

-- AUCUNE policy insert/update/delete pour les clients/anon → RLS deny-all.
-- La clé service-role (serveur uniquement) contourne RLS et reste seule
-- habilitée à écrire les paiements. C'est volontaire : on ne fait jamais
-- confiance au navigateur pour dire « j'ai payé ».

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
-- select status, payout_status, count(*) from public.payments group by 1,2;
