-- ============================================================================
-- BETI — Durcissement de lancement (audit indépendant)
-- ============================================================================
-- ORDRE D'EXÉCUTION (SQL Editor Supabase, à la main) :
--   1. rls_policies.sql  2. security_hardening.sql  3. privacy_hardening.sql
--   4. CE FICHIER (launch_hardening.sql)
-- Prérequis : is_admin(), is_booking_party(), is_client_write(),
--   tables bookings/artisans/offers/reviews/messages/notifications,
--   subscriptions_schema.sql (colonnes plan/plan_until), offers_schema.sql.
-- Idempotent : ré-exécutable. Aucune suppression de données.
-- Recommandé : tester d'abord sur une branche Supabase.
-- Les CHECK sont posés "not valid" (nouvelles écritures seulement) ; les
-- commandes "validate constraint" sont commentées : à lancer après contrôle.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1. PLAN PREMIUM GRATUIT / STATS FALSIFIABLES À L'INSCRIPTION
-- Problème : guard_artisan_plan est BEFORE UPDATE seulement ; guard_artisan_stats
--   ne remet pas plan à zéro à l'INSERT.
-- Attaque : upsert client dans artisans avec plan='premium', plan_until lointain,
--   rating_avg=5, total_missions=999 -> premium gratuit, fausse réputation.
-- Vérification : en tant qu'utilisateur normal, insérer plan='premium' stocke
--   plan='free' (voir aussi bloc 11-c).
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.guard_artisan_plan_all()
returns trigger language plpgsql as $$
begin
  -- Seules les écritures directes du client (authenticated/anon, non admin)
  -- sont bridées ; service_role et fonctions security definer passent.
  if public.is_client_write() then
    if tg_op = 'INSERT' then
      new.plan := 'free';
      new.plan_until := null;
      new.rating_avg := 0;
      new.rating_count := 0;
      new.total_missions := 0;
    else
      new.plan := old.plan;
      new.plan_until := old.plan_until;
      new.rating_avg := old.rating_avg;
      new.rating_count := old.rating_count;
      new.total_missions := old.total_missions;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_artisan_plan_all on public.artisans;
create trigger trg_guard_artisan_plan_all
  before insert or update on public.artisans
  for each row execute function public.guard_artisan_plan_all();

-- ════════════════════════════════════════════════════════════════════════════
-- 2. STORAGE beti-photos
-- Problème : "beti-photos read" permet à anon de LISTER tous les objets
--   (photos de domiciles) ; INSERT/UPDATE/DELETE trop larges.
-- Attaque : lister le bucket, écrire dans problems/<bookingId> d'autrui.
-- Vérification : bloc 11-h ; aucune policy SELECT sur beti-photos, les URL
--   publiques marchent toujours (bucket public).
-- Chemins : avatars/{uid}/..., avatars/{uid}_ts.ext, portfolio/{uid}/...,
--   review-photos|problems|interventions/{bookingId}/...
-- ════════════════════════════════════════════════════════════════════════════
drop policy if exists "beti-photos read" on storage.objects;

drop policy if exists "beti-photos insert" on storage.objects;
create policy "beti-photos insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'beti-photos'
    and (
      name like 'avatars/' || auth.uid()::text || '/%'
      or name like 'avatars/' || auth.uid()::text || '\_%'
      or name like 'portfolio/' || auth.uid()::text || '/%'
      or (
        (storage.foldername(name))[1] in ('problems', 'interventions', 'review-photos')
        and (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
        and public.is_booking_party(((storage.foldername(name))[2])::uuid)
      )
      or public.is_admin()
    )
  );

drop policy if exists "beti-photos update" on storage.objects;
create policy "beti-photos update" on storage.objects
  for update to authenticated
  using (bucket_id = 'beti-photos' and (owner = auth.uid() or public.is_admin()))
  with check (bucket_id = 'beti-photos' and (owner = auth.uid() or public.is_admin()));

drop policy if exists "beti-photos delete" on storage.objects;
create policy "beti-photos delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'beti-photos' and (owner = auth.uid() or public.is_admin()));

update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'beti-photos';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. OFFRES
-- Problème : insert avec status='accepted' / montant négatif ; update libre de
--   amount/sender_id/status par n'importe quelle partie.
-- Attaque : s'auto-accepter une offre à 1 DZD ; réécrire le montant d'autrui.
-- Vérification : insert status='accepted' -> stocké 'pending' ; update amount
--   -> erreur.
-- ════════════════════════════════════════════════════════════════════════════
do $$ begin
  alter table public.offers
    add constraint offers_amount_positive check (amount > 0) not valid;
