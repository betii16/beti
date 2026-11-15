-- ============================================================================
-- BETI : bascule v1 → v2, étape 1 sur 3. Archive l'ancien schéma.
-- ============================================================================
-- À exécuter UNE FOIS sur le projet Supabase existant, AVANT les migrations v2.
-- Rien n'est supprimé : les tables de la v1 et leurs données sont déplacées dans
-- le schéma v1_archive, inaccessible à l'API. Retour arrière : les redéplacer
-- (alter table v1_archive.x set schema public).
-- Après cette étape, l'ancien site ne fonctionne plus.
-- Une seule transaction : en cas d'erreur, rien n'est changé.
-- ============================================================================
begin;

create schema if not exists v1_archive;
revoke all on schema v1_archive from public, anon, authenticated;

-- L'ancien déclencheur d'inscription écrirait dans une table déplacée.
drop trigger if exists on_auth_user_created on auth.users;

do $$
declare r record;
begin
  -- Tables : leurs index, règles RLS et déclencheurs suivent. Les objets d'une
  -- extension (PostGIS : spatial_ref_sys) restent en place.
  for r in
    select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
  loop
    if exists (select 1 from pg_publication_tables p
                where p.pubname = 'supabase_realtime' and p.schemaname = 'public' and p.tablename = r.relname) then
      execute format('alter publication supabase_realtime drop table public.%I', r.relname);
    end if;
    execute format('alter table public.%I set schema v1_archive', r.relname);
  end loop;

  -- L'archive doit être inerte : on coupe ses liens vers auth.users, pour qu'une
  -- suppression de compte en v2 ne la modifie pas et ne soit pas bloquée par elle.
  for r in
    select con.conname, c.relname
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'v1_archive' and con.contype = 'f'
       and con.confrelid in (select x.oid from pg_class x where x.relnamespace = 'auth'::regnamespace)
  loop
    execute format('alter table v1_archive.%I drop constraint %I', r.relname, r.conname);
  end loop;

  -- Fonctions de la v1 : déplacées elles aussi, donc plus appelables par l'API.
  for r in
    select p.oid::regprocedure as sig, p.prokind
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('alter %s %s set schema v1_archive',
                   case r.prokind when 'p' then 'procedure' when 'a' then 'aggregate' else 'function' end, r.sig);
  end loop;

  -- Types énumérés de la v1 (user_role, booking_status…).
  for r in
    select t.typname
      from pg_type t join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public' and t.typtype = 'e'
       and not exists (select 1 from pg_depend d where d.objid = t.oid and d.deptype = 'e')
  loop
    execute format('alter type public.%I set schema v1_archive', r.typname);
  end loop;

  -- Anciens espaces de stockage (avatars, portfolio, intervention-photos,
  -- beti-photos) : on retire toutes leurs règles. Certaines laissaient n'importe
  -- quel visiteur lister les fichiers, d'autres tout utilisateur connecté en
  -- déposer. Les photos déjà envoyées restent lisibles par leur adresse (espaces
  -- publics) ; plus personne ne peut en lister ni en ajouter. Définitions d'origine :
  -- archive-v1/storage_policies_prod_2026-11-15.sql. La v2 crée ensuite les siennes.
  for r in
    select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;

commit;

-- Contrôle : doit ne renvoyer que les objets de PostGIS (spatial_ref_sys).
-- select c.relname, c.relkind from pg_class c join pg_namespace n on n.oid = c.relnamespace
--  where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'S');
