-- ============================================================================
-- BETI : correctifs d'audit du 2026-11-11, VERSION CORRIGEE du 2026-11-15
-- ============================================================================
-- NE PAS UTILISER la version du commit 5f9ff67. Elle contenait une faute grave :
--   guard_artisan_plan y testait `current_user` dans une fonction SECURITY DEFINER.
--   Dans une telle fonction, current_user vaut le PROPRIETAIRE de la fonction
--   (postgres), jamais l'appelant : le garde etait donc toujours court-circuite et
--   n'importe quel artisan pouvait se mettre plan = 'premium' sans payer.
--   Si cette ancienne version a ete executee : executer celle-ci la remplace.
--
-- Deux constats de l'audit du 11/11 etaient FAUX pour la production (ils venaient
-- de rls_policies.sql, qui n'est pas ce qui tourne en production) :
--   * « l'admin lit tous les chats » : en production la lecture des messages est
--     deja limitee aux deux parties (SCHEMA_SNAPSHOT.md). Rien a corriger ici.
--   * « prix modifiable a tout moment » : freeze_price_after_commit le fige deja a
--     partir de in_progress. Le §2 resserre : fige des la sortie de pending.
--
-- A EXECUTER A LA MAIN dans le SQL Editor, sur l'etat de production du 2026-11-02
-- (emergency_hardening, fix_booking_status, fix_integrity, privacy_hardening,
-- fix_integrity2). N'exige ni moderation.sql ni security_hardening.sql.
-- Additif, idempotent, aucune suppression de donnees.
-- ORDRE : ce fichier AVANT de deployer le code (le panneau admin appelle le RPC §4).
--
-- Convention des gardes (celle de fix_integrity.sql, verifiee en production) :
--   fonction SANS security definer + `current_user in ('authenticated','anon')`.
--   Bride les ecritures directes de l'API ; laisse passer la cle service, le SQL
--   Editor et les fonctions security definer (RPC, autres declencheurs).
-- ============================================================================

-- ── 1. PLAN : seul un admin, la cle service ou un RPC peuvent le changer ────
-- Avant : fonction security definer qui testait seulement is_admin(). La cle service
-- n'a pas d'auth.uid() : l'API de suppression de compte ne pouvait pas remettre
-- plan = 'free' (le declencheur remettait l'ancienne valeur sans rien dire).
create or replace function public.guard_artisan_plan()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.plan := old.plan;
    new.plan_until := old.plan_until;
  end if;
  return new;
end; $$;
revoke execute on function public.guard_artisan_plan() from public, anon, authenticated;

drop trigger if exists artisans_guard_plan on public.artisans;
create trigger artisans_guard_plan
  before update on public.artisans
  for each row execute function public.guard_artisan_plan();

-- ── 2. RESERVATIONS : prix et adresse figes ─────────────────────────────────
-- Seul le client, et seulement tant que la demande est 'pending', peut encore
-- changer le prix convenu ou l'adresse. L'application ne les modifie jamais apres
-- la creation : aucun ecran n'est touche.
create or replace function public.guard_booking_fields_minimal()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin()
     and not (auth.uid() = old.client_id and old.status::text = 'pending') then
    new.price_agreed := old.price_agreed;
    new.address := old.address;
  end if;
  return new;
end; $$;
revoke execute on function public.guard_booking_fields_minimal() from public, anon, authenticated;

drop trigger if exists trg_guard_booking_fields_minimal on public.bookings;
create trigger trg_guard_booking_fields_minimal
  before update on public.bookings
  for each row execute function public.guard_booking_fields_minimal();

-- ── 3. MESSAGES : nom et role de l'expediteur pris dans profiles ────────────
-- Avant : le navigateur envoyait sender_name / sender_role ; on pouvait ecrire a
-- l'autre partie en se faisant appeler « Support BETI ».
-- security definer voulu ici : la fonction ne lit que la ligne profiles de
-- l'expediteur et n'utilise pas current_user (donc pas le piege decrit en tete).
create or replace function public.guard_message_sender()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if auth.uid() is not null then
    new.sender_id := auth.uid();
  end if;
  select full_name, role::text as role into p from public.profiles where id = new.sender_id;
  if found then
    new.sender_name := coalesce(p.full_name, '');
    new.sender_role := coalesce(p.role, 'client');
  end if;
  return new;
end; $$;
revoke execute on function public.guard_message_sender() from public, anon, authenticated;

drop trigger if exists trg_guard_message_sender on public.messages;
create trigger trg_guard_message_sender
  before insert on public.messages
  for each row execute function public.guard_message_sender();

-- ── 4. RPC approve_subscription : abonnement + plan dans la meme transaction ─
-- Avant : deux UPDATE separes depuis le navigateur de l'admin. En production la
-- regle artisans_update ne vise que « sa propre ligne » : le premier UPDATE ne
-- touchait aucune ligne, sans erreur, et l'abonnement passait « actif » sans que
-- le plan de l'artisan change.
create or replace function public.approve_subscription(p_sub_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  s record;
  v_now timestamptz := now();
  v_exp timestamptz;
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  select id, artisan_id, plan, cycle, status into s
    from public.subscriptions where id = p_sub_id for update;
  if not found then
    raise exception 'subscription_not_found' using errcode = 'P0001';
  end if;
  if s.status <> 'pending' then
    raise exception 'subscription_not_pending' using errcode = 'P0001';
  end if;
  v_exp := case when s.cycle = 'yearly' then v_now + interval '1 year' else v_now + interval '1 month' end;

  update public.artisans set plan = s.plan, plan_until = v_exp where id = s.artisan_id;
  if not found then
    raise exception 'artisan_not_found' using errcode = 'P0001';
  end if;
  update public.subscriptions
     set status = 'active', started_at = v_now, expires_at = v_exp, reviewed_at = v_now
   where id = p_sub_id;
end; $$;
revoke execute on function public.approve_subscription(uuid) from public, anon;
grant execute on function public.approve_subscription(uuid) to authenticated;

-- ============================================================================
-- VERIFICATIONS (lecture seule, apres execution)
-- select proname, prosecdef from pg_proc where proname in
--   ('guard_artisan_plan','guard_booking_fields_minimal','guard_message_sender','approve_subscription');
--   -- attendu : guard_artisan_plan = false, guard_booking_fields_minimal = false,
--   --           guard_message_sender = true, approve_subscription = true
-- select tgname from pg_trigger where tgname in
--   ('artisans_guard_plan','trg_guard_booking_fields_minimal','trg_guard_message_sender'); -- 3 lignes
--
-- Test d'attaque (un artisan tente de se mettre Premium : le plan ne doit pas changer) :
-- do $$ declare a record; p text; begin
--   select id, plan into a from public.artisans limit 1;
--   perform set_config('request.jwt.claims', json_build_object('sub', a.id, 'role','authenticated')::text, true);
--   set local role authenticated;
--   update public.artisans set plan = 'premium', plan_until = now() + interval '10 years' where id = a.id;
--   select plan into p from public.artisans where id = a.id;
--   raise exception 'RESULTAT plan=% (attendu, inchange : %)', p, a.plan;   -- l'exception annule tout
-- end $$;
-- ============================================================================