exception when duplicate_object then null;
end $$;
-- Après contrôle (select * from public.offers where amount <= 0) :
-- alter table public.offers validate constraint offers_amount_positive;

create or replace function public.guard_offers()
returns trigger language plpgsql as $$
begin
  if not public.is_client_write() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.sender_id := auth.uid();
  else
    if new.amount is distinct from old.amount
       or new.sender_id is distinct from old.sender_id
       or new.booking_id is distinct from old.booking_id
       or new.created_at is distinct from old.created_at then
      raise exception 'Seul le statut d''une offre peut changer' using errcode = '42501';
    end if;
    if new.status is distinct from old.status and old.sender_id = auth.uid() then
      raise exception 'L''émetteur ne peut pas répondre à sa propre offre' using errcode = '42501';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_offers on public.offers;
create trigger trg_guard_offers
  before insert or update on public.offers
  for each row execute function public.guard_offers();

-- ════════════════════════════════════════════════════════════════════════════
-- 4. BOOKINGS : adresse, coordonnées, mode de paiement, prix
-- Problème : guard_booking_update ne protège que client_id/artisan_id/status.
-- Attaque : l'artisan réécrit address/lat/lng/payment_method ; le client
--   modifie price_agreed après acceptation.
-- Règle : address/lat/lng/payment_method modifiables seulement par le client
--   tant que status='pending' ; price_agreed figé dès status <> 'pending'.
-- Vérification : artisan update address -> valeur inchangée.
-- Note : price_agreed n'est écrit qu'à la création dans le code actuel
--   (BookingFlow.tsx, lib/contactArtisan.ts) ; si une négociation doit le
--   modifier après acceptation, passer par une fonction security definer.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.guard_booking_fields()
returns trigger language plpgsql as $$
begin
  if not public.is_client_write() then
    return new;
  end if;
  if not (auth.uid() = old.client_id and old.status::text = 'pending') then
    new.address := old.address;
    new.lat := old.lat;
    new.lng := old.lng;
    new.payment_method := old.payment_method;
  end if;
  if old.status::text <> 'pending' then
    new.price_agreed := old.price_agreed;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_booking_fields on public.bookings;
create trigger trg_guard_booking_fields
  before update on public.bookings
  for each row execute function public.guard_booking_fields();

-- ════════════════════════════════════════════════════════════════════════════
-- 5. AVIS
-- Problème : note hors 1..5, doublons, recalcul incorrect sur DELETE.
-- Attaque : note 1000 -> moyenne faussée ; plusieurs avis par réservation.
-- Vérification : insert rating 9 -> refusé ; supprimer un avis met à jour la
--   moyenne.
-- ════════════════════════════════════════════════════════════════════════════
do $$ begin
  alter table public.reviews
    add constraint reviews_rating_range check (rating between 1 and 5) not valid;
exception when duplicate_object then null;
end $$;
-- Après contrôle (select * from public.reviews where rating not between 1 and 5) :
-- alter table public.reviews validate constraint reviews_rating_range;

do $$
begin
  if exists (select 1 from pg_indexes
             where schemaname = 'public' and tablename = 'reviews'
               and indexdef ilike '%unique%' and indexdef ilike '%(booking_id)%') then
    raise notice 'reviews: index unique par booking deja present';
  elsif exists (select 1 from public.reviews where booking_id is not null
                group by booking_id having count(*) > 1) then
    raise notice 'reviews: DOUBLONS par booking_id, index unique NON cree (a nettoyer a la main)';
  else
    create unique index reviews_one_per_booking on public.reviews (booking_id);
  end if;
end $$;

create or replace function public.recalc_artisan_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare a_id uuid;
begin
  a_id := case when tg_op = 'DELETE' then old.artisan_id else new.artisan_id end;
  update public.artisans set
    rating_avg   = coalesce((select avg(rating) from public.reviews where artisan_id = a_id), 0),
    rating_count = (select count(*) from public.reviews where artisan_id = a_id)
  where id = a_id;
  -- Changement d'artisan sur UPDATE : recalcule aussi l'ancien.
  if tg_op = 'UPDATE' and old.artisan_id is distinct from new.artisan_id then
    update public.artisans set
      rating_avg   = coalesce((select avg(rating) from public.reviews where artisan_id = old.artisan_id), 0),
      rating_count = (select count(*) from public.reviews where artisan_id = old.artisan_id)
    where id = old.artisan_id;
  end if;
  return null;
