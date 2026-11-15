-- ============================================================================
-- BETI v2 : fonctions de l'équipe, suppression de compte, droits d'exécution
-- ============================================================================
-- Chaque fonction admin_* commence par private.require_staff() et écrit une ligne
-- dans audit_log. Aucune route de l'API ne permet de devenir membre de l'équipe :
-- on ajoute une ligne à private.staff à la main, dans le SQL Editor.
-- ============================================================================

create function private.set_user_active(p_user_id uuid, p_active boolean, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from private.staff s where s.user_id = p_user_id) then
    raise exception 'cannot_suspend_staff';
  end if;
  update public.profiles set is_active = p_active where id = p_user_id;
  if not found then
    raise exception 'not_found';
  end if;
  update public.artisans
     set suspended = not p_active,
         is_available = case when p_active then is_available else false end
   where id = p_user_id;
  perform private.notify(p_user_id, case when p_active then 'account_restored' else 'account_suspended' end);
  perform private.audit(
    case when p_active then 'user.restore' else 'user.suspend' end,
    'user:' || p_user_id::text,
    jsonb_build_object('reason', left(coalesce(p_reason, ''), 300))
  );
end $$;

create function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_staff();
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'users_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'users_suspended', (select count(*) from public.profiles where not is_active),
    'artisans', (select count(*) from public.artisans),
    'artisans_published', (select count(*) from public.artisans where published and not suspended),
    'artisans_subscribed', (select count(*) from public.artisans where plan <> 'free' and plan_until > now()),
    'bookings', (select count(*) from public.bookings),
    'bookings_7d', (select count(*) from public.bookings where created_at > now() - interval '7 days'),
    'bookings_by_status', (select coalesce(jsonb_object_agg(s.status, s.n), '{}'::jsonb)
                           from (select status, count(*) as n from public.bookings group by status) s),
    'reviews', (select count(*) from public.reviews),
    'subscriptions_pending', (select count(*) from public.subscriptions where status = 'pending'),
    'subscriptions_month_amount', (select coalesce(sum(amount), 0) from public.subscriptions
                                   where status = 'active' and reviewed_at >= date_trunc('month', now())),
    'reports_open', (select count(*) from public.reports where status in ('open', 'in_review')),
    'launch_free_until', (select launch_free_until from public.app_config),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'day', to_char(d, 'YYYY-MM-DD'),
               'signups', (select count(*) from public.profiles p
                           where p.created_at >= d and p.created_at < d + interval '1 day'),
               'bookings', (select count(*) from public.bookings b
                            where b.created_at >= d and b.created_at < d + interval '1 day')
             ) order by d), '[]'::jsonb)
      from generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') as d
    )
  );
end $$;

