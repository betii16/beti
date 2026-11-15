-- ============================================================================
-- BETI v2 : tables
-- ============================================================================
-- Principe de toute la v2 : l'API (rôles anon / authenticated) LIT les tables à
-- travers les règles RLS, et n'ÉCRIT jamais dedans. Toute écriture passe par une
-- fonction (migrations 300 et 400). Aucun garde par déclencheur à maintenir.
-- Les données privées (téléphone, adresse, position exacte) vivent dans des
-- tables à part, avec leurs propres règles.
-- ============================================================================

create schema if not exists private;

-- ── Référentiels ────────────────────────────────────────────────────────────
create table public.categories (
  slug      text primary key check (slug ~ '^[a-z][a-z0-9_]{1,30}$'),
  sort      smallint not null default 0,
  is_urgent boolean not null default false,   -- dépannage urgent, mis en avant
  is_active boolean not null default true
);

create table public.plans (
  id                  text primary key check (id in ('basic', 'premium')),
  monthly             integer not null check (monthly > 0),   -- DA
  yearly              integer not null check (yearly > 0),    -- DA
  max_portfolio_posts integer check (max_portfolio_posts is null or max_portfolio_posts > 0)  -- null = illimité
);

-- Une seule ligne : réglages modifiables par un admin.
create table public.app_config (
  id                boolean primary key default true check (id),
  launch_free_until timestamptz   -- jusqu'à cette date, tous les artisans publiés sont visibles
);

-- ── Comptes ─────────────────────────────────────────────────────────────────
-- Fiche privée du compte. Jamais lisible publiquement : la vitrine publique d'un
-- artisan est la table artisans.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'client' check (role in ('client', 'artisan')),
  full_name   text not null default '' check (char_length(full_name) <= 80),
  avatar_path text,
  wilaya_code smallint check (wilaya_code between 1 and 58),
  commune     text check (commune is null or char_length(commune) <= 80),
  lang        text not null default 'fr' check (lang in ('fr', 'ar')),
  is_active   boolean not null default true,   -- false = compte suspendu
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_avatar_own check (
    avatar_path is null or avatar_path ~ ('^avatars/' || id::text || '/[A-Za-z0-9._-]{1,80}$')
  )
);

create table public.user_contacts (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  phone          text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  phone_verified boolean not null default false   -- vrai seulement si confirmé par code (auth)
);

-- Équipe BETI. Hors du schéma public : aucune route de l'API ne peut la lire ni
-- l'écrire. Le premier admin est ajouté à la main dans le SQL Editor.
create table private.staff (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'admin' check (role in ('admin', 'moderator')),
  created_at timestamptz not null default now()
);

-- ── Vitrine publique des artisans ───────────────────────────────────────────
create table public.artisans (
  id             uuid primary key references public.profiles (id) on delete cascade,
  display_name   text not null check (char_length(display_name) between 2 and 60),
  category       text not null references public.categories (slug),
  skills         text[] not null default '{}' check (cardinality(skills) <= 12),
  bio            text not null default '' check (char_length(bio) <= 1000),
  hourly_rate    integer check (hourly_rate is null or hourly_rate between 0 and 1000000),  -- DA, indicatif
  wilaya_code    smallint not null check (wilaya_code between 1 and 58),
  commune        text not null default '' check (char_length(commune) <= 80),
  -- Position publique : le type numeric(x,2) arrondit à ~1 km à l'écriture.
  lat            numeric(4, 2) check (lat between 18 and 38),
  lng            numeric(5, 2) check (lng between -9 and 12.5),
  radius_km      smallint not null default 15 check (radius_km between 1 and 200),
  avatar_path    text,
  cover_path     text,
  is_available   boolean not null default false,
  published      boolean not null default false,   -- l'artisan a publié sa fiche
  suspended      boolean not null default false,   -- copie de profiles.is_active = false
  phone_verified boolean not null default false,   -- copie de user_contacts.phone_verified
  verified_at    timestamptz,                      -- identité contrôlée par l'équipe
  plan           text not null default 'free' check (plan in ('free', 'basic', 'premium')),
  plan_until     timestamptz,
  rating_avg     numeric(3, 2) not null default 0,
  rating_count   integer not null default 0,
  jobs_done      integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint artisans_avatar_own check (
    avatar_path is null or avatar_path ~ ('^avatars/' || id::text || '/[A-Za-z0-9._-]{1,80}$')
  ),
  constraint artisans_cover_own check (
    cover_path is null or cover_path ~ ('^portfolio/' || id::text || '/[A-Za-z0-9._-]{1,80}$')
  )
);
create index artisans_search_idx on public.artisans (category, wilaya_code) where published and not suspended;
create index artisans_skills_idx on public.artisans using gin (skills);

