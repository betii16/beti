-- ============================================================================
-- BETI : correctifs d'INTEGRITE, 2e lot (etat de production lu le 2026-11-02)
-- Additif, aucune suppression de donnees. Re-executable.
--
-- PREREQUIS : fix_booking_status.sql, fix_integrity.sql et privacy_hardening.sql
-- DEJA executes (utilise public.is_admin(), public.is_booking_party()).
--
-- Defauts corriges :
--  1. offers : chaque partie pouvait modifier montant et statut de n'importe quelle
--     offre (y compris accepter la sienne). Le code de l'application n'utilise pas
--     encore la table `offers` (aucune requete dans app/, components/, lib/), donc
--     ce durcissement ne casse aucun ecran existant.
--  2. avis : deux declencheurs recalculaient la note en concurrence. On garde un seul
--     calcul (security definer, ne compte que is_visible = true).
--  3. artisans.siret / insurance_number lisibles par anon : l'application ne les lit
--     ni ne les ecrit. Elles sont deplacees vers une table privee.
-- ============================================================================

-- ── 1. OFFRES ───────────────────────────────────────────────────────────────
-- Regles :
--  * le montant, l'auteur, la reservation et la date sont immuables apres creation ;
--  * seule l'AUTRE partie (celle qui n'a pas envoye l'offre) peut passer
--    pending -> accepted ou pending -> declined ;
--  * l'auteur peut seulement retirer/remplacer son offre : pending -> superseded ;
--  * toute autre transition est refusee. Les admins et la cle service sont exemptes.
create or replace function public.guard_offer_update()
returns trigger language plpgsql set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    -- Colonnes figees : on remet les anciennes valeurs, quoi que le client envoie.
    new.amount     := old.amount;
    new.sender_id  := old.sender_id;
    new.booking_id := old.booking_id;
    new.created_at := old.created_at;

    if new.status is distinct from old.status then
      if old.status <> 'pending' then
        raise exception 'offre deja traitee : statut non modifiable' using errcode = '42501';
      end if;
      if uid is not null and uid = old.sender_id then
        if new.status <> 'superseded' then
          raise exception 'l''auteur d''une offre ne peut pas l''accepter ni la refuser' using errcode = '42501';
        end if;
      elsif uid is not null and public.is_booking_party(old.booking_id) then
        if new.status not in ('accepted', 'declined') then
          raise exception 'statut d''offre non autorise' using errcode = '42501';
        end if;
      else
        raise exception 'modification d''offre non autorisee' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_offer_update on public.offers;
create trigger trg_guard_offer_update
  before update on public.offers
  for each row execute function public.guard_offer_update();
revoke execute on function public.guard_offer_update() from public, anon, authenticated;

-- Creation : une offre naissante est toujours 'pending' et d'un montant positif
-- (sinon on pouvait inserer directement une offre deja 'accepted').
drop policy if exists offers_insert on public.offers;
create policy offers_insert on public.offers
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_booking_party(booking_id)
    and status = 'pending'
    and amount > 0
  );

