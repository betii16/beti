-- ============================================================================
-- BETI — Policies Storage pour le bucket `beti-photos`
-- ============================================================================
-- À exécuter dans Supabase > SQL Editor (comme rls_policies.sql).
--
-- SYMPTÔME CORRIGÉ : les photos de profil (et portfolio/problèmes/avant-après)
-- ne s'enregistrent pas — l'upload échoue avec "new row violates row-level
-- security policy" car aucune policy n'autorise l'écriture dans le bucket.
--
-- Chemins utilisés par le code (PhotoUpload.tsx + ReviewPhotos.tsx) :
--   avatars/{userId}/profile.{ext}          ← photo de profil (ArtisanAvatar)
--   review-photos/{bookingId}/{ts}-{rand}.{ext}
--   avatars/{userId}_{ts}.{ext}
--   problems/{bookingId}/{ts}_{rand}.{ext}
--   portfolio/{artisanId}/{ts}_{filename}
--   interventions/{bookingId}/{before|after}_{ts}.{ext}
-- ============================================================================

-- Lecture publique : les URLs publiques (getPublicUrl) doivent fonctionner
update storage.buckets set public = true where id = 'beti-photos';

drop policy if exists "beti-photos read" on storage.objects;
create policy "beti-photos read" on storage.objects
  for select using (bucket_id = 'beti-photos');

-- Écriture : utilisateurs connectés uniquement
drop policy if exists "beti-photos insert" on storage.objects;
create policy "beti-photos insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'beti-photos');

drop policy if exists "beti-photos update" on storage.objects;
create policy "beti-photos update" on storage.objects
  for update to authenticated
  using (bucket_id = 'beti-photos');

drop policy if exists "beti-photos delete" on storage.objects;
create policy "beti-photos delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'beti-photos');

-- Durcissement possible plus tard : restreindre l'INSERT par préfixe, ex.
--   with check (bucket_id = 'beti-photos'
--               and (storage.foldername(name))[1] != 'avatars'
--                or name like 'avatars/' || auth.uid() || '_%')
-- pour empêcher un utilisateur d'écraser l'avatar d'un autre.

-- Vérification : après exécution, relancer `node scripts/diag-storage.mjs`
-- → le test 2 (upload anonyme) doit toujours ÉCHOUER (c'est voulu),
--   mais l'upload depuis l'app (utilisateur connecté) fonctionnera.