create table public.portfolio_posts (
  id         uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  caption    text not null default '' check (char_length(caption) <= 500),
  photos     text[] not null check (cardinality(photos) between 1 and 6),
  created_at timestamptz not null default now()
);
create index portfolio_posts_artisan_idx on public.portfolio_posts (artisan_id, created_at desc);

-- Position exacte, partagée seulement pendant un trajet vers un client.
create table public.artisan_live_location (
  artisan_id uuid primary key references public.artisans (id) on delete cascade,
  lat        double precision not null check (lat between -90 and 90),
  lng        double precision not null check (lng between -180 and 180),
  updated_at timestamptz not null default now()
);

-- ── Demandes (réservations) ─────────────────────────────────────────────────
-- pending → accepted | declined (artisan) | cancelled (client)
-- accepted → finished (artisan) | cancelled (l'un ou l'autre)
-- finished → completed (client), ce qui ouvre le droit de laisser un avis
create table public.bookings (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid references public.profiles (id) on delete set null,
  artisan_id       uuid references public.artisans (id) on delete set null,
  category         text not null references public.categories (slug),
  description      text not null check (char_length(description) between 10 and 2000),
  wilaya_code      smallint not null check (wilaya_code between 1 and 58),
  commune          text not null default '' check (char_length(commune) <= 80),
  scheduled_for    timestamptz,
  is_urgent        boolean not null default false,
  status           text not null default 'pending'
                     check (status in ('pending', 'accepted', 'declined', 'cancelled', 'finished', 'completed')),
  quoted_price     integer check (quoted_price is null or quoted_price between 0 and 100000000),  -- DA
  sharing_location boolean not null default false,
  cancelled_by     uuid,
  cancel_reason    text check (cancel_reason is null or char_length(cancel_reason) <= 300),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  accepted_at      timestamptz,
  finished_at      timestamptz,
  completed_at     timestamptz
);
create index bookings_client_idx on public.bookings (client_id, created_at desc);
create index bookings_artisan_idx on public.bookings (artisan_id, status, created_at desc);
-- Une seule demande ouverte par couple client / artisan : c'est aussi leur conversation.
create unique index bookings_one_open_per_pair
  on public.bookings (client_id, artisan_id) where status in ('pending', 'accepted', 'finished');

-- Adresse du client : l'artisan ne la voit qu'après avoir accepté.
create table public.booking_private (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  address    text not null default '' check (char_length(address) <= 300)
);

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  sender_id  uuid references public.profiles (id) on delete set null,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index messages_booking_idx on public.messages (booking_id, created_at);

create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null unique references public.bookings (id) on delete cascade,
  artisan_id  uuid not null references public.artisans (id) on delete cascade,
  client_id   uuid references public.profiles (id) on delete set null,
  author_name text not null check (char_length(author_name) between 1 and 40),  -- « Karim B. », figé à la publication
  rating      smallint not null check (rating between 1 and 5),
  comment     text not null default '' check (char_length(comment) <= 1000),
  photos      text[] not null default '{}' check (cardinality(photos) <= 4),
  reply       text check (reply is null or char_length(reply) <= 1000),
  replied_at  timestamptz,
  is_visible  boolean not null default true,   -- false = masqué par la modération
  created_at  timestamptz not null default now()
);
create index reviews_artisan_idx on public.reviews (artisan_id, created_at desc);

