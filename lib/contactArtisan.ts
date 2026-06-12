// lib/contactArtisan.ts
// Flux « contacter un artisan » partagé (accueil, profil artisan, carte).
// Une seule conversation par couple client/artisan : on réutilise la
// réservation active au lieu d'en créer une à chaque clic.

import { supabase } from './supabase'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ContactResult =
  | { ok: true; bookingId: string }
  | { ok: false; reason: 'demo' | 'error'; message: string }

export async function contactArtisan(opts: {
  clientId: string
  artisanId: string
  category?: string
  address?: string
  hourlyRate?: number
  type: 'message' | 'call'
}): Promise<ContactResult> {
  const { clientId, artisanId, category, address, hourlyRate, type } = opts

  // Les profils de démonstration (id d1…d12) n'existent pas en base.
  if (!UUID_RE.test(artisanId)) {
    return { ok: false, reason: 'demo', message: 'Ceci est un profil de démonstration. Choisissez un artisan avec le badge vérifié pour le contacter.' }
  }

  // Conversation existante ? On la reprend.
  const { data: existing } = await supabase
    .from('bookings')
    .select('id')
    .eq('client_id', clientId)
    .eq('artisan_id', artisanId)
    .in('status', ['pending', 'confirmed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let bookingId = existing?.id as string | undefined

  if (!bookingId) {
    // .select() pour récupérer directement l'id créé (la policy bookings_select
    // autorise le client à relire son propre booking). Évite une relecture
    // séparée qui pouvait échouer.
    const { data: created, error: insErr } = await supabase.from('bookings').insert({
      client_id: clientId,
      artisan_id: artisanId,
      category: category || 'autre',
      title: `Demande ${category || 'service'}`,
      description: type === 'call' ? 'Appel' : 'Message',
      address: address || '',
      scheduled_at: new Date().toISOString(),
      status: 'pending',
      price_agreed: hourlyRate || 0,
    }).select('id').single()
    if (insErr) return { ok: false, reason: 'error', message: 'Erreur : ' + insErr.message }
    bookingId = created?.id
  }

  if (!bookingId) return { ok: false, reason: 'error', message: "Impossible d'ouvrir la conversation, réessaie." }

  // Notification (fire & forget)
  supabase.from('notifications').insert({
    user_id: artisanId,
    type: type === 'call' ? 'call_request' : 'new_message',
    title: type === 'call' ? "Demande d'appel" : 'Nouveau message',
    message: 'Un client souhaite vous contacter.',
  }).then(() => {})

  return { ok: true, bookingId }
}
