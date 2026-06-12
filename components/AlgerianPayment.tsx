'use client'

// components/AlgerianPayment.tsx
// Modal de paiement BETI.
//  - CARTE (CIB / Edahabia) : flux RÉEL via SATIM. On NE saisit JAMAIS la carte
//    ici — on appelle /api/payment/init puis on redirige vers la page sécurisée
//    SATIM. Le retour est géré par /api/payment/callback → /paiement/retour.
//  - CASH : confirmation locale (aucune commission, aucun encaissement).

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, CreditCard, Banknote, X, Shield } from 'lucide-react'
import { commissionFor, clientCharge, COMMISSION_ON_TOP } from '@/lib/payment-config'

type PayMethod = 'card' | 'cash'

export function AlgerianPayment({
  amount,
  artisanName,
  serviceTitle,
  bookingId,
  onSuccess,
  onClose,
}: {
  amount: number
  artisanName: string
  serviceTitle: string
  bookingId: string
  onSuccess: () => void
  onClose: () => void
}) {
  const [method, setMethod] = useState<PayMethod>('card')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [refNum, setRefNum] = useState('')
  const [err, setErr] = useState('')

  const commission = commissionFor(amount)
  const total = clientCharge(amount)

  // ── CARTE : init serveur → redirection SATIM ──────────────────────────────
  const payCard = async () => {
    setLoading(true); setErr('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setErr('Session expirée, reconnecte-toi.'); setLoading(false); return }
      const res = await fetch('/api/payment/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ bookingId }),
      })
      const data = await res.json()
      if (!res.ok || !data.formUrl) { setErr(data.error || 'Le paiement par carte est momentanément indisponible.'); setLoading(false); return }
      // Redirection vers la page de paiement hébergée SATIM.
      window.location.href = data.formUrl
    } catch (e: any) {
      setErr(e?.message || 'Erreur réseau.'); setLoading(false)
    }
  }

  // ── CASH : confirmation locale ────────────────────────────────────────────
  const cashConfirm = async () => {
    setLoading(true); setErr('')
    await new Promise(r => setTimeout(r, 500))
    setRefNum('BETI-CASH-' + Date.now().toString(36).toUpperCase())
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId)
    setLoading(false); setDone(true)
    setTimeout(onSuccess, 2000)
  }

  if (done) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 300 }}>
      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 20, padding: '48px 36px', maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '0.5px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={32} color="#10b981" />
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>Réservation confirmée !</div>
        <div style={{ fontSize: 13, color: 'var(--tx3)', fontWeight: 300, marginBottom: 20 }}>
          Payez {amount.toLocaleString('fr-DZ')} DA directement à {artisanName} après la prestation.
        </div>
        <div style={{ padding: '10px 16px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>Référence :</span>
          <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 800, letterSpacing: '0.04em' }}>{refNum}</span>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 300, overflowY: 'auto' }}>
      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 20, padding: '32px', maxWidth: 460, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)' }}>Paiement sécurisé</div>
              <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>BETI · Algérie</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Récap */}
        <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)', marginBottom: 2 }}>{serviceTitle}</div>
              <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>avec {artisanName}</div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#6366f1' }}>{amount.toLocaleString('fr-DZ')} <span style={{ fontSize: 11, fontWeight: 300, color: 'var(--tx3)' }}>DA</span></div>
          </div>
          {/* La commission n'est montrée au client QUE si elle est ajoutée à sa
              note (COMMISSION_ON_TOP). En modèle « déduite de l'artisan » (défaut),
              le client paie le prix affiché et ne voit aucune ligne commission. */}
          {method === 'card' && COMMISSION_ON_TOP && commission > 0 && (
            <>
              <div style={{ height: '0.5px', background: 'var(--border)', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>Commission BETI (10%)</span>
                <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>{commission.toLocaleString('fr-DZ')} DA</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)' }}>Total à payer</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#6366f1' }}>{total.toLocaleString('fr-DZ')} DA</span>
              </div>
            </>
          )}
        </div>

        {/* Sélecteur de méthode */}
        <div style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 10 }}>MODE DE PAIEMENT</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {([
            { id: 'card', label: 'Carte', sub: 'CIB / Edahabia', Icon: CreditCard },
            { id: 'cash', label: 'Cash', sub: 'À la prestation', Icon: Banknote },
          ] as const).map(m => (
            <button key={m.id} onClick={() => { setMethod(m.id); setErr('') }}
              style={{
                padding: '14px 8px', borderRadius: 12, cursor: 'pointer',
                background: method === m.id ? 'rgba(99,102,241,0.08)' : 'var(--bg)',
                border: `0.5px solid ${method === m.id ? '#6366f1' : 'var(--border)'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                transition: 'all 0.15s', fontFamily: 'Nexa, sans-serif',
              }}>
              <m.Icon size={18} color={method === m.id ? '#6366f1' : 'var(--tx2)'} />
              <div style={{ fontSize: 12, fontWeight: 800, color: method === m.id ? '#6366f1' : 'var(--tx)' }}>{m.label}</div>
              <div style={{ fontSize: 10, color: 'var(--tx3)', fontWeight: 300 }}>{m.sub}</div>
            </button>
          ))}
        </div>

        {/* Explication selon la méthode */}
        {method === 'card' ? (
          <div style={{ background: 'rgba(99,102,241,0.06)', border: '0.5px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
              Réseau SATIM · CIB / Edahabia
            </div>
            <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 300, lineHeight: 1.6 }}>
              Tu vas être redirigé vers la page de paiement sécurisée de SATIM pour saisir ta carte. BETI ne voit jamais tes données bancaires.
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(16,185,129,0.06)', border: '0.5px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981', marginBottom: 6 }}>Paiement en main propre</div>
            <div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300, lineHeight: 1.6 }}>
              Tu paies <strong style={{ color: 'var(--tx)' }}>{amount.toLocaleString('fr-DZ')} DA</strong> directement à <strong style={{ color: 'var(--tx)' }}>{artisanName}</strong> après la prestation, en cash. La réservation est confirmée immédiatement.
            </div>
          </div>
        )}

        {err && (
          <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: '#ef444412', border: '1px solid #ef444422', fontSize: 12, color: '#ef4444' }}>{err}</div>
        )}

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '13px', background: 'transparent', border: '0.5px solid var(--border)', borderRadius: 10, color: 'var(--tx3)', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>
            Annuler
          </button>
          <button
            onClick={method === 'cash' ? cashConfirm : payCard}
            disabled={loading}
            style={{
              flex: 2, padding: '13px',
              background: loading ? 'var(--border)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              border: 'none', borderRadius: 10,
              color: loading ? 'var(--tx3)' : '#fff',
              fontSize: 13, fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s',
            }}>
            {loading ? 'Traitement...' : method === 'cash' ? 'Confirmer la réservation' : `Payer ${total.toLocaleString('fr-DZ')} DA par carte`}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 10, color: 'var(--tx3)', fontWeight: 300 }}>
          🔒 Paiement sécurisé via SATIM — tes données bancaires ne transitent jamais par BETI
        </div>
      </div>
    </div>
  )
}
