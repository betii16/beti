// app/api/payment/init/route.ts
// Démarre un paiement carte : authentifie le client, crée la commande chez
// SATIM, enregistre une ligne `payments` (pending), renvoie l'URL de la page
// de paiement SATIM vers laquelle le navigateur sera redirigé.
//
// Auth : l'app stocke la session Supabase dans localStorage (pas en cookie),
// donc le client envoie son access_token en `Authorization: Bearer <token>`.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminClient } from '@/lib/supabaseAdmin'
import { satimRegister, satimConfigured } from '@/lib/satim'
import { clientCharge, commissionFor, artisanPayout } from '@/lib/payment-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function siteUrl(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || new URL(req.url).origin
}

async function userFromRequest(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return null
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  )
  const { data, error } = await anon.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}

export async function POST(req: NextRequest) {
  if (!satimConfigured()) {
    return NextResponse.json({ error: 'Le paiement par carte n’est pas encore activé.' }, { status: 503 })
  }

  const userId = await userFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  let bookingId = ''
  try { bookingId = (await req.json())?.bookingId || '' } catch {}
  if (!bookingId) return NextResponse.json({ error: 'bookingId manquant.' }, { status: 400 })

  const admin = getAdminClient()

  // On lit le booking côté serveur : on ne fait jamais confiance au montant
  // envoyé par le client.
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, client_id, artisan_id, title, status, price_agreed')
    .eq('id', bookingId)
    .single()

  if (bErr || !booking) return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 })
  if (booking.client_id !== userId) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const amount = Number(booking.price_agreed || 0)
  if (amount <= 0) return NextResponse.json({ error: 'Montant invalide pour cette réservation.' }, { status: 400 })
  if (!['pending', 'confirmed'].includes(booking.status)) {
    return NextResponse.json({ error: 'Cette réservation ne peut pas être payée.' }, { status: 409 })
  }

  const charge     = clientCharge(amount)
  const commission = commissionFor(amount)
  const payout     = artisanPayout(amount)
  const orderNumber = 'BTI' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

  // Ligne de paiement en attente AVANT l'appel SATIM (trace même si l'utilisateur
  // abandonne sur la page SATIM).
  const { data: pay, error: pErr } = await admin.from('payments').insert({
    booking_id:     booking.id,
    client_id:      booking.client_id,
    artisan_id:     booking.artisan_id,
    amount:         charge,
    commission,
    artisan_amount: payout,
    method:         'cib',
    order_number:   orderNumber,
    status:         'pending',
  }).select('id').single()

  if (pErr || !pay) {
    return NextResponse.json({ error: 'Erreur d’enregistrement du paiement.' }, { status: 500 })
  }

  const base = siteUrl(req)
  const returnUrl = `${base}/api/payment/callback?pid=${pay.id}`

  const reg = await satimRegister({
    orderNumber,
    amountDA:    charge,
    returnUrl,
    description: (booking.title || 'Service BETI').slice(0, 60),
    language:    'fr',
  })

  if (!reg.ok) {
    await admin.from('payments').update({ status: 'failed', error: reg.error }).eq('id', pay.id)
    return NextResponse.json({ error: reg.error }, { status: 502 })
  }

  await admin.from('payments').update({ satim_order_id: reg.orderId }).eq('id', pay.id)

  return NextResponse.json({ formUrl: reg.formUrl })
}
