-- ============================================================================
-- BETI : MODERATION et SIGNALEMENTS (tickets)
-- Additif, idempotent, aucune suppression de donnees. Re-executable.
-- A EXECUTER A LA MAIN dans le SQL Editor, apres rls_policies.sql,
-- security_hardening.sql et privacy_hardening.sql. Tester d'abord sur une branche.
--
-- PREREQUIS : public.is_admin(), public.is_booking_party(), public.is_client_write()
-- (security_hardening.sql). Ne remplace AUCUNE policy ni fonction existante :
-- guard_profile_role reste intact, les nouvelles regles sont des objets a part.
--
-- Contenu :
--  1. reports            : tickets de signalement (auteur insere/lit les siens, admin traite)
--  2. report_admin_notes : note interne, admin SEULEMENT (voir remarque ci-dessous)
--  3. moderation_log     : journal d'actions en ajout seul, lisible par l'admin
--  4. Acces admin au contexte : messages (reservations signalees seulement) et bookings
--  5. SUSPENSION         : is_active protege + comptes suspendus bloques (RLS)
--
-- Remarque de conception : la note interne n'est PAS une colonne de `reports`.
-- L'auteur lit ses propres signalements (policy ligne par ligne) : une colonne
-- admin_note dans la meme table lui exposerait les notes internes des moderateurs.
-- Elle vit donc dans `report_admin_notes`, illisible pour tout non-admin.
-- ============================================================================

-- ── 1. REPORTS ──────────────────────────────────────────────────────────────
-- Pas de cle etrangere sur reported_user_id / booking_id / target_id : si le
-- compte ou la reservation disparait (suppression de compte), la preuve reste
-- pour la moderation. reporter_id disparait avec le compte de l'auteur (vie privee).
create table if not exists public.reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references auth.users(id) on delete cascade,
  target_type      text not null,
  target_id        uuid not null,
  reported_user_id uuid not null,
  booking_id       uuid,
  reason           text not null,
  details          text,
  status           text not null default 'open',
  resolution       text not null default 'none',
  handled_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  handled_at       timestamptz,
  constraint reports_target_type_chk check (target_type in ('artisan','client','booking','review','message')),
  constraint reports_reason_chk check (reason in ('fraude','comportement','travail_non_fait','prix_different','faux_profil','harcelement','autre')),
  constraint reports_status_chk check (status in ('open','in_review','resolved','rejected')),
  constraint reports_resolution_chk check (resolution in ('none','warning','suspension','refund_cash_dispute','refund_card','other')),
  constraint reports_details_len_chk check (details is null or char_length(details) <= 2000),
  -- « autre » sans explication est inexploitable
  constraint reports_autre_details_chk check (reason <> 'autre' or char_length(btrim(coalesce(details, ''))) >= 10),
  constraint reports_not_self_chk check (reporter_id <> reported_user_id),
  -- un message ou une reservation signalee doit pointer vers sa reservation
  constraint reports_booking_ctx_chk check (target_type not in ('booking','message') or booking_id is not null)
);

create index if not exists reports_status_created_idx on public.reports (status, created_at desc);
create index if not exists reports_reporter_idx       on public.reports (reporter_id, status);
create index if not exists reports_reported_idx       on public.reports (reported_user_id);
create index if not exists reports_booking_idx        on public.reports (booking_id) where booking_id is not null;
-- Un meme utilisateur ne peut pas rouvrir le meme signalement tant qu'il est en traitement.
create unique index if not exists reports_one_active_per_target
  on public.reports (reporter_id, target_type, target_id) where status in ('open','in_review');

alter table public.reports enable row level security;

-- Droits de table : pas d'acces anonyme, pas de DELETE pour personne via l'API.
revoke all on public.reports from anon, authenticated;
grant select, insert, update on public.reports to authenticated;

-- Lecture : l'auteur lit les siens, l'admin lit tout. Le signale ne voit JAMAIS
-- un signalement (aucune policy ne le designe, reporter_id <> reported_user_id).
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

