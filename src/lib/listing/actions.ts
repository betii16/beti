'use server'

// Fiche de l'artisan : la remplir, donner son numéro, la publier, se dire
// disponible. La base revérifie tout (qui appelle, longueurs, bornes) ; ces
// actions mettent en forme et rendent la saisie à l'écran en cas de refus.

import { refresh } from 'next/cache'
import { normalizePhone, parseSkills } from '@/domain/listing'
import { getSession } from '@/lib/auth/session'
import { errorCode, type ErrorCode } from '@/lib/errors'
import { field } from '@/lib/form'
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

export type StepState = { error?: ErrorCode; phone?: string }

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
  return {}
}
