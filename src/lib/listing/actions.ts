'use server'

// Fiche de l'artisan : la remplir, donner son numéro, la publier, se dire
// disponible. La base revérifie tout (qui appelle, longueurs, bornes) ; ces
// actions mettent en forme et rendent la saisie à l'écran en cas de refus.

import { refresh } from 'next/cache'
import { z } from 'zod'
import { normalizePhone, parseSkills } from '@/domain/listing'
import { PAYMENT_DETAILS } from '@/domain/payment'
import { getSession } from '@/lib/auth/session'
import { errorCode, type ErrorCode } from '@/lib/errors'
import { field } from '@/lib/form'
import { removePhotos } from '@/lib/storage'
import { createClient } from '@/lib/supabase/server'

const FIELDS = ['name', 'category', 'wilaya', 'commune', 'bio', 'skills', 'rate', 'radius'] as const
type Values = Record<(typeof FIELDS)[number], string>

export type ListingState = { error?: ErrorCode; values?: Values; saved?: boolean }

export async function saveListing(_previous: ListingState, formData: FormData): Promise<ListingState> {
  const values = Object.fromEntries(FIELDS.map(name => [name, field(formData, name)])) as Values
  const fail = (error: ErrorCode): ListingState => ({ error, values })

  // Un tarif illisible deviendrait « pas de tarif » sans prévenir : il est refusé ici.
  const rate = values.rate.replace(/\s+/g, '')
  if (rate && !/^\d{1,7}$/.test(rate)) return fail('invalid_input')
  // « Autre » ne dit pas le métier : sans spécialité, aucun mot-clé ne mènerait à cet artisan.
  if (values.category === 'autre' && parseSkills(values.skills).length === 0) return fail('skills_required')

  const session = await getSession()
  if (!session) return fail('not_authenticated')
  const supabase = await createClient()

  // Le formulaire de création d'un compte client le passe en compte artisan, puis crée la fiche.
  if (field(formData, 'become') === '1') {
    const { error } = await supabase.rpc('become_artisan')
    if (error) return fail(errorCode(error))
  }

  // save_listing remplace toute la fiche : photos et position, absentes de ce formulaire, sont relues et renvoyées.
  const current = await supabase.from('artisans').select('avatar_path, cover_path, lat, lng').eq('id', session.userId).maybeSingle()
  if (current.error) return fail(errorCode(current.error))

  const { error } = await supabase.rpc('save_listing', {
    p_display_name: values.name,
    p_category: values.category,
    p_wilaya_code: Number(values.wilaya),
    p_commune: values.commune,
    p_bio: values.bio,
    p_skills: parseSkills(values.skills),
    p_hourly_rate: rate ? Number(rate) : undefined,
    p_radius_km: Number(values.radius),
    p_lat: current.data?.lat ?? undefined,
    p_lng: current.data?.lng ?? undefined,
    p_avatar_path: current.data?.avatar_path ?? undefined,
    p_cover_path: current.data?.cover_path ?? undefined,
  })
  if (error) return fail(errorCode(error))
  refresh()
  return { saved: true }
}

export type StepState = { error?: ErrorCode; phone?: string; saved?: boolean }

/** Numéro, publication, disponibilité : le bouton cliqué donne l'action (champ « do »). */
export async function updateListing(_previous: StepState, formData: FormData): Promise<StepState> {
  const supabase = await createClient()
  const action = field(formData, 'do')

  let error: unknown = null
  if (action === 'phone') {
    const raw = field(formData, 'phone')
    const phone = normalizePhone(raw)
    if (!phone) return { error: 'invalid_phone', phone: raw }
    ;({ error } = await supabase.rpc('set_phone', { p_phone: phone }))
    if (error) return { error: errorCode(error), phone: raw }
  } else if (action === 'publish') {
    ;({ error } = await supabase.rpc('publish_listing', { p_published: true }))
    // Une fiche neuve est « indisponible » par défaut : la publier, c'est vouloir recevoir des demandes.
    if (!error) ({ error } = await supabase.rpc('set_availability', { p_available: true }))
  } else if (action === 'unpublish') {
    ;({ error } = await supabase.rpc('publish_listing', { p_published: false }))
  } else if (action === 'available' || action === 'unavailable') {
    ;({ error } = await supabase.rpc('set_availability', { p_available: action === 'available' }))
  } else {
    return { error: 'invalid_input' }
  }
  if (error) return { error: errorCode(error) }
  refresh()
  return { saved: true }
}

/**
 * Position de l'artisan pour la recherche « près de moi », ou null pour la retirer. Elle est
 * arrondie à 2 décimales (environ 1 km) : la recherche la rend à tous les visiteurs, une adresse
 * exacte n'a rien à y faire. save_listing remplace toute la fiche : elle est relue et renvoyée entière.
 */