-- Insertion : sous son propre nom, statut force « open », champs admin vides.
-- La relation a la reservation et l'anti-spam sont verifies par le trigger ci-dessous.
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
  for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and status = 'open'
    and resolution = 'none'
    and handled_by is null
    and handled_at is null
  );

-- Mise a jour : admin seulement (l'auteur ne peut pas modifier un signalement envoye).
drop policy if exists reports_update on public.reports;
create policy reports_update on public.reports
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Trigger d'insertion : coherence + anti-spam. Volontairement SANS security definer :
-- is_client_write() lit current_user, qui serait le proprietaire dans une fonction
-- definer (le garde serait alors desactive). Les lectures (ses propres signalements,
-- profiles, bookings dont il est partie, reviews) passent par le RLS de l'appelant.
create or replace function public.guard_report_insert()
returns trigger language plpgsql set search_path = public as $$
declare
  b record;
  open_count int;
begin
  if public.is_client_write() then
    -- Champs de traitement : jamais fournis par le client.
    new.status := 'open';
    new.resolution := 'none';
    new.handled_by := null;
    new.handled_at := null;
    new.reporter_id := auth.uid();
    new.created_at := now();
    new.updated_at := now();

    -- Anti-spam : 20 signalements non clos au maximum par utilisateur.
    select count(*) into open_count from public.reports
      where reporter_id = new.reporter_id and status in ('open','in_review');
    if open_count >= 20 then
      raise exception 'reports_limit_reached' using errcode = 'P0001';
    end if;

    -- Le signale doit exister.
    if not exists (select 1 from public.profiles where id = new.reported_user_id) then
      raise exception 'reports_unknown_user' using errcode = 'P0001';
    end if;

    -- Reservation citee : l'auteur doit en etre partie et viser l'AUTRE partie.
    -- (Empeche d'ouvrir la conversation d'inconnus aux admins via un faux booking_id.)
    if new.booking_id is not null then
      select client_id, artisan_id into b from public.bookings where id = new.booking_id;
      if not found or auth.uid() not in (b.client_id, b.artisan_id)
         or new.reported_user_id not in (b.client_id, b.artisan_id) then
        raise exception 'reports_invalid_booking' using errcode = 'P0001';
      end if;
    end if;

    -- Coherence cible / signale selon le type.
    if new.target_type in ('artisan','client') and new.target_id <> new.reported_user_id then
      raise exception 'reports_invalid_target' using errcode = 'P0001';
    elsif new.target_type = 'booking' and new.target_id <> new.booking_id then
      raise exception 'reports_invalid_target' using errcode = 'P0001';
    elsif new.target_type = 'review' and not exists (
      select 1 from public.reviews r
      where r.id = new.target_id and new.reported_user_id in (r.client_id, r.artisan_id)
    ) then
      raise exception 'reports_invalid_target' using errcode = 'P0001';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_report_insert on public.reports;
create trigger trg_guard_report_insert
  before insert on public.reports
  for each row execute function public.guard_report_insert();

-- Trigger de mise a jour : un non-admin ne modifie RIEN (status, resolution,
-- handled_*) ; meme l'admin ne reecrit ni l'auteur, ni la cible, ni le motif, ni le texte.
create or replace function public.guard_report_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_client_write() then
    raise exception 'reports_admin_only' using errcode = '42501';
  end if;
  if new.reporter_id is distinct from old.reporter_id
     or new.target_type is distinct from old.target_type
     or new.target_id is distinct from old.target_id
     or new.reported_user_id is distinct from old.reported_user_id
     or new.booking_id is distinct from old.booking_id
     or new.reason is distinct from old.reason
     or new.details is distinct from old.details
     or new.created_at is distinct from old.created_at then
    raise exception 'reports_immutable_fields' using errcode = '42501';
  end if;
  new.updated_at := now();
  if new.status is distinct from old.status or new.resolution is distinct from old.resolution then
    new.handled_by := auth.uid();
  end if;
  new.handled_at := case when new.status in ('resolved','rejected') then coalesce(old.handled_at, now()) else null end;
  return new;
end; $$;

drop trigger if exists trg_guard_report_update on public.reports;
create trigger trg_guard_report_update
  before update on public.reports
  for each row execute function public.guard_report_update();

-- Fonctions de trigger : jamais appelables directement.
revoke execute on function public.guard_report_insert() from public, anon, authenticated;
revoke execute on function public.guard_report_update() from public, anon, authenticated;

-- ── 2. NOTE INTERNE (admin seulement) ───────────────────────────────────────
create table if not exists public.report_admin_notes (
  report_id  uuid primary key references public.reports(id) on delete cascade,
  note       text not null default '' check (char_length(note) <= 4000),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.report_admin_notes enable row level security;
revoke all on public.report_admin_notes from anon, authenticated;
grant select, insert, update on public.report_admin_notes to authenticated;

drop policy if exists report_notes_admin_select on public.report_admin_notes;
create policy report_notes_admin_select on public.report_admin_notes
  for select to authenticated using (public.is_admin());
drop policy if exists report_notes_admin_insert on public.report_admin_notes;
create policy report_notes_admin_insert on public.report_admin_notes
  for insert to authenticated with check (public.is_admin() and updated_by = auth.uid());
drop policy if exists report_notes_admin_update on public.report_admin_notes;
create policy report_notes_admin_update on public.report_admin_notes
  for update to authenticated using (public.is_admin()) with check (public.is_admin() and updated_by = auth.uid());

-- ── 3. JOURNAL DE MODERATION (ajout seul) ───────────────────────────────────
create table if not exists public.moderation_log (
  id         bigint generated always as identity primary key,
  admin_id   uuid not null references auth.users(id) on delete restrict,
  action     text not null check (char_length(action) between 1 and 60),
  target     text,                                   -- ex. « profile:<uuid> », « report:<uuid> »
  report_id  uuid references public.reports(id) on delete set null,
  details    jsonb not null default '{}'::jsonb,     -- jamais de donnee personnelle (telephone...)
  created_at timestamptz not null default now()
);
create index if not exists moderation_log_report_idx on public.moderation_log (report_id, created_at desc);

alter table public.moderation_log enable row level security;
revoke all on public.moderation_log from anon, authenticated;
grant select, insert on public.moderation_log to authenticated;   -- ni UPDATE ni DELETE

drop policy if exists moderation_log_select on public.moderation_log;
create policy moderation_log_select on public.moderation_log
  for select to authenticated using (public.is_admin());
drop policy if exists moderation_log_insert on public.moderation_log;
create policy moderation_log_insert on public.moderation_log
  for insert to authenticated with check (public.is_admin() and admin_id = auth.uid());

-- Filet : meme un role qui contournerait les grants (ex. proprietaire) ne reecrit pas l'histoire.
create or replace function public.moderation_log_append_only()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'moderation_log est en ajout seul' using errcode = '42501';
end; $$;
revoke execute on function public.moderation_log_append_only() from public, anon, authenticated;
drop trigger if exists trg_moderation_log_append_only on public.moderation_log;
create trigger trg_moderation_log_append_only
  before update or delete on public.moderation_log
  for each row execute function public.moderation_log_append_only();

-- ── 4. CONTEXTE POUR L'ADMIN ────────────────────────────────────────────────
-- Messages : lecture ouverte a l'admin UNIQUEMENT pour les reservations qui ont au
-- moins un signalement. Les conversations non signalees restent privees.
-- (Si la policy messages_select de production contient deja `or is_admin()`, comme
--  dans rls_policies.sql, celle-ci est redondante mais sans effet : a verifier, et
--  a retirer du premier cas pour tenir la promesse de confidentialite.)
drop policy if exists messages_select_reported_admin on public.messages;
create policy messages_select_reported_admin on public.messages
  for select to authenticated
  using (
    public.is_admin()
    and exists (select 1 from public.reports r where r.booking_id = messages.booking_id)
  );

-- Reservations : lecture admin (le panneau admin les liste deja). Absente dans l'etat
-- reel du 2026-11-01 (policy limitee client/artisan).
drop policy if exists bookings_select_admin on public.bookings;
create policy bookings_select_admin on public.bookings
  for select to authenticated using (public.is_admin());

-- ── 5. SUSPENSION ───────────────────────────────────────────────────────────
-- 5a. profiles_update (auth.uid() = id) laissait l'utilisateur modifier SA colonne
--     is_active : un compte suspendu pouvait se reactiver. Garde separe de
--     guard_profile_role (non touche). Admin et cle service sont exemptes.
create or replace function public.guard_profile_active()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_client_write() and new.is_active is distinct from old.is_active then
    new.is_active := old.is_active;
  end if;
  -- Meme un admin ne peut pas suspendre un compte admin depuis l'API (evite l'auto-blocage).
  if current_user in ('authenticated', 'anon')
     and old.role::text = 'admin' and new.is_active is not distinct from false
     and old.is_active is distinct from false then
    raise exception 'admin_cannot_be_suspended' using errcode = '42501';
  end if;
  return new;
end; $$;
revoke execute on function public.guard_profile_active() from public, anon, authenticated;
drop trigger if exists trg_guard_profile_active on public.profiles;
create trigger trg_guard_profile_active
  before update on public.profiles
  for each row execute function public.guard_profile_active();

-- 5b. Compte actif ? (is_active NULL = actif, comme get_nearby_artisans : `is not false`)
create or replace function public.is_account_active(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_active from public.profiles p where p.id = uid), true) is not false;
$$;
-- anon doit pouvoir l'executer : la policy restrictive sur artisans s'applique aux visiteurs
-- non connectes (le booleen est deja deductible de profiles, lisible par tous).
revoke execute on function public.is_account_active(uuid) from public;
grant execute on function public.is_account_active(uuid) to anon, authenticated;

