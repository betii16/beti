-- ============================================================================
-- BETI v2 : droits de lecture colonne par colonne (2026-11-18)
-- ============================================================================
-- Jusqu'ici anon et authenticated pouvaient lire des tables entières. Les règles
-- RLS choisissent les LIGNES ; elles ne cachent aucune COLONNE. L'API servait donc
-- à n'importe qui :
--   - reviews.client_id et reviews.booking_id : de quoi relier entre eux tous les
--     avis d'une même personne ;
--   - artisans.plan et artisans.plan_until : l'abonnement de chaque artisan.
-- Ces colonnes continuent de servir aux règles RLS et aux fonctions ; elles ne se
-- lisent plus directement.
--   - Un artisan lit son abonnement dans subscriptions (ses propres lignes).
--   - L'équipe lit subscriptions ; un avis se modère par son id.
-- Une colonne ajoutée plus tard à ces deux tables sera fermée tant qu'on ne
-- l'accorde pas ici : tests/db/surface.test.ts en tient la liste.
--
-- Retour arrière :
--   grant select on public.reviews, public.artisans to anon, authenticated;
--   alter function public.search_artisans(text, integer, text, numeric, numeric, integer, integer) security invoker;
-- ============================================================================

revoke select on public.reviews from anon, authenticated;

grant select (id, artisan_id, author_name, rating, comment, photos, reply, replied_at, is_visible, created_at)
  on public.reviews to anon;

-- booking_id en plus pour une personne connectée : le client et l'artisan
-- retrouvent l'avis d'une de leurs demandes. Ce n'est qu'un identifiant, et la
-- demande elle-même reste invisible aux autres (RLS de bookings).
grant select (id, booking_id, artisan_id, author_name, rating, comment, photos, reply, replied_at, is_visible, created_at)
  on public.reviews to authenticated;

revoke select on public.artisans from anon, authenticated;

grant select (id, display_name, category, skills, bio, hourly_rate, wilaya_code, commune, lat, lng, radius_km,
              avatar_path, cover_path, is_available, published, suspended, phone_verified, verified_at,
              rating_avg, rating_count, jobs_done, created_at, updated_at)
  on public.artisans to anon, authenticated;

-- La recherche lit plan et plan_until (visibilité, mise en avant) : elle ne le peut
-- plus avec les droits de l'appelant. Elle passe en security definer. Son résultat
-- ne change pas : elle applique déjà elle-même la règle de visibilité publique,
-- sans compter sur le RLS, et ne renvoie que is_premium, jamais la formule.
alter function public.search_artisans(text, integer, text, numeric, numeric, integer, integer) security definer;