export async function setListingPosition(position: { lat: number; lng: number } | null): Promise<{ error?: ErrorCode }> {
  if (position !== null && !(Number.isFinite(position?.lat) && Number.isFinite(position?.lng))) return { error: 'invalid_input' }
  const session = await getSession()
  if (!session) return { error: 'not_authenticated' }
  const supabase = await createClient()
  const { data: listing, error: readError } = await supabase
    .from('artisans')
    .select('display_name, category, wilaya_code, commune, bio, skills, hourly_rate, radius_km, avatar_path, cover_path')
    .eq('id', session.userId)
    .maybeSingle()
  if (readError) return { error: errorCode(readError) }
  if (!listing) return { error: 'listing_missing' }

  const round = (value: number) => Math.round(value * 100) / 100
  // La base vérifie que la position est en Algérie (invalid_location).
  const { error } = await supabase.rpc('save_listing', {
    p_display_name: listing.display_name,
    p_category: listing.category,
    p_wilaya_code: listing.wilaya_code,
    p_commune: listing.commune ?? undefined,
    p_bio: listing.bio ?? undefined,
    p_skills: listing.skills ?? undefined,
    p_hourly_rate: listing.hourly_rate ?? undefined,
    p_radius_km: listing.radius_km,
    p_lat: position ? round(position.lat) : undefined,
    p_lng: position ? round(position.lng) : undefined,
    p_avatar_path: listing.avatar_path ?? undefined,
    p_cover_path: listing.cover_path ?? undefined,
  })
  if (error) return { error: errorCode(error) }
  refresh()
  return {}
}

export type PhotoResult = { error?: ErrorCode }

/**
 * Photo de profil ou de couverture, déjà envoyée par le navigateur (src/lib/photos.ts), ou null
 * pour la retirer. save_listing remplace toute la fiche : elle est relue et renvoyée à l'identique.
 */
export async function setListingPhoto(kind: 'avatar' | 'cover', path: string | null): Promise<PhotoResult> {
  if ((kind !== 'avatar' && kind !== 'cover') || (path !== null && typeof path !== 'string')) return { error: 'invalid_input' }
  const session = await getSession()
  if (!session) return { error: 'not_authenticated' }
  const supabase = await createClient()
  const { data: listing, error: readError } = await supabase
    .from('artisans')
    .select('display_name, category, wilaya_code, commune, bio, skills, hourly_rate, lat, lng, radius_km, avatar_path, cover_path')
    .eq('id', session.userId)
    .maybeSingle()
  if (readError) return { error: errorCode(readError) }
  if (!listing) return { error: 'listing_missing' }

  const previous = kind === 'avatar' ? listing.avatar_path : listing.cover_path
  const next = { ...listing, [kind === 'avatar' ? 'avatar_path' : 'cover_path']: path }
  const { error } = await supabase.rpc('save_listing', {
    p_display_name: next.display_name,
    p_category: next.category,
    p_wilaya_code: next.wilaya_code,
    p_commune: next.commune ?? undefined,
    p_bio: next.bio ?? undefined,
    p_skills: next.skills ?? undefined,
    p_hourly_rate: next.hourly_rate ?? undefined,
    p_radius_km: next.radius_km,
    p_lat: next.lat ?? undefined,
    p_lng: next.lng ?? undefined,
    p_avatar_path: next.avatar_path ?? undefined,
    p_cover_path: next.cover_path ?? undefined,
  })
  if (error) {
    // Refusée, la nouvelle photo ne sert à rien : elle ne reste pas dans le stockage.
    if (path && path !== previous) await removePhotos(supabase, [path])
    return { error: errorCode(error) }
  }
  if (previous && previous !== path) await removePhotos(supabase, [previous])
  refresh()
  return {}
}

/** Réalisation : légende et photos déjà envoyées. Refusée, ses photos sont retirées du stockage. */
export async function addPortfolioPost(caption: string, paths: string[]): Promise<PhotoResult> {
  if (typeof caption !== 'string' || !Array.isArray(paths) || paths.some(path => typeof path !== 'string')) return { error: 'invalid_input' }
  const supabase = await createClient()
  const { error } = await supabase.rpc('add_portfolio_post', { p_caption: caption, p_photos: paths })
  if (error) {
    await removePhotos(supabase, paths)
    return { error: errorCode(error) }
  }
  refresh()
  return {}
}

export async function deletePortfolioPost(id: string): Promise<PhotoResult> {
  if (!z.uuid().safeParse(id).success) return { error: 'not_found' }
  const session = await getSession()
  if (!session) return { error: 'not_authenticated' }
  const supabase = await createClient()
  // Les photos sont lues avant : une fois la réalisation supprimée, plus rien ne les nomme.
  const { data: post, error: readError } = await supabase.from('portfolio_posts').select('photos').eq('id', id).eq('artisan_id', session.userId).maybeSingle()
  if (readError) return { error: errorCode(readError) }
  if (!post) return { error: 'not_found' }
  const { error } = await supabase.rpc('delete_portfolio_post', { p_post_id: id })
  if (error) return { error: errorCode(error) }
  await removePhotos(supabase, post.photos)
  refresh()
  return {}
}

export type SubscriptionState = { error?: ErrorCode; done?: boolean }

/** Demander un abonnement (après avoir payé) ou annuler sa demande en attente. L'équipe valide dans le panneau admin. */
export async function subscriptionAction(_previous: SubscriptionState, formData: FormData): Promise<SubscriptionState> {
  const supabase = await createClient()
  let error: unknown = null
  if (field(formData, 'do') === 'cancel') {
    const id = field(formData, 'id')
    if (!z.uuid().safeParse(id).success) return { error: 'not_found' }
    ;({ error } = await supabase.rpc('cancel_subscription_request', { p_subscription_id: id }))
  } else {
    // Sans coordonnées de paiement publiées, une demande n'aurait rien à quoi correspondre.
    if (!PAYMENT_DETAILS) return { error: 'invalid_input' }
    ;({ error } = await supabase.rpc('request_subscription', {
      p_plan: field(formData, 'plan'),
      p_cycle: field(formData, 'cycle'),
      p_payment_method: field(formData, 'method'),
      p_payment_ref: field(formData, 'ref'),
    }))
  }
  if (error) return { error: errorCode(error) }
  refresh()
  return { done: true }
}
