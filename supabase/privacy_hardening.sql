-- ============================================================================
-- BETI — Durcissement vie privée : téléphone + position GPS live
-- ============================================================================
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS rls_policies.sql et
-- security_hardening.sql (utilise is_admin(), is_client_write()). Idempotent.
--
-- PROBLÈMES CORRIGÉS
--   A) profiles est lisible par tous (select using(true)) et contient `phone`.
--   B) artisans.lat/lng (position GPS live, réécrite en continu par le
--      dashboard) est lisible par tous + diffusée en realtime à tout le monde.
--
-- CHOIX DE CONCEPTION (le plus simple, le moins risqué)
--
--  A) Table privée `profile_private(id, phone)` + trigger de redirection.
--     - On NE supprime PAS la colonne profiles.phone : elle reste, mais elle est
--       toujours NULL (un trigger BEFORE INSERT/UPDATE déplace toute valeur
--       écrite dedans vers profile_private puis la met à NULL).
--       Pourquoi : un REVOKE de colonne ferait échouer tout `select('*')` sur
--       profiles (le dashboard en fait un), et un DROP COLUMN ferait échouer
--       (400) l'ancien code client qui sélectionne `phone`. Avec ce trigger
--       l'ancien code continue de fonctionner (il lit simplement NULL, et ses
--       écritures de phone atterrissent au bon endroit) : déploiement du code
--       et du SQL dans n'importe quel ordre, sans casse franche.
--     - Une vue ou une RPC par lecture aurait demandé de réécrire tous les
--       embeds PostgREST (profiles!fkey(phone)) ; ici seuls quelques écrans
--       lisent le numéro via une 2e requête (lib/phones.ts).
--     - RLS profile_private : lecture par le propriétaire, un admin, et les
--       deux parties d'une réservation (voir can_see_phone). AUCUNE policy
--       d'écriture client : seules les fonctions security definer (trigger)
--       écrivent.
--     - Unicité : RPC phone_exists(text) -> boolean (security definer), qui
--       n'expose rien d'autre. Pas d'index UNIQUE (des doublons existants
--       feraient échouer la migration).
--
--  B) Séparation « annuaire » / « position live ».
--     - artisans.lat/lng = position FIXE ARRONDIE (2 décimales, ~1 km). Un
--       trigger BEFORE INSERT/UPDATE arrondit toute écriture, y compris celle
--       de l'ancien dashboard encore déployé : plus aucune position exacte ne
--       peut être stockée dans artisans. Les lignes existantes sont arrondies
--       ici (irréversible : c'est voulu). get_nearby_artisans (définie hors
--       repo) lit artisans.lat/lng : elle ne renvoie donc plus que des
--       positions arrondies, sans qu'on ait à la redéfinir (sa signature de
--       retour n'est pas dans le repo : la remplacer risquerait de la casser).
--     - artisan_live_location(artisan_id, lat, lng, updated_at) : position
--       exacte, 1 ligne par artisan, alimentée par le dashboard. Lisible par
--       l'artisan, un admin, et le CLIENT d'une réservation confirmed ou
--       in_progress avec cet artisan. Ajoutée à supabase_realtime (le realtime
--       applique la RLS : seuls les ayants droit reçoivent les événements).
--
-- ORDRE : (1) ce fichier, (2) déploiement du code. L'inverse est toléré (voir
-- rapport) mais le suivi live est dégradé tant que le SQL n'est pas passé.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- A) TÉLÉPHONE
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.profile_private (
  id    uuid primary key references public.profiles(id) on delete cascade,
  phone text
);
create index if not exists profile_private_phone_idx on public.profile_private (phone);

alter table public.profile_private enable row level security;
revoke all on public.profile_private from anon;
revoke insert, update, delete on public.profile_private from authenticated;
grant select on public.profile_private to authenticated;

-- Qui peut lire le téléphone de `target` ?
--   soi-même, un admin ; l'ARTISAN d'une réservation voit le client (tant que la
--   demande n'est ni annulée ni refusée) ; le CLIENT voit l'artisan une fois la
--   réservation acceptée (confirmed / in_progress / completed) — un client ne
--   peut donc pas moissonner les numéros en créant des demandes pending.
create or replace function public.can_see_phone(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    target = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.bookings b
      where (b.artisan_id = auth.uid() and b.client_id = target
             and b.status::text in ('pending', 'confirmed', 'in_progress', 'completed'))
         or (b.client_id = auth.uid() and b.artisan_id = target
             and b.status::text in ('confirmed', 'in_progress', 'completed'))
    )
  );
$$;

drop policy if exists profile_private_select on public.profile_private;
create policy profile_private_select on public.profile_private
  for select using (public.can_see_phone(id));

-- Migration des données existantes (idempotent : ré-exécutable).
insert into public.profile_private (id, phone)
select id, phone from public.profiles where phone is not null
on conflict (id) do update set phone = excluded.phone;

-- Tout écrit dans profiles.phone est redirigé vers profile_private, puis effacé.
-- (UPDATE sans changement de phone : new.phone vaut déjà NULL -> on ne touche à rien.)
create or replace function public.redirect_profile_phone()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.phone is not null then
    insert into public.profile_private (id, phone) values (new.id, new.phone)
    on conflict (id) do update set phone = excluded.phone;
    new.phone := null;
  end if;
  return new;
end; $$;