-- Le texte est construit par l'application (français ou arabe) à partir de type + data.
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null check (type in (
               'booking_new', 'booking_accepted', 'booking_declined', 'booking_cancelled',
               'booking_finished', 'booking_completed', 'message_new', 'review_new', 'review_reply',
               'subscription_active', 'subscription_rejected', 'account_suspended', 'account_restored')),
  booking_id uuid references public.bookings (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ── Abonnements des artisans (registre) ─────────────────────────────────────
-- Le plan effectif est sur artisans.plan / plan_until. Le montant est calculé par
-- le serveur à partir de la table plans, jamais envoyé par le navigateur.
create table public.subscriptions (
  id             uuid primary key default gen_random_uuid(),
  artisan_id     uuid references public.artisans (id) on delete set null,   -- le registre survit au compte
  artisan_label  text not null check (char_length(artisan_label) between 1 and 60),
  plan           text not null references public.plans (id),
  cycle          text not null check (cycle in ('monthly', 'yearly')),
  amount         integer not null check (amount > 0),
  status         text not null default 'pending'
                   check (status in ('pending', 'active', 'rejected', 'expired', 'cancelled')),
  payment_method text not null default 'transfer' check (payment_method in ('transfer', 'ccp', 'baridimob', 'cash')),
  payment_ref    text check (payment_ref is null or char_length(payment_ref) <= 80),
  note           text check (note is null or char_length(note) <= 500),
  started_at     timestamptz,
  expires_at     timestamptz,
  reviewed_by    uuid,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index subscriptions_status_idx on public.subscriptions (status, created_at desc);
create unique index subscriptions_one_pending on public.subscriptions (artisan_id) where status = 'pending';

-- ── Modération ──────────────────────────────────────────────────────────────
-- Pas de clé étrangère sur reported_user_id / target_id / booking_id : la preuve
-- doit survivre à la suppression du compte ou de la demande.
create table public.reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid references public.profiles (id) on delete set null,
  reported_user_id uuid not null,
  target_type      text not null check (target_type in ('artisan', 'client', 'booking', 'review', 'message')),
  target_id        uuid not null,
  booking_id       uuid,
  reason           text not null check (reason in (
                     'fraude', 'comportement', 'travail_non_fait', 'prix_different', 'faux_profil', 'harcelement', 'autre')),
  details          text check (details is null or char_length(details) <= 2000),
  status           text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'rejected')),
  resolution       text not null default 'none' check (resolution in ('none', 'warning', 'suspension', 'cash_dispute', 'other')),
  handled_by       uuid,
  handled_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint reports_autre_needs_details check (reason <> 'autre' or char_length(btrim(coalesce(details, ''))) >= 10),
  constraint reports_not_self check (reporter_id is null or reporter_id <> reported_user_id),
  constraint reports_booking_ctx check (target_type not in ('booking', 'message') or booking_id is not null)
);
create index reports_status_idx on public.reports (status, created_at desc);
create index reports_reported_idx on public.reports (reported_user_id);
create index reports_booking_idx on public.reports (booking_id) where booking_id is not null;
create unique index reports_one_active_per_target
  on public.reports (reporter_id, target_type, target_id) where status in ('open', 'in_review');

-- Note interne des modérateurs : table à part, pour que l'auteur du signalement,
-- qui lit sa propre ligne dans reports, ne la voie jamais.
create table public.report_notes (
  report_id  uuid primary key references public.reports (id) on delete cascade,
  note       text not null default '' check (char_length(note) <= 4000),
  updated_by uuid,
  updated_at timestamptz not null default now()
);

-- Journal des actions de l'équipe, en ajout seul.
create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid not null,
  action     text not null check (char_length(action) between 1 and 60),
  target     text,                                  -- ex. « user:<uuid> », « report:<uuid> »
  details    jsonb not null default '{}'::jsonb,    -- jamais de donnée personnelle
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
