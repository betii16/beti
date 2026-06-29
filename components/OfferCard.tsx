'use client'

// components/OfferCard.tsx
// Carte d'offre affichée dans la timeline du chat (façon Vinted).
// Le destinataire d'une offre « pending » voit les actions (accepter / contre / refuser).

import { CheckCircle2, XCircle, Tag } from 'lucide-react'

export type Offer = {
  id: string
  booking_id: string
  sender_id: string
  amount: number
  status: 'pending' | 'accepted' | 'declined' | 'superseded'
  created_at: string
}

export function OfferCard({
  offer, mine, isClient, t,
  onAccept, onCounter, onDecline,
}: {
  offer: Offer
  mine: boolean            // true = je suis l'auteur de l'offre
  isClient: boolean        // true = je suis le client de la réservation
  t: (k: string) => string
  onAccept: () => void
  onCounter: () => void
  onDecline: () => void
}) {
  const amount = offer.amount.toLocaleString('fr-DZ')
  const pending = offer.status === 'pending'
  const accepted = offer.status === 'accepted'
  const declined = offer.status === 'declined'
  const superseded = offer.status === 'superseded'

  const accent = accepted ? '#10b981' : declined ? '#ef4444' : '#5A3DF0'

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
      <div style={{
        width: '100%', maxWidth: 320, background: 'var(--bg2)',
        border: `1.5px solid ${pending ? accent + '55' : 'var(--border)'}`,
        borderRadius: 16, padding: '14px 16px', opacity: superseded ? 0.5 : 1,
      }}>
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Tag size={14} color={accent} />
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--tx2)', letterSpacing: '0.04em' }}>
            {mine ? t('offer.fromYou') : t('offer.offerLabel')}
          </span>
          <span style={{ marginInlineStart: 'auto', fontSize: 10.5, fontWeight: 700, color: accent }}>
            {pending ? t('offer.statusPending') : accepted ? t('offer.statusAccepted') : declined ? t('offer.statusDeclined') : t('offer.statusSuperseded')}
          </span>
        </div>

        {/* Montant */}
        <div style={{ textAlign: 'center', marginBottom: pending && !mine ? 14 : 4 }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--tx)' }}>{amount}</span>
          <span style={{ fontSize: 13, fontWeight: 300, color: 'var(--tx3)' }}> {t('common.da')}</span>
        </div>

        {/* Actions (destinataire d'une offre en attente) */}
        {pending && !mine && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={onAccept} style={{ width: '100%', padding: '12px', borderRadius: 11, background: 'linear-gradient(135deg,#5A3DF0,#7C5CFF)', border: 'none', color: '#fff', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa,sans-serif', boxShadow: '0 4px 14px #5A3DF033' }}>
              {isClient ? t('offer.acceptPay') : t('offer.accept')}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onCounter} style={{ flex: 1, padding: '10px', borderRadius: 11, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--tx)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'Nexa,sans-serif' }}>
                {t('offer.counter')}
              </button>
              <button onClick={onDecline} style={{ flex: 1, padding: '10px', borderRadius: 11, background: 'transparent', border: '1px solid var(--border)', color: 'var(--tx3)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'Nexa,sans-serif' }}>
                {t('offer.decline')}
              </button>
            </div>
          </div>
        )}

        {/* Mon offre en attente */}
        {pending && mine && (
          <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--tx3)', fontWeight: 300 }}>{t('offer.statusPending')}…</div>
        )}

        {/* Issue */}
        {(accepted || declined) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: accent, marginTop: 6 }}>
            {accepted ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {accepted ? t('offer.statusAccepted') : t('offer.statusDeclined')}
          </div>
        )}
      </div>
    </div>
  )
}