end; $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 6. GPS LIVE : fenêtre de partage limitée
-- Problème : position exacte visible tant que la réservation est 'confirmed',
--   sans limite de durée, même périmée.
-- Attaque : un client suit un artisan pendant des jours.
-- Règle : réservation in_progress ET position mise à jour < 10 minutes
--   (artisan_live_location.updated_at, rafraîchi par trigger à chaque écriture).
-- Vérification : client avec réservation 'confirmed' ne voit plus la ligne.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.can_see_live_location(a_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    a_id = auth.uid()
    or public.is_admin()
    or (
      exists (
        select 1 from public.bookings b
        where b.artisan_id = a_id and b.client_id = auth.uid()
          and b.status::text = 'in_progress'
      )
      and exists (
        select 1 from public.artisan_live_location l
        where l.artisan_id = a_id
          and l.updated_at > now() - interval '10 minutes'
      )
    )
  );
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 7. NUMÉRO : phone_exists reste appelable par anon (nécessaire à l'inscription
--   avant connexion) et ne renvoie qu'un booléen (redéfinie ici à l'identique
--   pour garantir search_path et droits).
-- Risque résiduel : énumération de numéros. À FAIRE CÔTÉ DASHBOARD :
--   - Authentication > Rate Limits : limiter les envois SMS/OTP par heure et
--     par IP, et les vérifications OTP.
--   - Plafond de dépense du fournisseur SMS/WhatsApp (Twilio, etc.) + alertes.
--   - Activer le CAPTCHA (Authentication > Attack Protection) si possible.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.phone_exists(p_phone text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profile_private
    where phone = p_phone and id is distinct from auth.uid()
  );
$$;
revoke all on function public.phone_exists(text) from public;
grant execute on function public.phone_exists(text) to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 8. MESSAGES : identité de l'expéditeur et taille
-- Problème : sender_name/sender_role fournis par le client ; contenu illimité.
-- Attaque : se faire passer pour un admin/support ; messages géants.
-- Vérification : insert avec sender_name='X' -> stocké avec le vrai nom.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.set_message_sender()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  select full_name, role::text as role into p from public.profiles where id = new.sender_id;
  if found then
    new.sender_name := coalesce(p.full_name, '');
    new.sender_role := coalesce(p.role, 'client');
  end if;
  return new;
end; $$;

drop trigger if exists trg_set_message_sender on public.messages;
create trigger trg_set_message_sender
  before insert on public.messages
  for each row execute function public.set_message_sender();

do $$ begin
  alter table public.messages
    add constraint messages_content_len check (char_length(content) <= 2000) not valid;
exception when duplicate_object then null;
end $$;
-- alter table public.messages validate constraint messages_content_len;

