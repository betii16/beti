// app/api/cron/release-escrow/route.ts
// Libération automatique du séquestre.
//
// PROBLÈME résolu : après un paiement carte, le booking passe « in_progress »
// (argent bloqué chez BETI) et n'est libéré que quand le CLIENT confirme la
// prestation. Si le client oublie de confirmer, l'argent — et donc le
// reversement à l'artisan — reste bloqué indéfiniment.
//
// SOLUTION : ce cron clôt automatiquement les séquestres dont le paiement a été
// encaissé il y a plus de ESCROW_RELEASE_DAYS jours (défaut 3) et dont le
// booking est toujours « in_progress ». Le booking passe « completed »
// (déverrouille l'avis + compte comme revenu), exactement comme une
// confirmation manuelle.
//
// Sécurité : protégé par CRON_SECRET. Vercel Cron envoie automatiquement
// l'en-tête « Authorization: Bearer <CRON_SECRET> » quand la variable est définie.
// Planifié dans vercel.json (quotidien).

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RELEASE_DAYS = Number(process.env.ESCROW_RELEASE_DAYS || 3)

export async function GET(req: NextRequest) {
  // Garde d'accès : si CRON_SECRET est défini, on exige le bon jeton.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }
  }

  const admin = getAdminClient()
  const cutoff = new Date(Date.now() - RELEASE_DAYS * 86400000).toISOString()

  // Paiements encaissés depuis > RELEASE_DAYS dont le booking est encore en
  // séquestre. L'embed !inner filtre sur le statut du booking côté base.
  const { data: due, error } = await admin
    .from('payments')
    .select('booking_id, paid_at, bookings!inner(status)')
    .eq('status', 'paid')
    .lt('paid_at', cutoff)
    .eq('bookings.status', 'in_progress')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const ids = Array.from(new Set((due || []).map((d: any) => d.booking_id)))
  if (ids.length === 0) {
    return NextResponse.json({ released: 0 })
  }

  const { error: upErr } = await admin
    .from('bookings')
    .update({ status: 'completed' })
    .in('id', ids)
    .eq('status', 'in_progress') // garde-fou anti-course

  if (upErr) {
    return NextResponse.json({ error: upErr.message, attempted: ids.length }, { status: 500 })
  }

  return NextResponse.json({ released: ids.length, after_days: RELEASE_DAYS })
}
