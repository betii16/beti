// Lecture de la fiche publique d'un artisan, pour sa page et pour le formulaire de demande.

import { cache } from 'react'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Seules les colonnes affichées sont demandées (sur cette table, « * » est refusé par la base).
const ARTISAN =
  'id, display_name, category, skills, bio, hourly_rate, wilaya_code, commune, radius_km, avatar_path, cover_path, is_available, phone_verified, verified_at, rating_avg, rating_count, jobs_done'

/**
 * Fiche d'un artisan, ou null s'il est introuvable, non publié ou suspendu (les
 * règles de la base ne renvoient alors rien). cache() : une seule lecture par
 * rendu, même si le titre de l'onglet et la page la demandent tous deux.
 */
export const getArtisan = cache(async (id: string) => {
  // L'identifiant vient de l'adresse : s'il n'a pas la forme attendue, la base n'est pas interrogée.
  if (!z.uuid().safeParse(id).success) return { artisan: null, error: null }
  const supabase = await createClient()
  const { data, error } = await supabase.from('artisans').select(ARTISAN).eq('id', id).maybeSingle()
  return { artisan: data, error }
})
