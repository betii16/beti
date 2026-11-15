-- Imite ce que Supabase fournit AVANT nos migrations : rôles de l'API, schéma auth,
-- stockage, publication temps réel. Sert uniquement aux tests (tests/db), jamais
-- en production.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

grant usage on schema public to anon, authenticated, service_role;

-- Comme Supabase : tout objet créé dans public est d'office ouvert à l'API. Nos
-- migrations doivent donc retirer ces droits elles-mêmes ; les tests le vérifient.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  phone              text,
  phone_confirmed_at timestamptz,
  raw_user_meta_data jsonb,
  created_at         timestamptz not null default now()
);

create function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;

create function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
$$;

create schema storage;
grant usage on schema storage to anon, authenticated, service_role;

create table storage.buckets (
  id                 text primary key,
  name               text,
  public             boolean,
  file_size_limit    bigint,
  allowed_mime_types text[]
);

create table storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id),
  name       text,
  owner_id   text,
  created_at timestamptz not null default now()
);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.objects to anon;

create publication supabase_realtime;