-- ════════════════════════════════════════════════════════════════════════════
-- 9. INDEX et CHECK de plausibilité (protégés par test d'existence)
-- Problème : requêtes lentes à l'échelle ; valeurs aberrantes acceptées.
-- Attaque : prix/coordonnées absurdes ; DoS par scans complets.
-- Vérification : select indexname from pg_indexes where schemaname='public';
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare
  r record;
  c text;
  ok boolean;
begin
  for r in select * from (values
    ('bookings_client_idx',         'bookings',      'client_id'),
    ('bookings_artisan_status_idx', 'bookings',      'artisan_id,status'),
    ('messages_booking_created_idx','messages',      'booking_id,created_at'),
    ('notifications_user_read_idx', 'notifications', 'user_id,is_read'),
    ('reviews_artisan_idx',         'reviews',       'artisan_id'),
    ('artisans_category_idx',       'artisans',      'category')
  ) as t(idx, tbl, cols)
  loop
    ok := to_regclass('public.' || r.tbl) is not null;
    if ok then
      foreach c in array string_to_array(r.cols, ',') loop
        if not exists (select 1 from information_schema.columns
                       where table_schema = 'public' and table_name = r.tbl and column_name = c) then
          ok := false;
        end if;
      end loop;
    end if;
    if ok then
      execute format('create index if not exists %I on public.%I (%s)', r.idx, r.tbl, r.cols);
    else
      raise notice 'index % ignore (table ou colonne absente)', r.idx;
    end if;
  end loop;
end $$;

do $$ begin
  alter table public.bookings add constraint bookings_price_nonneg
    check (price_agreed is null or price_agreed >= 0) not valid;
exception when duplicate_object or undefined_column then null;
end $$;
do $$ begin
  alter table public.artisans add constraint artisans_rate_nonneg
    check (hourly_rate is null or hourly_rate >= 0) not valid;
exception when duplicate_object or undefined_column then null;
end $$;
do $$ begin
  alter table public.artisans add constraint artisans_latlng_range
    check ((lat is null or lat between -90 and 90) and (lng is null or lng between -180 and 180)) not valid;
exception when duplicate_object or undefined_column then null;
end $$;
do $$ begin
  alter table public.bookings add constraint bookings_latlng_range
    check ((lat is null or lat between -90 and 90) and (lng is null or lng between -180 and 180)) not valid;
exception when duplicate_object or undefined_column then null;
end $$;
-- Validation (après contrôle des lignes existantes) :
-- alter table public.bookings validate constraint bookings_price_nonneg;
-- alter table public.artisans validate constraint artisans_rate_nonneg;
-- alter table public.artisans validate constraint artisans_latlng_range;
-- alter table public.bookings validate constraint bookings_latlng_range;

-- ════════════════════════════════════════════════════════════════════════════
-- 10. FONCTIONS HORS DÉPÔT : update_artisan_location, get_nearby_artisans
-- NON redéfinies ici (signatures inconnues). Vérifications en lecture seule :
-- ════════════════════════════════════════════════════════════════════════════
-- select p.proname, p.prosecdef, p.proconfig, pg_get_functiondef(p.oid)
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public'
--    and p.proname in ('update_artisan_location', 'get_nearby_artisans');
-- select p.proname, p.proacl from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public'
--    and p.proname in ('update_artisan_location', 'get_nearby_artisans');
-- Interprétation attendue :
--  - update_artisan_location : si prosecdef = true, le corps DOIT tester
--    artisan_id = auth.uid() (sinon n'importe qui déplace n'importe quel
--    artisan) ; proconfig doit contenir search_path=public.
--  - get_nearby_artisans ne doit renvoyer NI téléphone NI coordonnées exactes
--    (pas de lecture de artisan_live_location ni de profile_private).
--  - security definer avec proconfig NULL = à corriger :
--    alter function public.<nom>(<args>) set search_path = public;

-- ════════════════════════════════════════════════════════════════════════════
-- 11. VÉRIFICATIONS APRÈS EXÉCUTION (lecture seule, à lancer une par une)
-- ════════════════════════════════════════════════════════════════════════════
-- a) Rôle anon : tout doit être refusé / vide
--   begin; set local role anon;
--   select * from public.profile_private;            -- refusé
--   select * from public.artisan_live_location;      -- refusé
--   select * from public.bookings;                   -- 0 ligne
--   select * from public.messages;                   -- 0 ligne
--   select * from public.offers;                     -- 0 ligne
--   select * from storage.objects where bucket_id = 'beti-photos'; -- 0 ligne
--   select public.phone_exists('+213000000000');     -- booléen seul : OK
--   rollback;
-- b) Rôle authenticated sans claims (auth.uid() null) :
--   begin; set local role authenticated;
--   select * from public.profile_private;            -- 0 ligne
--   select * from public.subscriptions;              -- 0 ligne
--   rollback;
-- c) Artisans premium sans abonnement actif (doit être 0 ou justifié) :
--   select count(*) from public.artisans a
--    where a.plan <> 'free'
--      and not exists (select 1 from public.subscriptions s
--                      where s.artisan_id = a.id and s.status = 'active'
--                        and (s.expires_at is null or s.expires_at > now()));
-- d) Fonctions security definer sans search_path (attendu : vide) :
--   select n.nspname, p.proname from pg_proc p
--     join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.prosecdef
--      and (p.proconfig is null or not exists
--           (select 1 from unnest(p.proconfig) c where c like 'search_path=%'));
--   -- guard_artisan_plan (subscriptions_schema.sql) y figure : corriger avec
--   -- alter function public.guard_artisan_plan() set search_path = public;
-- e) Tables du schéma public sans RLS (attendu : vide) :
--   select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
-- f) Policies larges restantes (attendu : lectures publiques voulues seulement,
--    profiles, artisans, reviews, portfolio_posts) :
--   select tablename, policyname, cmd from pg_policies
--    where schemaname in ('public', 'storage')
--      and (qual = 'true' or with_check = 'true');
-- g) Triggers de garde présents :
--   select tgname, tgrelid::regclass from pg_trigger
--    where tgname in ('trg_guard_artisan_plan_all', 'trg_guard_offers',
--      'trg_guard_booking_fields', 'trg_set_message_sender', 'trg_recalc_rating');
-- h) Policies storage (aucune SELECT sur beti-photos) :
--   select policyname, cmd from pg_policies
--    where schemaname = 'storage' and tablename = 'objects';