drop trigger if exists trg_redirect_profile_phone on public.profiles;
create trigger trg_redirect_profile_phone
  before insert or update on public.profiles
  for each row execute function public.redirect_profile_phone();

-- Efface les téléphones encore présents dans profiles (la copie est faite plus haut).
update public.profiles set phone = null where phone is not null;

-- Backfill : profils sans ligne privée mais dont le compte auth a un numéro
-- (metadata d'inscription) — ne remplace jamais une valeur existante.
insert into public.profile_private (id, phone)
select u.id, u.raw_user_meta_data->>'phone'
from auth.users u
join public.profiles p on p.id = u.id
left join public.profile_private pp on pp.id = u.id
where pp.id is null and nullif(u.raw_user_meta_data->>'phone', '') is not null
on conflict (id) do nothing;

-- Création auto du profil : même logique de rôle que security_hardening.sql,
-- mais le téléphone va directement dans la table privée.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    (case when new.raw_user_meta_data->>'role' in ('client', 'artisan')
          then new.raw_user_meta_data->>'role' else 'client' end)::public.user_role
  )
  on conflict (id) do nothing;

  if nullif(new.raw_user_meta_data->>'phone', '') is not null then
    insert into public.profile_private (id, phone)
    values (new.id, new.raw_user_meta_data->>'phone')
    on conflict (id) do nothing;
  end if;
  return new;
end; $$;

-- Unicité du numéro : ne renvoie qu'un booléen. Le compte courant (s'il est
-- connecté) est ignoré, ce qui sert à la page profil (« un autre compte
-- utilise-t-il ce numéro ? »). Appelable avant connexion (inscription).
create or replace function public.phone_exists(p_phone text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profile_private
    where phone = p_phone
      and id is distinct from auth.uid()
  );
$$;
revoke all on function public.phone_exists(text) from public;
grant execute on function public.phone_exists(text) to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- B) POSITION GPS
-- ════════════════════════════════════════════════════════════════════════════

-- 1. artisans.lat/lng : toujours arrondi à ~1 km (2 décimales), quel que soit l'écrivain.
create or replace function public.round_artisan_location()
returns trigger language plpgsql as $$
begin
  if new.lat is not null then new.lat := round(new.lat::numeric, 2); end if;
  if new.lng is not null then new.lng := round(new.lng::numeric, 2); end if;
  return new;
end; $$;

drop trigger if exists trg_round_artisan_location on public.artisans;
create trigger trg_round_artisan_location
  before insert or update on public.artisans
  for each row execute function public.round_artisan_location();

-- Arrondit l'existant (déclenche le trigger ci-dessus).
update public.artisans
   set lat = lat, lng = lng
 where lat is not null or lng is not null;

-- 2. Position exacte live.
create table if not exists public.artisan_live_location (
  artisan_id uuid primary key references public.profiles(id) on delete cascade,
  lat        double precision not null,
  lng        double precision not null,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_live_location()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists trg_touch_live_location on public.artisan_live_location;
create trigger trg_touch_live_location
  before insert or update on public.artisan_live_location
  for each row execute function public.touch_live_location();

-- Qui peut voir la position exacte de `a_id` : lui-même, un admin, le client
-- d'une réservation confirmed / in_progress avec cet artisan.
create or replace function public.can_see_live_location(a_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    a_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.artisan_id = a_id and b.client_id = auth.uid()
        and b.status::text in ('confirmed', 'in_progress')
    )
  );
$$;

alter table public.artisan_live_location enable row level security;
revoke all on public.artisan_live_location from anon;
grant select, insert, update, delete on public.artisan_live_location to authenticated;

drop policy if exists live_location_select on public.artisan_live_location;
create policy live_location_select on public.artisan_live_location
  for select using (public.can_see_live_location(artisan_id));

drop policy if exists live_location_insert on public.artisan_live_location;
create policy live_location_insert on public.artisan_live_location
  for insert with check (artisan_id = auth.uid());

drop policy if exists live_location_update on public.artisan_live_location;
create policy live_location_update on public.artisan_live_location
  for update using (artisan_id = auth.uid()) with check (artisan_id = auth.uid());

drop policy if exists live_location_delete on public.artisan_live_location;
create policy live_location_delete on public.artisan_live_location
  for delete using (artisan_id = auth.uid());

-- Realtime : diffuse la table (la RLS filtre les destinataires).
do $$
begin
  alter publication supabase_realtime add table public.artisan_live_location;
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- VÉRIFICATIONS (à lancer à la main)
--   -- 1. plus aucun téléphone dans profiles : doit renvoyer 0
--   select count(*) from public.profiles where phone is not null;
--   -- 2. positions artisans arrondies : doit renvoyer 0
--   select count(*) from public.artisans where lat is not null
--     and (lat <> round(lat::numeric, 2) or lng <> round(lng::numeric, 2));
--   -- 3. get_nearby_artisans ne doit pas relire une position exacte ailleurs :
--   --    select pg_get_functiondef('public.get_nearby_artisans'::regproc);
--   --    (doit lire artisans.lat/lng, pas artisan_live_location ; et si elle
--   --    sélectionne p.phone elle renverra simplement NULL).
--   -- 4. en tant qu'utilisateur anon (SET ROLE anon) :
--   --    select * from public.profile_private;          -- 0 ligne / refusé
--   --    select * from public.artisan_live_location;    -- refusé
--   --    select public.phone_exists('+213555000000');   -- booléen seulement
-- ============================================================================
