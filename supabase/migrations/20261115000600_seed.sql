-- ============================================================================
-- BETI v2 : données de départ
-- ============================================================================

-- Les libellés français et arabes sont dans l'application (src/i18n), par slug.
insert into public.categories (slug, sort, is_urgent) values
  ('plomberie',    10, true),
  ('electricite',  20, true),
  ('serrurerie',   30, true),
  ('menage',       40, false),
  ('peinture',     50, false),
  ('demenagement', 60, false),
  ('jardinage',    70, false),
  ('informatique', 80, false),
  ('coiffure',     90, false),
  ('autre',       100, false)
on conflict (slug) do nothing;

-- Tarifs en DA (ceux de la v1). Basic : 6 réalisations au plus ; Premium : sans limite.
insert into public.plans (id, monthly, yearly, max_portfolio_posts) values
  ('basic',   2500, 20000, 6),
  ('premium', 5000, 50000, null)
on conflict (id) do nothing;

-- Période de lancement : deux mois à partir de l'installation. Un admin peut
-- changer la date depuis le panneau (admin_set_launch_free_until).
insert into public.app_config (id, launch_free_until)
values (true, now() + interval '2 months')
on conflict (id) do nothing;
