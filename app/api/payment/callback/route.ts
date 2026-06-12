// app/api/payment/callback/route.ts
// Retour depuis la page SATIM. C'est ICI qu'on établit la vérité : on
// interroge SATIM (confirmOrder) côté serveur — on ne se fie JAMAIS aux
// paramètres de l'URL pour dire « payé ». Puis on met à jour payment + booking
// et on redirige le client vers une page de résultat lisible.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabaseAdmin'
import { satimConfirm } from '@/lib/satim'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function siteUrl(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || new URL(req.url).origin
}

export async function GET(req: NextRequest) {
  const base = siteUrl(req)
  const pid = new URL(req.url).searchParams.get('pid') || ''
  const result = (status: 'ok' | 'ko', bookingId = '') =>
    NextResponse.redirect(`${base}/paiement/retour?status=${status}${bookingId ? `&booking=${bookingId}` : ''}`)

  if (!pid) return result('ko')

  const admin = getAdminClient()
  const { data: pay } = await admin
    .from('payments')
    .select('id, booking_id, satim_order_id, status')
    .eq('id', pid)
    .single()

  if (!pay) return result('ko')

  // Idempotence : si déjà traité, on ne rejoue pas la mise à jour.
  if (pay.status === 'paid') return result('ok', pay.booking_id)
  if (!pay.satim_order_id)   return result('ko', pay.booking_id)

  const conf = await satimConfirm(pay.satim_order_id)

  if (conf.ok && conf.paid) {
    await admin.from('payments').update({
      status: 'paid', paid_at: new Date().toISOString(), error: null,
    }).eq('id', pay.id)
    // Paiement encaissé → SÉQUESTRE : l'argent est bloqué chez BETI. La
    // réservation passe « in_progress » (argent protégé) et NON « completed ».
    // C'est le client qui libère le versement en confirmant la prestation dans
    // le chat (→ status 'completed', ce qui déverrouille l'avis + la facture).
    // Le reversement à l'artisan reste payout_status='pending' jusqu'à virement.
    await admin.from('bookings').update({ status: 'in_progress' }).eq('id', pay.booking_id)
    return result('ok', pay.booking_id)
  }

  // orderStatus SATIM : 0/1/5 = encore en cours, 3/4/6 = refusé/annulé.
  // On ne marque « failed » QUE sur un refus définitif — sinon on laisse
  // « pending » pour ne pas casser un paiement encore en cours (callback rejoué).
  const terminalFail = conf.ok && [3, 4, 6].includes(conf.orderStatus)
  if (!conf.ok || terminalFail) {
    await admin.from('payments').update({
      status: 'failed',
      error:  conf.ok ? (conf.description || `Paiement refusé (statut ${conf.orderStatus})`) : conf.error,
    }).eq('id', pay.id)
  }
  return result('ko', pay.booking_id)
}
