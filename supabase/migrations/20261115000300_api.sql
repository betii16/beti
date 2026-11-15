-- ============================================================================
-- BETI v2 : l'API. Toute écriture d'un utilisateur passe par une de ces fonctions.
-- ============================================================================
-- Chaque fonction : identifie l'appelant (private.require_user), contrôle ses
-- droits sur la ligne visée, valide les valeurs, écrit, notifie l'autre partie.
-- Les erreurs portent un code stable (« invalid_transition », « rate_limited »…)
-- que l'application traduit en français ou en arabe.
-- Attention aux NULL : « x not in (a, b) » vaut NULL si a ou b est NULL. Les
-- contrôles de partie utilisent donc « is distinct from ».
-- ============================================================================

-- ── Compte ──────────────────────────────────────────────────────────────────
create function public.my_access() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'role', (select p.role from public.profiles p where p.id = auth.uid()),
    'is_active', coalesce((select p.is_active from public.profiles p where p.id = auth.uid()), false),
    'staff_role', (select s.role from private.staff s where s.user_id = auth.uid())
  );
$$;

create function public.save_profile(
  p_full_name   text,
  p_wilaya_code integer default null,
  p_commune     text default null,
  p_lang        text default null,
  p_avatar_path text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := private.require_user();
  v_name text := btrim(coalesce(p_full_name, ''));
begin
  if char_length(v_name) not between 2 and 80 then
    raise exception 'invalid_full_name';
  end if;
  if p_lang is not null and p_lang not in ('fr', 'ar') then
    raise exception 'invalid_lang';
  end if;
  if p_wilaya_code is not null and p_wilaya_code not between 1 and 58 then
    raise exception 'invalid_wilaya';
  end if;
  if p_avatar_path is not null and p_avatar_path !~ ('^avatars/' || v_uid::text || '/[A-Za-z0-9._-]{1,80}$') then
    raise exception 'invalid_avatar';
  end if;
  update public.profiles set
    full_name   = v_name,
    wilaya_code = p_wilaya_code,
    commune     = nullif(left(btrim(coalesce(p_commune, '')), 80), ''),
    lang        = coalesce(p_lang, lang),
    avatar_path = p_avatar_path
  where id = v_uid;
end $$;

-- Numéro déclaré. Il n'est « vérifié » que s'il est celui confirmé par code à la connexion.
create function public.set_phone(p_phone text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid      uuid := private.require_user();
  v_phone    text := nullif(regexp_replace(coalesce(p_phone, ''), '[\s().-]', '', 'g'), '');
  v_verified boolean := false;
begin
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'invalid_phone';
  end if;
  if v_phone is not null then
    select coalesce(u.phone_confirmed_at is not null and '+' || ltrim(u.phone, '+') = v_phone, false)
      into v_verified from auth.users u where u.id = v_uid;
  end if;
  insert into public.user_contacts (user_id, phone, phone_verified)
  values (v_uid, v_phone, coalesce(v_verified, false))
  on conflict (user_id) do update
    set phone = excluded.phone, phone_verified = excluded.phone_verified;
  update public.artisans set phone_verified = coalesce(v_verified, false) where id = v_uid;
end $$;

create function public.become_artisan() returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  update public.profiles set role = 'artisan' where id = v_uid;
end $$;

-- ── Fiche de l'artisan ──────────────────────────────────────────────────────
create function public.save_listing(
  p_display_name text,
  p_category     text,
  p_wilaya_code  integer,
  p_commune      text default '',
  p_bio          text default '',
  p_skills       text[] default '{}',
  p_hourly_rate  integer default null,
  p_lat          numeric default null,
  p_lng          numeric default null,
  p_radius_km    integer default 15,
  p_avatar_path  text default null,
  p_cover_path   text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid    uuid := private.require_user();
  v_name   text := btrim(coalesce(p_display_name, ''));
  v_bio    text := btrim(coalesce(p_bio, ''));
  v_skills text[];
begin
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.role = 'artisan') then
    raise exception 'not_an_artisan' using errcode = '42501';
  end if;
  if char_length(v_name) not between 2 and 60 then
    raise exception 'invalid_display_name';
  end if;
  if not exists (select 1 from public.categories c where c.slug = p_category and c.is_active) then
    raise exception 'invalid_category';
  end if;
  if p_wilaya_code is null or p_wilaya_code not between 1 and 58 then
    raise exception 'invalid_wilaya';
  end if;
  if char_length(v_bio) > 1000 then
    raise exception 'invalid_bio';
  end if;
  if p_hourly_rate is not null and p_hourly_rate not between 0 and 1000000 then
    raise exception 'invalid_rate';
  end if;
  if p_radius_km is null or p_radius_km not between 1 and 200 then
    raise exception 'invalid_radius';
  end if;
  if (p_lat is null) <> (p_lng is null)
     or (p_lat is not null and (p_lat not between 18 and 38 or p_lng not between -9 and 12.5)) then
    raise exception 'invalid_location';
  end if;
  if p_avatar_path is not null and p_avatar_path !~ ('^avatars/' || v_uid::text || '/[A-Za-z0-9._-]{1,80}$') then
    raise exception 'invalid_avatar';
  end if;
  if p_cover_path is not null and p_cover_path !~ ('^portfolio/' || v_uid::text || '/[A-Za-z0-9._-]{1,80}$') then
    raise exception 'invalid_cover';
  end if;

  select coalesce(array_agg(t.s order by t.s), '{}') into v_skills
  from (
    select distinct lower(btrim(x)) as s
    from unnest(coalesce(p_skills, '{}')) as x
    where char_length(btrim(x)) between 2 and 30
    limit 12
  ) t;

  insert into public.artisans as a (
    id, display_name, category, wilaya_code, commune, bio, skills, hourly_rate,
    lat, lng, radius_km, avatar_path, cover_path, phone_verified
  ) values (
    v_uid, v_name, p_category, p_wilaya_code, left(btrim(coalesce(p_commune, '')), 80), v_bio, v_skills, p_hourly_rate,
    p_lat, p_lng, p_radius_km, p_avatar_path, p_cover_path,
    coalesce((select c.phone_verified from public.user_contacts c where c.user_id = v_uid), false)
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    category     = excluded.category,
    wilaya_code  = excluded.wilaya_code,
    commune      = excluded.commune,
    bio          = excluded.bio,
    skills       = excluded.skills,
    hourly_rate  = excluded.hourly_rate,
    lat          = excluded.lat,
    lng          = excluded.lng,
    radius_km    = excluded.radius_km,
    avatar_path  = excluded.avatar_path,
    cover_path   = excluded.cover_path;
end $$;

create function public.set_availability(p_available boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  update public.artisans set is_available = coalesce(p_available, false) where id = v_uid;
  if not found then
    raise exception 'listing_missing';
  end if;
end $$;

-- Publier exige un numéro de téléphone : c'est par lui que le client joint l'artisan.
create function public.publish_listing(p_published boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  if not exists (select 1 from public.artisans a where a.id = v_uid) then
    raise exception 'listing_missing';
  end if;
  if coalesce(p_published, false)
     and not exists (select 1 from public.user_contacts c where c.user_id = v_uid and c.phone is not null) then
    raise exception 'phone_required';
  end if;
  update public.artisans
     set published = coalesce(p_published, false),
         is_available = case when coalesce(p_published, false) then is_available else false end
   where id = v_uid;
end $$;

create function public.add_portfolio_post(p_caption text, p_photos text[]) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := private.require_user();
  v_caption text := btrim(coalesce(p_caption, ''));
  v_premium boolean;
  v_max     integer;
  v_id      uuid;
begin
  select (a.plan = 'premium' and a.plan_until is not null and a.plan_until > now()) into v_premium
    from public.artisans a where a.id = v_uid;
  if not found then
    raise exception 'listing_missing';
  end if;
  if char_length(v_caption) > 500 then
    raise exception 'invalid_caption';
  end if;
  if p_photos is null or cardinality(p_photos) not between 1 and 6
     or exists (
       select 1 from unnest(p_photos) as x
       where x is null or x !~ ('^portfolio/' || v_uid::text || '/[A-Za-z0-9._-]{1,80}$')
     ) then
    raise exception 'invalid_photos';
  end if;
  select p.max_portfolio_posts into v_max
    from public.plans p where p.id = case when v_premium then 'premium' else 'basic' end;
  if v_max is not null
     and (select count(*) from public.portfolio_posts pp where pp.artisan_id = v_uid) >= v_max then
    raise exception 'portfolio_limit';
  end if;
  insert into public.portfolio_posts (artisan_id, caption, photos)
  values (v_uid, v_caption, p_photos) returning id into v_id;
  return v_id;
end $$;

create function public.delete_portfolio_post(p_post_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  delete from public.portfolio_posts where id = p_post_id and artisan_id = v_uid;
  if not found then
    raise exception 'not_found';
  end if;
end $$;

create function public.request_subscription(
  p_plan           text,
  p_cycle          text,
  p_payment_method text default 'transfer',
  p_payment_ref    text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid    uuid := private.require_user();
  v_label  text;
  v_amount integer;
  v_id     uuid;
begin
  select a.display_name into v_label from public.artisans a where a.id = v_uid;
  if not found then
    raise exception 'listing_missing';
  end if;
  if p_cycle is null or p_cycle not in ('monthly', 'yearly') then
    raise exception 'invalid_cycle';
  end if;
  if p_payment_method is null or p_payment_method not in ('transfer', 'ccp', 'baridimob', 'cash') then
    raise exception 'invalid_payment_method';
  end if;
  select case p_cycle when 'monthly' then p.monthly else p.yearly end into v_amount
    from public.plans p where p.id = p_plan;
  if not found then
    raise exception 'invalid_plan';
  end if;
  begin
    insert into public.subscriptions (artisan_id, artisan_label, plan, cycle, amount, payment_method, payment_ref)
    values (v_uid, v_label, p_plan, p_cycle, v_amount, p_payment_method,
            nullif(left(btrim(coalesce(p_payment_ref, '')), 80), ''))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'already_pending';
  end;
  return v_id;
end $$;

create function public.cancel_subscription_request(p_subscription_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  update public.subscriptions set status = 'cancelled'
   where id = p_subscription_id and artisan_id = v_uid and status = 'pending';
  if not found then
    raise exception 'not_found';
  end if;
end $$;

-- ── Demandes ────────────────────────────────────────────────────────────────
create function public.create_booking(
  p_artisan_id    uuid,
  p_description   text,
  p_wilaya_code   integer,
  p_commune       text default '',
  p_address       text default '',
  p_scheduled_for timestamptz default null,
  p_is_urgent     boolean default false
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid      uuid := private.require_user();
  v_desc     text := btrim(coalesce(p_description, ''));
  v_address  text := btrim(coalesce(p_address, ''));
  v_category text;
  v_id       uuid;
begin
  if p_artisan_id is null or p_artisan_id = v_uid then
    raise exception 'invalid_artisan';
  end if;
  if not private.artisan_visible(p_artisan_id) then
    raise exception 'artisan_unavailable';
  end if;
  if char_length(v_desc) not between 10 and 2000 then
    raise exception 'invalid_description';
  end if;
  if p_wilaya_code is null or p_wilaya_code not between 1 and 58 then
    raise exception 'invalid_wilaya';
  end if;
  if char_length(v_address) > 300 then
    raise exception 'invalid_address';
  end if;
  if p_scheduled_for is not null
     and (p_scheduled_for < now() - interval '1 hour' or p_scheduled_for > now() + interval '1 year') then
    raise exception 'invalid_date';
  end if;

  -- Déjà une demande ouverte avec cet artisan : c'est leur conversation, on la reprend.
  select b.id into v_id from public.bookings b
   where b.client_id = v_uid and b.artisan_id = p_artisan_id and b.status in ('pending', 'accepted', 'finished');
  if found then
    return v_id;
  end if;

  if (select count(*) from public.bookings b where b.client_id = v_uid and b.status = 'pending') >= 5 then
    raise exception 'too_many_pending';
  end if;
  if (select count(*) from public.bookings b
       where b.client_id = v_uid and b.created_at > now() - interval '1 day') >= 10 then
    raise exception 'rate_limited';
  end if;

  select a.category into v_category from public.artisans a where a.id = p_artisan_id;
  begin
    insert into public.bookings (client_id, artisan_id, category, description, wilaya_code, commune, scheduled_for, is_urgent)
    values (v_uid, p_artisan_id, v_category, v_desc, p_wilaya_code,
            left(btrim(coalesce(p_commune, '')), 80), p_scheduled_for, coalesce(p_is_urgent, false))
    returning id into v_id;
  exception when unique_violation then
    -- deux envois simultanés : on renvoie la demande créée par l'autre
    select b.id into v_id from public.bookings b
     where b.client_id = v_uid and b.artisan_id = p_artisan_id and b.status in ('pending', 'accepted', 'finished');
    return v_id;
  end;
  insert into public.booking_private (booking_id, address) values (v_id, v_address);
  perform private.notify(p_artisan_id, 'booking_new', v_id);
  return v_id;
end $$;

-- L'artisan accepte (avec un prix indicatif facultatif) ou décline.
create function public.respond_booking(p_booking_id uuid, p_accept boolean, p_quoted_price integer default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  b     public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or b.artisan_id is distinct from v_uid then
    raise exception 'not_found';
  end if;
  if b.status <> 'pending' then
    raise exception 'invalid_transition';
  end if;
  if coalesce(p_accept, false) then
    if p_quoted_price is not null and p_quoted_price not between 0 and 100000000 then
      raise exception 'invalid_price';
    end if;
    update public.bookings set status = 'accepted', accepted_at = now(), quoted_price = p_quoted_price
     where id = b.id;
    perform private.notify(b.client_id, 'booking_accepted', b.id);
    return 'accepted';
  end if;
  update public.bookings set status = 'declined' where id = b.id;
  perform private.notify(b.client_id, 'booking_declined', b.id);
  return 'declined';
end $$;

-- Le client annule tant que le travail n'est pas déclaré terminé ; l'artisan peut
-- se désister d'une demande acceptée.
create function public.cancel_booking(p_booking_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := private.require_user();
  b       public.bookings;
  v_other uuid;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or (b.client_id is distinct from v_uid and b.artisan_id is distinct from v_uid) then
    raise exception 'not_found';
  end if;
  if b.client_id is not distinct from v_uid and b.status in ('pending', 'accepted') then
    v_other := b.artisan_id;
  elsif b.artisan_id is not distinct from v_uid and b.status = 'accepted' then
    v_other := b.client_id;
  else
    raise exception 'invalid_transition';
  end if;
  update public.bookings
     set status = 'cancelled', cancelled_by = v_uid, sharing_location = false,
         cancel_reason = nullif(left(btrim(coalesce(p_reason, '')), 300), '')
   where id = b.id;
  perform private.notify(v_other, 'booking_cancelled', b.id);
end $$;

-- L'artisan déclare le travail terminé.
create function public.finish_booking(p_booking_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  b     public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or b.artisan_id is distinct from v_uid then
    raise exception 'not_found';
  end if;
  if b.status <> 'accepted' then
    raise exception 'invalid_transition';
  end if;
  update public.bookings set status = 'finished', finished_at = now(), sharing_location = false where id = b.id;
  perform private.notify(b.client_id, 'booking_finished', b.id);
end $$;

-- Clôture : partagée par le client (complete_booking) et l'équipe (admin_set_booking_status).
create function private.mark_completed(p_booking_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_artisan uuid;
begin
  update public.bookings
     set status = 'completed', completed_at = now(), sharing_location = false
   where id = p_booking_id
   returning artisan_id into v_artisan;
  update public.artisans set jobs_done = jobs_done + 1 where id = v_artisan;
end $$;

-- Le client confirme la fin du travail : la demande est close, l'avis devient possible.
create function public.complete_booking(p_booking_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  b     public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or b.client_id is distinct from v_uid then
    raise exception 'not_found';
  end if;
  if b.status <> 'finished' then
    raise exception 'invalid_transition';
  end if;
  perform private.mark_completed(b.id);
  perform private.notify(b.artisan_id, 'booking_completed', b.id);
end $$;

-- Partage de la position pendant le trajet, pour une demande acceptée.
create function public.set_sharing_location(p_booking_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  b     public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or b.artisan_id is distinct from v_uid then
    raise exception 'not_found';
  end if;
  if b.status <> 'accepted' then
    raise exception 'invalid_transition';
  end if;
  update public.bookings set sharing_location = coalesce(p_on, false) where id = b.id;
  if not coalesce(p_on, false)
     and not exists (select 1 from public.bookings x where x.artisan_id = v_uid and x.sharing_location) then
    delete from public.artisan_live_location where artisan_id = v_uid;
  end if;
end $$;

create function public.push_location(p_lat double precision, p_lng double precision) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'invalid_location';
  end if;
  -- On ne garde une position exacte que si un trajet est réellement partagé.
  if not exists (select 1 from public.bookings b where b.artisan_id = v_uid and b.sharing_location) then
    raise exception 'not_sharing';
  end if;
  insert into public.artisan_live_location (artisan_id, lat, lng, updated_at)
  values (v_uid, p_lat, p_lng, now())
  on conflict (artisan_id) do update set lat = excluded.lat, lng = excluded.lng, updated_at = now();
end $$;

-- ── Messages ────────────────────────────────────────────────────────────────
create function public.send_message(p_booking_id uuid, p_body text) returns public.messages
language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := private.require_user();
  v_body  text := btrim(coalesce(p_body, ''));
  b       public.bookings;
  m       public.messages;
  v_other uuid;
begin
  select * into b from public.bookings where id = p_booking_id;
  if not found or (b.client_id is distinct from v_uid and b.artisan_id is distinct from v_uid) then
    raise exception 'not_found';
  end if;
  if b.status in ('declined', 'cancelled')
     or (b.status = 'completed' and b.completed_at < now() - interval '7 days') then
    raise exception 'conversation_closed';
  end if;
  if char_length(v_body) not between 1 and 2000 then
    raise exception 'invalid_body';
  end if;
  if (select count(*) from public.messages x
       where x.sender_id = v_uid and x.created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate_limited';
  end if;
  insert into public.messages (booking_id, sender_id, body) values (b.id, v_uid, v_body) returning * into m;

  v_other := case when b.client_id is not distinct from v_uid then b.artisan_id else b.client_id end;
  -- Une seule notification non lue par conversation, pas une par message.
  if v_other is not null and not exists (
       select 1 from public.notifications n
       where n.user_id = v_other and n.booking_id = b.id and n.type = 'message_new' and n.read_at is null
     ) then
    perform private.notify(v_other, 'message_new', b.id);
  end if;
  return m;
end $$;

create function public.mark_messages_read(p_booking_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  if not private.is_booking_party(p_booking_id) then
    raise exception 'not_found';
  end if;
  update public.messages set read_at = now()
   where booking_id = p_booking_id and sender_id is distinct from v_uid and read_at is null;
  update public.notifications set read_at = now()
   where user_id = v_uid and booking_id = p_booking_id and type = 'message_new' and read_at is null;
end $$;

-- Téléphone de l'autre partie : seulement une fois la demande acceptée.
create function public.booking_contact(p_booking_id uuid)
returns table (phone text, phone_verified boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid   uuid := private.require_user();
  b       public.bookings;
  v_other uuid;
begin
  select * into b from public.bookings where id = p_booking_id;
  if not found or (b.client_id is distinct from v_uid and b.artisan_id is distinct from v_uid) then
    raise exception 'not_found';
  end if;
  if b.status not in ('accepted', 'finished', 'completed') then
    return;
  end if;
  v_other := case when b.client_id is not distinct from v_uid then b.artisan_id else b.client_id end;
  return query
    select c.phone, c.phone_verified from public.user_contacts c
     where c.user_id = v_other and c.phone is not null;
end $$;

-- ── Avis ────────────────────────────────────────────────────────────────────
create function public.submit_review(
  p_booking_id uuid,
  p_rating     integer,
  p_comment    text default '',
  p_photos     text[] default '{}'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := private.require_user();
  v_comment text := btrim(coalesce(p_comment, ''));
  v_photos  text[] := coalesce(p_photos, '{}');
  b         public.bookings;
  v_name    text;
  v_rest    text;
  v_author  text;
  v_id      uuid;
begin
  select * into b from public.bookings where id = p_booking_id;
  if not found or b.client_id is distinct from v_uid or b.artisan_id is null then
    raise exception 'not_found';
  end if;
  if b.status <> 'completed' then
    raise exception 'booking_not_completed';
  end if;
  if b.completed_at < now() - interval '60 days' then
    raise exception 'review_window_closed';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'invalid_rating';
  end if;
  if char_length(v_comment) > 1000 then
    raise exception 'invalid_comment';
  end if;
  if cardinality(v_photos) > 4
     or exists (
       select 1 from unnest(v_photos) as x
       where x is null or x !~ ('^reviews/' || b.id::text || '/[A-Za-z0-9._-]{1,80}$')
     ) then
    raise exception 'invalid_photos';
  end if;

  -- « Karim Benali » devient « Karim B. » : le nom complet n'est jamais publié.
  select btrim(p.full_name) into v_name from public.profiles p where p.id = v_uid;
  v_rest := btrim(regexp_replace(coalesce(v_name, ''), '^\S+', ''));
  v_author := btrim(left(split_part(coalesce(v_name, ''), ' ', 1), 30)
              || case when v_rest <> '' then ' ' || upper(left(v_rest, 1)) || '.' else '' end);
  if v_author = '' then
    v_author := 'Client';
  end if;

  begin
    insert into public.reviews (booking_id, artisan_id, client_id, author_name, rating, comment, photos)
    values (b.id, b.artisan_id, v_uid, v_author, p_rating, v_comment, v_photos)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'already_reviewed';
  end;
  perform private.notify(b.artisan_id, 'review_new', b.id);
  return v_id;
end $$;

create function public.reply_review(p_review_id uuid, p_reply text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := private.require_user();
  v_reply text := nullif(btrim(coalesce(p_reply, '')), '');
  r       public.reviews;
begin
  select * into r from public.reviews where id = p_review_id for update;
  if not found or r.artisan_id is distinct from v_uid then
    raise exception 'not_found';
  end if;
  if v_reply is not null and char_length(v_reply) > 1000 then
    raise exception 'invalid_reply';
  end if;
  update public.reviews
     set reply = v_reply, replied_at = case when v_reply is null then null else now() end
   where id = r.id;
  if v_reply is not null and r.reply is null then
    perform private.notify(r.client_id, 'review_reply', r.booking_id);
  end if;
end $$;

-- ── Notifications ───────────────────────────────────────────────────────────
create function public.mark_notifications_read(p_ids uuid[] default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  update public.notifications set read_at = now()
   where user_id = v_uid and read_at is null and (p_ids is null or id = any (p_ids));
end $$;

create function public.clear_notifications() returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  delete from public.notifications where user_id = v_uid;
end $$;

-- ── Signalements ────────────────────────────────────────────────────────────
-- La personne signalée est déduite de la cible par le serveur, jamais fournie par
-- le navigateur. Une demande n'est rattachée au signalement que si l'auteur en
-- fait partie : on ne peut pas ouvrir la conversation d'inconnus à l'équipe.
create function public.create_report(
  p_target_type text,
  p_target_id   uuid,
  p_reason      text,
  p_details     text default null,
  p_booking_id  uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid      uuid := private.require_user();
  v_details  text := nullif(btrim(coalesce(p_details, '')), '');
  v_reported uuid;
  v_booking  uuid;
  b          public.bookings;
  m          public.messages;
  r          public.reviews;
  v_id       uuid;
begin
  if p_target_id is null then
    raise exception 'invalid_target';
  end if;
  if p_reason is null or p_reason not in (
       'fraude', 'comportement', 'travail_non_fait', 'prix_different', 'faux_profil', 'harcelement', 'autre') then
    raise exception 'invalid_reason';
  end if;
  if v_details is not null and char_length(v_details) > 2000 then
    raise exception 'invalid_details';
  end if;
  if p_reason = 'autre' and char_length(coalesce(v_details, '')) < 10 then
    raise exception 'details_required';
  end if;
  if (select count(*) from public.reports x
       where x.reporter_id = v_uid and x.status in ('open', 'in_review')) >= 20 then
    raise exception 'reports_limit';
  end if;

  if p_target_type = 'artisan' then
    if not exists (select 1 from public.artisans a where a.id = p_target_id) then
      raise exception 'invalid_target';
    end if;
    v_reported := p_target_id;
    if p_booking_id is not null then
      select * into b from public.bookings where id = p_booking_id;
      if not found or b.client_id is distinct from v_uid or b.artisan_id is distinct from p_target_id then
        raise exception 'invalid_target';
      end if;
      v_booking := b.id;
    end if;

  elsif p_target_type = 'client' then
    -- on ne signale un client que si l'on a (eu) une demande avec lui
    if not private.shares_booking(p_target_id) then
      raise exception 'invalid_target';
    end if;
    v_reported := p_target_id;
    if p_booking_id is not null then
      select * into b from public.bookings where id = p_booking_id;
      if not found or b.artisan_id is distinct from v_uid or b.client_id is distinct from p_target_id then
        raise exception 'invalid_target';
      end if;
      v_booking := b.id;
    end if;

  elsif p_target_type = 'booking' then
    select * into b from public.bookings where id = p_target_id;
    if not found or (b.client_id is distinct from v_uid and b.artisan_id is distinct from v_uid) then
      raise exception 'invalid_target';
    end if;
    v_reported := case when b.client_id is not distinct from v_uid then b.artisan_id else b.client_id end;
    v_booking := b.id;

  elsif p_target_type = 'message' then
    select * into m from public.messages where id = p_target_id;
    if not found or not private.is_booking_party(m.booking_id) then
      raise exception 'invalid_target';
    end if;
    v_reported := m.sender_id;
    v_booking := m.booking_id;

  elsif p_target_type = 'review' then
    select * into r from public.reviews where id = p_target_id;
    if not found then
      raise exception 'invalid_target';
    end if;
    v_reported := r.client_id;
    if private.is_booking_party(r.booking_id) then
      v_booking := r.booking_id;
    end if;

  else
    raise exception 'invalid_target';
  end if;

  if v_reported is null or v_reported = v_uid then
    raise exception 'invalid_target';
  end if;

  begin
    insert into public.reports (reporter_id, reported_user_id, target_type, target_id, booking_id, reason, details)
    values (v_uid, v_reported, p_target_type, p_target_id, v_booking, p_reason, v_details)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'already_reported';
  end;
  return v_id;
end $$;

-- ── Recherche publique ──────────────────────────────────────────────────────
-- security invoker : les règles RLS s'appliquent. La condition de visibilité est
-- répétée pour que l'équipe et l'artisan obtiennent le même résultat que le public.
create function public.search_artisans(
  p_category    text default null,
  p_wilaya_code integer default null,
  p_q           text default null,
  p_lat         numeric default null,
  p_lng         numeric default null,
  p_limit       integer default 24,
  p_offset      integer default 0
) returns table (
  id             uuid,
  display_name   text,
  category       text,
  skills         text[],
  bio            text,
  hourly_rate    integer,
  wilaya_code    smallint,
  commune        text,
  lat            numeric,
  lng            numeric,
  avatar_path    text,
  cover_path     text,
  is_available   boolean,
  is_premium     boolean,
  phone_verified boolean,
  verified       boolean,
  rating_avg     numeric,
  rating_count   integer,
  jobs_done      integer,
  distance_km    numeric
)
language sql stable security invoker set search_path = '' as $$
  select s.*
  from (
    select
      a.id, a.display_name, a.category, a.skills, a.bio, a.hourly_rate, a.wilaya_code, a.commune,
      a.lat, a.lng, a.avatar_path, a.cover_path, a.is_available,
      (a.plan = 'premium' and a.plan_until is not null and a.plan_until > now()) as is_premium,
      a.phone_verified,
      (a.verified_at is not null) as verified,
      a.rating_avg, a.rating_count, a.jobs_done,
      case when p_lat is not null and p_lng is not null and a.lat is not null and a.lng is not null
           then private.distance_km(p_lat, p_lng, a.lat, a.lng) end as distance_km
    from public.artisans a
    cross join (
      select replace(replace(replace(left(btrim(coalesce(p_q, '')), 60), '\', '\\'), '%', '\%'), '_', '\_') as q
    ) f
    where a.published and not a.suspended
      and (private.launch_free() or (a.plan <> 'free' and a.plan_until is not null and a.plan_until > now()))
      and (p_category is null or a.category = p_category)
      and (p_wilaya_code is null or a.wilaya_code = p_wilaya_code)
      and (
        f.q = ''
        or a.display_name ilike '%' || f.q || '%'
        or a.bio ilike '%' || f.q || '%'
        or exists (select 1 from unnest(a.skills) as sk where sk ilike '%' || f.q || '%')
      )
  ) s
  order by s.is_premium desc, s.distance_km asc nulls last, s.rating_avg desc, s.jobs_done desc, s.id
  limit least(greatest(coalesce(p_limit, 24), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;
