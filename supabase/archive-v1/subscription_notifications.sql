-- ============================================================================
-- BETI — Notifications d'abonnement (validé / refusé)
-- ============================================================================
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS subscriptions_schema.sql.
-- Idempotent.
--
-- Les inserts de notifications côté client sont bloqués par RLS (deny-all).
-- Ce trigger (security definer) notifie l'artisan quand l'admin valide ou
-- refuse sa demande d'abonnement.
-- ============================================================================

create or replace function public.notify_on_subscription_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'active' then
      insert into public.notifications(user_id, type, title, message)
      values (new.artisan_id, 'subscription_active', 'Abonnement activé',
              'Votre abonnement ' || case when new.plan = 'premium' then 'Premium' else 'Basic' end || ' est actif.');
    elsif new.status = 'rejected' then
      insert into public.notifications(user_id, type, title, message)
      values (new.artisan_id, 'subscription_rejected', 'Demande refusée',
              coalesce(nullif(new.note, ''), 'Votre demande d''abonnement a été refusée.'));
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_notify_on_subscription_status on public.subscriptions;
create trigger trg_notify_on_subscription_status
  after update on public.subscriptions
  for each row execute function public.notify_on_subscription_status();
