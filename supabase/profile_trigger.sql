-- ============================================================================
-- BETI — Création automatique du profil à l'inscription (+ backfill)
-- ============================================================================
-- À exécuter UNE FOIS dans Supabase > SQL Editor. Idempotent.
--
-- POURQUOI : aujourd'hui le profil est créé côté client dans signup, en
--   « best-effort » (try/catch silencieux). Si cet upsert échoue (timeout, RLS,
--   ou client Supabase en mode stub quand l'env manque), le compte auth existe
--   mais SANS ligne `profiles`. Résultat : tout insert qui référence
--   profiles(id) casse — d'où `bookings_client_id_fkey violates...`.
--
-- Ce trigger garantit qu'un profil est TOUJOURS créé côté serveur, quoi qu'il
-- arrive côté navigateur. Le backfill répare les comptes déjà cassés.
-- ============================================================================

-- ── Trigger : profil auto à la création d'un utilisateur auth ───────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'role', 'client')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Backfill : crée le profil manquant des comptes existants ────────────────
-- (répare immédiatement les utilisateurs qui n'ont pas de ligne `profiles`,
--  dont ton compte de test bloqué sur le booking)
insert into public.profiles (id, full_name, phone, role)
select u.id,
       coalesce(u.raw_user_meta_data->>'full_name', ''),
       u.raw_user_meta_data->>'phone',
       coalesce(u.raw_user_meta_data->>'role', 'client')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- ── VÉRIFICATION : doit renvoyer 0 ──────────────────────────────────────────
-- select count(*) as comptes_sans_profil
--   from auth.users u left join public.profiles p on p.id = u.id
--   where p.id is null;