-- 5c. Policies RESTRICTIVES (s'ajoutent aux policies existantes par ET ; ne les remplacent pas).
-- Un compte suspendu ne peut plus creer de reservation, envoyer de message, ni modifier
-- une reservation ; on ne peut pas non plus reserver un artisan suspendu.
drop policy if exists bookings_insert_active_only on public.bookings;
create policy bookings_insert_active_only on public.bookings
  as restrictive for insert to authenticated
  with check (public.is_account_active(client_id) and public.is_account_active(artisan_id));

drop policy if exists bookings_update_active_only on public.bookings;
create policy bookings_update_active_only on public.bookings
  as restrictive for update to authenticated
  using (public.is_admin() or public.is_account_active(auth.uid()))
  with check (public.is_admin() or public.is_account_active(auth.uid()));

drop policy if exists messages_insert_active_only on public.messages;
create policy messages_insert_active_only on public.messages
  as restrictive for insert to authenticated
  with check (public.is_account_active(auth.uid()));

-- Fiche artisan suspendue : invisible (en plus de get_nearby_artisans qui filtre deja
-- is_active). L'artisan lui-meme et l'admin la voient toujours.
drop policy if exists artisans_select_active_only on public.artisans;
create policy artisans_select_active_only on public.artisans
  as restrictive for select
  using (id = auth.uid() or public.is_admin() or public.is_account_active(id));

-- ── VERIFICATIONS (lecture seule, a lancer apres) ───────────────────────────
-- select tablename, policyname, permissive, cmd from pg_policies
--  where tablename in ('reports','report_admin_notes','moderation_log')
--     or policyname in ('messages_select_reported_admin','bookings_select_admin',
--                       'bookings_insert_active_only','bookings_update_active_only',
--                       'messages_insert_active_only','artisans_select_active_only');
-- select tgname from pg_trigger where tgname in ('trg_guard_report_insert','trg_guard_report_update',
--   'trg_moderation_log_append_only','trg_guard_profile_active','trg_guard_profile_role');   -- 5 lignes
