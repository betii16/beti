-- ============================================================================
-- BETI v2 : métiers revus d'après la demande (2026-11-24)
-- ============================================================================
-- Huit métiers très demandés chez les particuliers en Algérie entrent. L'informatique
-- et la coiffure sortent : peu demandées, hors des travaux de la maison. Elles restent
-- dans la table, désactivées (save_listing les refuse), car des demandes passées y
-- renvoient. Les libellés sont dans l'application (src/i18n), par slug.
-- L'ordre (sort) suit la demande ; l'application range ses listes de la même façon.

insert into public.categories (slug, sort, is_urgent) values
  ('climatisation',   30, true),
  ('maconnerie',      70, false),
  ('menuiserie',      80, false),
  ('electromenager',  90, false),
  ('carrelage',      100, false),
  ('ferronnerie',    110, false),
  ('etancheite',     120, false),
  ('parabole',       130, false)
on conflict (slug) do nothing;

update public.categories c
   set sort = v.sort
  from (values
    ('plomberie', 10), ('electricite', 20), ('serrurerie', 40), ('peinture', 50),
    ('menage', 60), ('demenagement', 140), ('jardinage', 150), ('autre', 1000)
  ) as v (slug, sort)
 where c.slug = v.slug;

update public.categories set is_active = false where slug in ('informatique', 'coiffure');

-- Un artisan de ces deux métiers passe dans « Autre » et garde son métier en spécialité,
-- pour rester trouvable par mot-clé (12 spécialités au plus, contrainte de la table).
update public.artisans a
   set category = 'autre',
       skills = case
         when v.label = any (a.skills) or cardinality(a.skills) >= 12 then a.skills
         else a.skills || v.label
       end
  from (values ('informatique', 'Informatique'), ('coiffure', 'Coiffure')) as v (slug, label)
 where a.category = v.slug;