-- ── 2. NOTE MOYENNE : un seul calcul ────────────────────────────────────────
-- On conserve le declencheur trg_recalc_rating / recalc_artisan_rating (le seul qui
-- avait les droits d'ecrire dans artisans, et le seul qui gere aussi DELETE), mais
-- on lui donne le filtre is_visible de l'autre version. On supprime l'autre
-- declencheur (reviews_update_rating : sans droits, sans effet reel, plante sur DELETE).
-- DECISION : un avis masque ne compte plus dans la note (a confirmer, voir rapport).
create or replace function public.recalc_artisan_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare a_id uuid;
begin
  -- Si un avis change d'artisan (cas rare), on recalcule aussi l'ancien.
  for a_id in
    select distinct x from unnest(array[
      case when tg_op in ('INSERT', 'UPDATE') then new.artisan_id end,
      case when tg_op in ('DELETE', 'UPDATE') then old.artisan_id end
    ]) as x where x is not null
  loop
    update public.artisans a set
      rating_avg   = coalesce((select avg(r.rating) from public.reviews r
                               where r.artisan_id = a_id and r.is_visible = true), 0),
      rating_count = (select count(*) from public.reviews r
                      where r.artisan_id = a_id and r.is_visible = true)
    where a.id = a_id;
  end loop;
  return null;
end; $$;
revoke execute on function public.recalc_artisan_rating() from public, anon, authenticated;

drop trigger if exists reviews_update_rating on public.reviews;

drop trigger if exists trg_recalc_rating on public.reviews;
create trigger trg_recalc_rating
  after insert or update or delete on public.reviews
  for each row execute function public.recalc_artisan_rating();

-- Remise a niveau des notes existantes avec la nouvelle regle (idempotent).
update public.artisans a set
  rating_avg   = coalesce((select avg(r.rating) from public.reviews r
                           where r.artisan_id = a.id and r.is_visible = true), 0),
  rating_count = (select count(*) from public.reviews r
                  where r.artisan_id = a.id and r.is_visible = true);
-- (L'UPDATE ci-dessus passe par trg_guard_artisan_stats, mais l'editeur SQL tourne
--  en tant que postgres, pas `authenticated` : le garde ne s'applique pas.)

-- ── 3. SIRET / ASSURANCE : table privee ─────────────────────────────────────
-- Constat : artisans.siret et insurance_number sont lisibles par anon (SELECT sur
-- toute la ligne), et le code de l'application ne les utilise nulle part. On NE
-- retire PAS les colonnes ni leurs droits : plusieurs ecrans font
-- select('*') sur artisans, et un REVOKE par colonne ferait echouer ces requetes.
-- A la place : table privee (proprietaire + admin) et declencheur qui detourne toute
-- ecriture future vers cette table en laissant NULL dans artisans.
create table if not exists public.artisan_private (
  artisan_id       uuid primary key references public.artisans(id) on delete cascade,
  siret            text,
  insurance_number text,
  updated_at       timestamptz not null default now()
);
alter table public.artisan_private enable row level security;
revoke all on public.artisan_private from anon;

drop policy if exists artisan_private_select on public.artisan_private;
create policy artisan_private_select on public.artisan_private
  for select to authenticated
  using (artisan_id = auth.uid() or public.is_admin());

drop policy if exists artisan_private_insert on public.artisan_private;
create policy artisan_private_insert on public.artisan_private
  for insert to authenticated
  with check (artisan_id = auth.uid());

drop policy if exists artisan_private_update on public.artisan_private;
create policy artisan_private_update on public.artisan_private
  for update to authenticated
  using (artisan_id = auth.uid())
  with check (artisan_id = auth.uid());

-- Copie des valeurs existantes (0 aujourd'hui), puis effacement cote public.
insert into public.artisan_private (artisan_id, siret, insurance_number)
select id, siret, insurance_number from public.artisans
where siret is not null or insurance_number is not null
on conflict (artisan_id) do update
  set siret = excluded.siret, insurance_number = excluded.insurance_number, updated_at = now();

create or replace function public.divert_artisan_private()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.siret is not null or new.insurance_number is not null then
    insert into public.artisan_private (artisan_id, siret, insurance_number)
    values (new.id, new.siret, new.insurance_number)
    on conflict (artisan_id) do update
      set siret = coalesce(excluded.siret, public.artisan_private.siret),
          insurance_number = coalesce(excluded.insurance_number, public.artisan_private.insurance_number),
          updated_at = now();
    new.siret := null;
    new.insurance_number := null;
  end if;
  return new;
end; $$;
revoke execute on function public.divert_artisan_private() from public, anon, authenticated;

drop trigger if exists trg_divert_artisan_private on public.artisans;
create trigger trg_divert_artisan_private
  before insert or update on public.artisans
  for each row execute function public.divert_artisan_private();

update public.artisans set siret = null, insurance_number = null
where siret is not null or insurance_number is not null;

-- ============================================================================
-- VERIFICATIONS (lecture seule, apres execution)
-- select tgname from pg_trigger where tgrelid='public.reviews'::regclass and not tgisinternal;
--   -- attendu : trg_recalc_rating seul
-- select tgname from pg_trigger where tgname in ('trg_guard_offer_update','trg_divert_artisan_private'); -- 2 lignes
-- select count(*) from public.artisans where siret is not null or insurance_number is not null; -- 0
-- Test d'attaque offres (l'auteur tente d'accepter sa propre offre : doit lever une erreur) :
-- do $$ declare o record; begin
--   select id, sender_id into o from public.offers where status='pending' limit 1;
--   perform set_config('request.jwt.claims', json_build_object('sub', o.sender_id, 'role','authenticated')::text, true);
--   set local role authenticated;
--   update public.offers set status='accepted' where id=o.id;
--   raise exception 'ECHEC DU TEST : acceptation acceptee';
-- end $$;  -- attendu : "l'auteur d'une offre ne peut pas l'accepter ni la refuser"
-- (necessite au moins une offre pending ; la table est vide ou presque aujourd'hui)
-- ============================================================================
