// lib/artisanMarker.ts
// Une seule requête artisans pour la carte (page /map) : la page la fait et
// passe les marqueurs à BetiMap, au lieu que les deux interrogent la base.

import { supabase } from './supabase'
import { isListed } from './subscription'
import { CATEGORY_COLOR } from '@/components/icons'

type ArtisanRow = {
  id: string; category: string | null; hourly_rate: number | null; is_available: boolean
  rating_avg: number | null; rating_count: number | null; total_missions: number | null
  bio: string | null; lat: number; lng: number
  plan: string | null; plan_until: string | null
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

export type ArtisanMarker = {
  id: string; name: string; initials: string; avatar: string | null
  category: string; rating: number; price: number; available: boolean
  color: string; lat: number; lng: number
  plan?: string | null; plan_until?: string | null
  ratingCount?: number; missions?: number; bio?: string
}

/** Artisans visibles (paywall appliqué) avec coordonnées, prêts pour la carte et la liste. */
export async function fetchArtisanMarkers(onlyId?: string): Promise<ArtisanMarker[] | null> {
  let q = supabase
    .from('artisans')
    .select('id, category, hourly_rate, is_available, rating_avg, rating_count, total_missions, bio, lat, lng, plan, plan_until, profiles(full_name, avatar_url)')
    .not('lat', 'is', null).not('lng', 'is', null)
  if (onlyId) q = q.eq('id', onlyId)
  const { data, error } = await q.returns<ArtisanRow[]>()
  if (error || !data) return null
  return data.filter(a => isListed(a)).map(a => ({
    id: a.id,
    name: a.profiles?.full_name || 'Artisan',
    initials: (a.profiles?.full_name || 'A').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
    avatar: a.profiles?.avatar_url || null,
    category: a.category || 'autre',
    rating: a.rating_avg || 0,
    price: a.hourly_rate || 0,
    available: a.is_available,
    color: (CATEGORY_COLOR as Record<string, string>)[a.category ?? ''] || '#175CC4',
    lat: a.lat, lng: a.lng, plan: a.plan, plan_until: a.plan_until,
    ratingCount: a.rating_count || 0, missions: a.total_missions || 0, bio: a.bio || '',
  }))
}
