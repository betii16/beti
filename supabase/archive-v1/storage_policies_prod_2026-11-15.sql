-- Règles de storage.objects lues en production le 2026-11-15, juste avant la
-- bascule vers la v2 (qui les supprime toutes). Gardées ici pour mémoire et pour
-- un éventuel retour arrière. NE PAS EXÉCUTER tel quel : plusieurs sont trop
-- larges (listage public, dépôt par tout utilisateur connecté).
--
-- Espaces existants à cette date, tous publics :
--   avatars (5 Mo, 0 fichier), beti-photos (5 Mo, 6 fichiers),
--   intervention-photos (10 Mo, 0 fichier), portfolio (10 Mo, 0 fichier).

create policy avatars_insert on storage.objects for insert to public
  with check ((bucket_id = 'avatars') and ((auth.uid())::text = (storage.foldername(name))[1]));
create policy avatars_select on storage.objects for select to public
  using (bucket_id = 'avatars');
create policy avatars_update on storage.objects for update to public
  using ((bucket_id = 'avatars') and ((auth.uid())::text = (storage.foldername(name))[1]));

create policy "beti-photos delete own" on storage.objects for delete to authenticated
  using ((bucket_id = 'beti-photos') and (owner_id = (auth.uid())::text));
create policy "beti-photos insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'beti-photos');
create policy "beti-photos read own" on storage.objects for select to authenticated
  using ((bucket_id = 'beti-photos') and (owner_id = (auth.uid())::text));
create policy "beti-photos update own" on storage.objects for update to authenticated
  using ((bucket_id = 'beti-photos') and (owner_id = (auth.uid())::text))
  with check ((bucket_id = 'beti-photos') and (owner_id = (auth.uid())::text));

create policy intervention_insert on storage.objects for insert to public
  with check ((bucket_id = 'intervention-photos') and (auth.role() = 'authenticated'));
create policy intervention_select on storage.objects for select to public
  using (bucket_id = 'intervention-photos');

create policy portfolio_delete on storage.objects for delete to public
  using ((bucket_id = 'portfolio') and ((auth.uid())::text = (storage.foldername(name))[1]));
create policy portfolio_insert on storage.objects for insert to public
  with check ((bucket_id = 'portfolio') and ((auth.uid())::text = (storage.foldername(name))[1]));
create policy portfolio_select on storage.objects for select to public
  using (bucket_id = 'portfolio');
