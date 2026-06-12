'use client'

// app/paiement/retour/page.tsx
// Page de résultat après le retour de SATIM. Le statut a déjà été établi de
// façon fiable par /api/payment/callback ; ici on ne fait qu'AFFICHER le
// résultat et proposer de revenir à la conversation.

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2, XCircle } from 'lucide-react'

function Result() {
  const sp = useSearchParams()
  const router = useRouter()
  const ok = sp.get('status') === 'ok'
  const booking = sp.get('booking') || ''

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: 80 }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, padding: '44px 32px', maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {ok ? <CheckCircle2 size={32} color="#10b981" /> : <XCircle size={32} color="#ef4444" />}
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>
          {ok ? 'Paiement réussi !' : 'Paiement non abouti'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--tx3)', fontWeight: 300, marginBottom: 24, lineHeight: 1.6 }}>
          {ok
            ? 'Votre paiement a bien été encaissé. Votre artisan en est informé.'
            : 'Le paiement n’a pas été finalisé. Aucun montant n’a été débité — vous pouvez réessayer.'}
        </div>
        <button
          onClick={() => router.push(booking ? `/chat/${booking}` : '/mon-espace/reservations')}
          style={{ width: '100%', padding: 14, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa,sans-serif' }}>
          {booking ? 'Revenir à la conversation' : 'Mes réservations'}
        </button>
      </div>
    </div>
  )
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg)' }} />}>
      <Result />
    </Suspense>
  )
}