create function public.admin_set_user_active(p_user_id uuid, p_active boolean, p_reason text default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_staff();
  if p_user_id is null or p_active is null then
    raise exception 'invalid_input';
  end if;
  perform private.set_user_active(p_user_id, p_active, p_reason);
end $$;

-- Dépublier une fiche ou poser / retirer la mention « identité contrôlée ».
create function public.admin_set_listing(
  p_artisan_id uuid,
  p_published  boolean default null,
  p_verified   boolean default null,
  p_reason     text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_staff();
  update public.artisans set
    published   = coalesce(p_published, published),
    verified_at = case when p_verified is null then verified_at
                       when p_verified then coalesce(verified_at, now())
                       else null end
  where id = p_artisan_id;
  if not found then
    raise exception 'not_found';
  end if;
  perform private.audit('listing.update', 'artisan:' || p_artisan_id::text,
    jsonb_build_object('published', p_published, 'verified', p_verified,
                       'reason', left(coalesce(p_reason, ''), 300)));
end $$;

-- Valider ou refuser une demande d'abonnement. La validation met à jour le plan
-- de l'artisan et le registre dans la même transaction ; un renouvellement du
-- même plan prolonge la date en cours au lieu de la raccourcir.
create function public.admin_review_subscription(p_subscription_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_staff uuid := private.require_staff();
  v_note  text := nullif(left(btrim(coalesce(p_note, '')), 500), '');
  s       public.subscriptions;
  a       public.artisans;
  v_from  timestamptz;
  v_until timestamptz;
begin
  select * into s from public.subscriptions where id = p_subscription_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if s.status <> 'pending' then
    raise exception 'invalid_transition';
  end if;

  if coalesce(p_approve, false) then
    select * into a from public.artisans where id = s.artisan_id for update;
    if not found then
      raise exception 'not_found';
    end if;
    v_from := case when a.plan = s.plan and a.plan_until is not null and a.plan_until > now()
                   then a.plan_until else now() end;
    v_until := v_from + case s.cycle when 'yearly' then interval '1 year' else interval '1 month' end;
    update public.artisans set plan = s.plan, plan_until = v_until where id = a.id;
    update public.subscriptions
       set status = 'active', started_at = v_from, expires_at = v_until,
           reviewed_by = v_staff, reviewed_at = now(), note = v_note
     where id = s.id;
    perform private.notify(a.id, 'subscription_active', null,
      jsonb_build_object('plan', s.plan, 'until', v_until));
    perform private.audit('subscription.approve', 'subscription:' || s.id::text,
      jsonb_build_object('plan', s.plan, 'cycle', s.cycle, 'amount', s.amount));
  else
    update public.subscriptions
       set status = 'rejected', reviewed_by = v_staff, reviewed_at = now(), note = v_note
     where id = s.id;
    perform private.notify(s.artisan_id, 'subscription_rejected', null, jsonb_build_object('plan', s.plan));
    perform private.audit('subscription.reject', 'subscription:' || s.id::text,
      jsonb_build_object('plan', s.plan, 'cycle', s.cycle, 'amount', s.amount));
  end if;
end $$;

-- Débloquer une demande restée ouverte : la clore ou l'annuler à la place des parties.
create function public.admin_set_booking_status(p_booking_id uuid, p_status text, p_reason text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_staff uuid := private.require_staff();
  b       public.bookings;
begin
  if p_status is null or p_status not in ('cancelled', 'completed') then
    raise exception 'invalid_status';
  end if;
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if b.status not in ('pending', 'accepted', 'finished') then
    raise exception 'invalid_transition';
  end if;
  if p_status = 'completed' then
    perform private.mark_completed(b.id);
    perform private.notify(b.client_id, 'booking_completed', b.id);
    perform private.notify(b.artisan_id, 'booking_completed', b.id);
  else
    update public.bookings
       set status = 'cancelled', cancelled_by = v_staff, sharing_location = false,
           cancel_reason = nullif(left(btrim(coalesce(p_reason, '')), 300), '')
     where id = b.id;
    perform private.notify(b.client_id, 'booking_cancelled', b.id);
    perform private.notify(b.artisan_id, 'booking_cancelled', b.id);
  end if;
  perform private.audit('booking.' || p_status, 'booking:' || b.id::text,
    jsonb_build_object('from', b.status, 'reason', left(coalesce(p_reason, ''), 300)));
end $$;

-- Masquer ou réafficher un avis (la note moyenne est recalculée par déclencheur).
create function public.admin_set_review_visibility(p_review_id uuid, p_visible boolean, p_reason text default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_staff();
  if p_visible is null then
    raise exception 'invalid_input';
  end if;
  update public.reviews set is_visible = p_visible where id = p_review_id;
  if not found then
    raise exception 'not_found';
  end if;
  perform private.audit(case when p_visible then 'review.show' else 'review.hide' end,
    'review:' || p_review_id::text, jsonb_build_object('reason', left(coalesce(p_reason, ''), 300)));
end $$;

-- Traiter un signalement. « resolved » + « suspension » suspend le compte signalé
-- dans la même transaction : la décision et son effet ne peuvent pas diverger.
create function public.admin_update_report(
  p_report_id  uuid,
  p_status     text,
  p_resolution text default 'none',
  p_note       text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_staff uuid := private.require_staff();
  r       public.reports;
begin
  if p_status is null or p_status not in ('open', 'in_review', 'resolved', 'rejected') then
    raise exception 'invalid_status';
  end if;
  if p_resolution is null or p_resolution not in ('none', 'warning', 'suspension', 'cash_dispute', 'other') then
    raise exception 'invalid_resolution';
  end if;
  if p_resolution <> 'none' and p_status <> 'resolved' then
    raise exception 'invalid_resolution';
  end if;
  if p_note is not null and char_length(p_note) > 4000 then
    raise exception 'invalid_note';
  end if;
  select * into r from public.reports where id = p_report_id for update;
  if not found then
    raise exception 'not_found';
  end if;

  update public.reports
     set status = p_status, resolution = p_resolution, handled_by = v_staff,
         handled_at = case when p_status in ('resolved', 'rejected') then now() else null end
   where id = r.id;
  if p_note is not null then
    insert into public.report_notes (report_id, note, updated_by, updated_at)
    values (r.id, btrim(p_note), v_staff, now())
    on conflict (report_id) do update
      set note = excluded.note, updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  end if;
  if p_status = 'resolved' and p_resolution = 'suspension'
     and exists (select 1 from public.profiles p where p.id = r.reported_user_id and p.is_active) then
    perform private.set_user_active(r.reported_user_id, false, 'report:' || r.id::text);
  end if;
  perform private.audit('report.update', 'report:' || r.id::text,
    jsonb_build_object('status', p_status, 'resolution', p_resolution));
end $$;

create function public.admin_set_launch_free_until(p_until timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_staff();
  update public.app_config set launch_free_until = p_until;
  perform private.audit('config.launch_free_until', 'config', jsonb_build_object('until', p_until));
end $$;

-- ── Suppression de compte ───────────────────────────────────────────────────
-- Appelée par le serveur (clé service) juste avant de supprimer l'utilisateur
-- d'auth. Efface ce que la personne a écrit, ferme ses demandes ouvertes et
-- prévient l'autre partie. La suppression d'auth.users emporte ensuite, par
-- cascade : fiche, contact, vitrine, portfolio, notifications.
create function public.purge_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare b record;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'invalid_input';
  end if;

  for b in
    select x.id, x.client_id, x.artisan_id from public.bookings x
     where (x.client_id = p_user_id or x.artisan_id = p_user_id) and x.status in ('pending', 'accepted', 'finished')
  loop
    update public.bookings
       set status = 'cancelled', cancelled_by = p_user_id, sharing_location = false,
           cancel_reason = 'Compte supprimé'
     where id = b.id;
    perform private.notify(case when b.client_id = p_user_id then b.artisan_id else b.client_id end,
                           'booking_cancelled', b.id);
  end loop;

  update public.booking_private bp set address = ''
    from public.bookings x where x.id = bp.booking_id and x.client_id = p_user_id;
  update public.bookings set description = 'Demande supprimée avec le compte.' where client_id = p_user_id;
  update public.messages set body = 'Message supprimé.' where sender_id = p_user_id;
  update public.reviews set author_name = 'Compte supprimé', comment = '', photos = '{}' where client_id = p_user_id;
  delete from public.artisan_live_location where artisan_id = p_user_id;
end $$;

-- ── Droits d'exécution ──────────────────────────────────────────────────────
-- Postgres donne EXECUTE à tout le monde par défaut, et Supabase le redonne à
-- anon et authenticated. On retire tout, puis on rend uniquement ce qui suit.
-- Un test (tests/db/surface.test.ts) compare le résultat à une liste écrite à la main.
do $$
declare
  r record;
  -- appelables par un utilisateur connecté
  v_user text[] := array[
    'my_access', 'save_profile', 'set_phone', 'become_artisan',
    'save_listing', 'set_availability', 'publish_listing',
    'add_portfolio_post', 'delete_portfolio_post',
    'request_subscription', 'cancel_subscription_request',
    'create_booking', 'respond_booking', 'cancel_booking', 'finish_booking', 'complete_booking',
    'set_sharing_location', 'push_location',
    'send_message', 'mark_messages_read', 'booking_contact',
    'submit_review', 'reply_review',
    'mark_notifications_read', 'clear_notifications',
    'create_report',
    'admin_overview', 'admin_set_user_active', 'admin_set_listing', 'admin_review_subscription',
    'admin_set_booking_status', 'admin_set_review_visibility', 'admin_update_report',
    'admin_set_launch_free_until'
  ];
  -- appelables aussi sans connexion
  v_anon text[] := array['search_artisans'];
  -- fonctions internes utilisées par les règles RLS et la recherche
  v_internal text[] := array[
    'is_staff', 'launch_free', 'shares_booking', 'is_booking_party', 'booking_reported', 'distance_km'
  ];
begin
  for r in
    select p.oid::regprocedure as sig, n.nspname as schema_name, p.proname as fn_name
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private')
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
    if r.schema_name = 'public' and r.fn_name = any (v_user) then
      execute format('grant execute on function %s to authenticated', r.sig);
    elsif r.schema_name = 'public' and r.fn_name = any (v_anon) then
      execute format('grant execute on function %s to anon, authenticated', r.sig);
    elsif r.schema_name = 'private' and r.fn_name = any (v_internal) then
      execute format('grant execute on function %s to anon, authenticated', r.sig);
    end if;
  end loop;
end $$;
