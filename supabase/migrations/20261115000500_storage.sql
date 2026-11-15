-- ============================================================================
-- BETI v2 : stockage des photos (bucket « media »)
-- ============================================================================
-- Bucket public : une photo se lit par son adresse, mais personne ne peut lister
-- le contenu. Écriture limitée à ses propres dossiers, 5 Mo, images seulement.
--   avatars/{uid}/…       photo de profil
--   portfolio/{uid}/…     réalisations et couverture de la fiche
--   reviews/{demande}/…   photos d'un avis, par le client d'une demande close
-- Aucune règle UPDATE : on n'écrase pas un fichier, on en envoie un nouveau.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists media_insert on storage.objects;
create policy media_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (
      name ~ ('^avatars/' || (select auth.uid())::text || '/[A-Za-z0-9._-]{1,80}$')
      or name ~ ('^portfolio/' || (select auth.uid())::text || '/[A-Za-z0-9._-]{1,80}$')
      or (
        name ~ '^reviews/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9._-]{1,80}$'
        and exists (
          select 1 from public.bookings b
          where b.id::text = split_part(name, '/', 2)
            and b.client_id = (select auth.uid())
            and b.status = 'completed'
        )
      )
    )
  );

drop policy if exists media_select_own on storage.objects;
create policy media_select_own on storage.objects for select to authenticated
  using (bucket_id = 'media' and owner_id = (select auth.uid())::text);

drop policy if exists media_delete_own on storage.objects;
create policy media_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'media' and owner_id = (select auth.uid())::text);
