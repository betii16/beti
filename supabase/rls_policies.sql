-- ============================================================================
-- BETI — Politiques RLS (Row Level Security) recommandées
-- ============================================================================
-- À exécuter dans Supabase > SQL Editor.
--
-- CONTEXTE : toute l'app est client-side et tape Supabase avec la clé ANON
-- (publique, lisible dans le navigateur). La SEULE barrière de sécurité réelle
-- est donc le RLS. Sans ces policies, n'importe qui peut lire/écrire toute la
-- base avec la clé anon. Le gating "role admin" côté React est cosmétique.
--
-- Modèle de données (déduit du code) :
--   profiles(id=auth.uid, full_name, phone, role, avatar_url)
--   artisans(id=auth.uid FK profiles, category, is_available, hourly_rate,
--            rating_avg, rating_count, total_missions, location_city, lat, lng, status)
--   bookings(id, client_id, artisan_id, title, description, address,
--            scheduled_at, status, price_agreed, created_at)
--   messages(id, booking_id, sender_id, sender_name, sender_role, content, created_at)
--   notifications(id, user_id=destinataire, type, title, message, is_read, created_at)
--   reviews(id, client_id, artisan_id, booking_id, rating, comment, photos, created_at)
-- ============================================================================

-- Helper : l'utilisateur courant est-il admin ? (évite la récursion RLS sur profiles)
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Helper : l'utilisateur courant est-il partie prenante d'un booking ?
create or replace function public.is_booking_party(b_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.bookings
    where id = b_id and (client_id = auth.uid() or artisan_id = auth.uid())
  );
$$;

-- Activer RLS partout
alter table public.profiles      enable row level security;
alter table public.artisans      enable row level security;
alter table public.bookings      enable row level security;
alter table public.messages      enable row level security;
alter table public.notifications enable row level security;
alter table public.reviews       enable row level security;

-- ── PROFILES ────────────────────────────────────────────────────────────────
-- Lecture publique : l'app affiche les noms/avatars des artisans aux clients.
-- ⚠️ Le téléphone est dans cette table → exposé à tous. Si sensible, déplacer
--    `phone` dans une table privée ou restreindre via une vue.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (true);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ── ARTISANS ────────────────────────────────────────────────────────────────
-- Lecture publique (annuaire). Écriture : seulement son propre profil artisan.
drop policy if exists artisans_select on public.artisans;
create policy artisans_select on public.artisans
  for select using (true);

drop policy if exists artisans_insert on public.artisans;
create policy artisans_insert on public.artisans
  for insert with check (id = auth.uid());

drop policy if exists artisans_update on public.artisans;
create policy artisans_update on public.artisans
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
-- ⚠️ rating_avg / rating_count / total_missions ne devraient PAS être modifiables
--    par l'artisan lui-même (il pourrait gonfler sa note). Idéalement, calculés
--    par un trigger sur `reviews`. Voir section triggers plus bas.

-- ── BOOKINGS ────────────────────────────────────────────────────────────────
-- Visible uniquement par le client, l'artisan concerné, ou un admin.
drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings
  for select using (
    client_id = auth.uid() or artisan_id = auth.uid() or public.is_admin()
  );

-- Création : seulement par le client, et il ne peut pas se créer un booking au
-- nom de quelqu'un d'autre.
drop policy if exists bookings_insert on public.bookings;
create policy bookings_insert on public.bookings
  for insert with check (client_id = auth.uid());

-- Mise à jour de statut : par l'une des deux parties (ou admin).
-- ⚠️ Cette policy n'empêche PAS le client de modifier price_agreed. Pour figer
--    le prix après confirmation, utiliser un trigger BEFORE UPDATE.
drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings
  for update using (
    client_id = auth.uid() or artisan_id = auth.uid() or public.is_admin()
  ) with check (
    client_id = auth.uid() or artisan_id = auth.uid() or public.is_admin()
  );

-- ── MESSAGES ────────────────────────────────────────────────────────────────
-- Lecture/écriture réservées aux parties du booking. L'expéditeur doit être soi.
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select using (public.is_booking_party(booking_id) or public.is_admin());

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid() and public.is_booking_party(booking_id)
  );

-- ── NOTIFICATIONS ───────────────────────────────────────────────────────────
-- Lecture/maj/suppression : uniquement ses propres notifications.
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete using (user_id = auth.uid());

-- ⚠️ PROBLÈME DE CONCEPTION : aujourd'hui le code client insère des
--    notifications pour AUTRUI (ex: app/page.tsx insère une notif avec
--    user_id = artisan quand un client le contacte). Une policy stricte
--    "with check (user_id = auth.uid())" CASSERAIT ce flux.
--    → Solution propre : générer les notifications côté serveur via trigger
--      (voir ci-dessous) et NE PAS autoriser l'insert direct par le client.
--    En attendant, l'insert de notifications n'a AUCUNE policy ⇒ il est bloqué
--    par défaut (RLS deny-all). Active le trigger ci-dessous pour le remplacer.

-- Trigger : créer automatiquement une notif à l'insertion d'un booking.
create or replace function public.notify_on_booking()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(user_id, type, title, message)
  values (new.artisan_id, 'new_booking', 'Nouvelle demande',
          'Un client souhaite vous contacter.');
  return new;
end; $$;

drop trigger if exists trg_notify_on_booking on public.bookings;
create trigger trg_notify_on_booking
  after insert on public.bookings
  for each row execute function public.notify_on_booking();

-- Trigger : notifier le destinataire à chaque message.
create or replace function public.notify_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare recipient uuid;
begin
  select case when client_id = new.sender_id then artisan_id else client_id end
    into recipient from public.bookings where id = new.booking_id;
  if recipient is not null then
    insert into public.notifications(user_id, type, title, message)
    values (recipient, 'new_message', 'Nouveau message', left(new.content, 80));
  end if;
  return new;
end; $$;

drop trigger if exists trg_notify_on_message on public.messages;
create trigger trg_notify_on_message
  after insert on public.messages
  for each row execute function public.notify_on_message();

-- ── REVIEWS ─────────────────────────────────────────────────────────────────
-- Lecture publique (notes affichées sur les profils).
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews
  for select using (true);

-- Création : seulement par le client, sur SON propre booking TERMINÉ (completed).
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews
  for insert with check (
    client_id = auth.uid()
    and exists(
      select 1 from public.bookings b
      where b.id = reviews.booking_id
        and b.client_id = auth.uid()
        and b.artisan_id = reviews.artisan_id
        and b.status = 'completed'
    )
  );

-- Suppression : son propre avis (ou admin).
drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews
  for delete using (client_id = auth.uid() or public.is_admin());

-- Recalcul de la note de l'artisan à chaque écriture d'avis (anti-triche).
create or replace function public.recalc_artisan_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare a_id uuid;
begin
  a_id := coalesce(new.artisan_id, old.artisan_id);
  update public.artisans set
    rating_avg   = coalesce((select avg(rating) from public.reviews where artisan_id = a_id), 0),
    rating_count = (select count(*) from public.reviews where artisan_id = a_id)
  where id = a_id;
  return null;
end; $$;

drop trigger if exists trg_recalc_rating on public.reviews;
create trigger trg_recalc_rating
  after insert or update or delete on public.reviews
  for each row execute function public.recalc_artisan_rating();

-- ============================================================================
-- VÉRIFICATION : lister les tables où RLS n'est PAS activé (doit être vide)
-- ============================================================================
-- select tablename from pg_tables t
--   where schemaname = 'public'
--     and not exists (select 1 from pg_class c
--       where c.relname = t.tablename and c.relrowsecurity);
