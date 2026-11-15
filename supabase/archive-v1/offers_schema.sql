-- ============================================================================
-- BETI — Offres / négociation (façon Vinted) + mode de paiement + séquestre
-- ============================================================================
-- À exécuter UNE FOIS dans Supabase > SQL Editor. Idempotent.
--
-- Contexte : le client choisit carte ou cash à la réservation. Pour la CARTE,
-- l'artisan envoie un prix dans le chat (offre), le client paie (négociable par
-- contre-offres). Le paiement carte est mis en SÉQUESTRE : l'argent n'est libéré
-- à l'artisan qu'une fois la prestation validée par le client.
-- ============================================================================

-- ── Mode de paiement choisi à la réservation ────────────────────────────────
alter table public.bookings add column if not exists payment_method text default 'cash';
-- 'card' = carte CIB/Edahabia (séquestre + offres) | 'cash' = main propre

-- ── Table des offres ────────────────────────────────────────────────────────
create table if not exists public.offers (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  sender_id   uuid not null,                 -- qui propose (artisan ou client)
  amount      integer not null,              -- prix proposé (DZD)
  status      text    not null default 'pending', -- pending|accepted|declined|superseded
  created_at  timestamptz not null default now()
);
create index if not exists offers_booking_idx on public.offers(booking_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.offers enable row level security;

-- Lecture : uniquement les parties du booking (réutilise le helper existant).
drop policy if exists offers_select on public.offers;
create policy offers_select on public.offers
  for select using (public.is_booking_party(booking_id) or public.is_admin());

-- Création : par une partie du booking, en son propre nom.
drop policy if exists offers_insert on public.offers;
create policy offers_insert on public.offers
  for insert with check (
    sender_id = auth.uid() and public.is_booking_party(booking_id)
  );

-- Mise à jour de statut (accepter / refuser / superseder) : par une partie.
drop policy if exists offers_update on public.offers;
create policy offers_update on public.offers
  for update using (public.is_booking_party(booking_id))
  with check (public.is_booking_party(booking_id));

-- ── Geler le prix une fois la commande engagée (cf. SECURITY_AUDIT H2) ───────
-- Empêche de modifier price_agreed après accord/paiement.
create or replace function public.freeze_price_after_commit()
returns trigger language plpgsql as $$
begin
  -- Une fois payé (séquestre = in_progress) ou terminé, le prix est définitif.
  if old.status in ('in_progress','completed')
     and new.price_agreed is distinct from old.price_agreed then
    new.price_agreed := old.price_agreed;
  end if;
  return new;
end; $$;

drop trigger if exists trg_freeze_price on public.bookings;
create trigger trg_freeze_price
  before update on public.bookings
  for each row execute function public.freeze_price_after_commit();

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
-- select status, count(*) from public.offers group by 1;
