'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, CreditCard, Wallet, Banknote, X, Shield } from 'lucide-react'

type PayMethod = 'cib' | 'edahabia' | 'cash'

function formatCardNumber(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4)
  return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d
}
function formatCCP(v: string) {
  return v.replace(/\D/g, '').slice(0, 20).replace(/(.{5})/g, '$1 ').trim()
}

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
  const [method, setMethod] = useState<PayMethod>('cib')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [refNum, setRefNum] = useState('')

  // CIB fields
  const [cardNum, setCardNum] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [cardName, setCardName] = useState('')

  // Edahabia fields
  const [ccp, setCcp] = useState('')
  const [nin, setNin] = useState('')

  const commission = Math.round(amount * 0.05)
  const total = amount + commission

  const pay = async () => {
    setLoading(true)
    // Simulate payment processing delay
    await new Promise(r => setTimeout(r, 1400))
    const ref = 'BETI-' + Date.now().toString(36).toUpperCase()
    setRefNum(ref)
    // Update booking status to confirmed
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId)
    // Notifier l'ARTISAN (user_id = son id, pas l'id de la réservation).
    const { data: bk } = await supabase.from('bookings').select('artisan_id').eq('id', bookingId).single()
    if (bk?.artisan_id) {
      await supabase.from('notifications').insert({
        user_id: bk.artisan_id,
        type: 'booking_confirmed',
        title: 'Paiement reçu',
        message: `Paiement de ${total.toLocaleString('fr-DZ')} DA confirmé — ${serviceTitle}`,
      })
    }
    setLoading(false)
    setDone(true)
    setTimeout(onSuccess, 2200)
  }

  const cashConfirm = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    const ref = 'BETI-CASH-' + Date.now().toString(36).toUpperCase()
    setRefNum(ref)
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId)
    setLoading(false)
    setDone(true)
    setTimeout(onSuccess, 2200)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    background: 'var(--bg)', border: '0.5px solid var(--border)',
    borderRadius: 10, color: 'var(--tx)', fontSize: 14,
    outline: 'none', fontFamily: 'Nexa, sans-serif', fontWeight: 300,
    transition: 'border-color 0.2s',
  }

  if (done) return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, zIndex: 300,
    }}>
      <div style={{
        background: 'var(--bg2)', border: '0.5px solid var(--border)',
        borderRadius: 20, padding: '48px 36px', maxWidth: 400, width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '0.5px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={32} color="#10b981" />
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>
          {method === 'cash' ? 'Réservation confirmée !' : 'Paiement réussi !'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--tx3)', fontWeight: 300, marginBottom: 20 }}>
          {method === 'cash'
            ? `Payez ${amount.toLocaleString('fr-DZ')} DA directement à ${artisanName} après la prestation.`
            : `${total.toLocaleString('fr-DZ')} DA débités. Votre artisan va vous contacter.`}
        </div>
        <div style={{ padding: '10px 16px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>Référence :</span>
          <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 800, letterSpacing: '0.04em' }}>{refNum}</span>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, zIndex: 300, overflowY: 'auto',
    }}>
      <div style={{
        background: 'var(--bg2)', border: '0.5px solid var(--border)',
        borderRadius: 20, padding: '32px', maxWidth: 460, width: '100%',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)', marginBottom: 2 }}>{serviceTitle}</div>
              <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>avec {artisanName}</div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#6366f1' }}>{amount.toLocaleString('fr-DZ')} <span style={{ fontSize: 11, fontWeight: 300, color: 'var(--tx3)' }}>DA</span></div>
          </div>
          {method !== 'cash' && (
            <>
              <div style={{ height: '0.5px', background: 'var(--border)', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>Commission BETI (5%)</span>
                <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300 }}>{commission.toLocaleString('fr-DZ')} DA</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)' }}>Total</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#6366f1' }}>{total.toLocaleString('fr-DZ')} DA</span>
              </div>
            </>
          )}
        </div>

        {/* Sélecteur de méthode */}
        <div style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 10 }}>MODE DE PAIEMENT</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 24 }}>
          {([
            { id: 'cib',       label: 'CIB',       sub: 'Carte bancaire', Icon: CreditCard },
            { id: 'edahabia', label: 'Edahabia',  sub: 'Algérie Poste',  Icon: Wallet },
            { id: 'cash',      label: 'Cash',      sub: 'À la prestation', Icon: Banknote },
          ] as const).map(m => (
            <button key={m.id} onClick={() => setMethod(m.id)}
              style={{
                padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
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

        {/* Formulaire CIB */}
        {method === 'cib' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
              Paiement via réseau SATIM · CIB / DAHABIA
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>NOM SUR LA CARTE</label>
              <input value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())} placeholder="PRÉNOM NOM" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>NUMÉRO DE CARTE</label>
              <input value={cardNum} onChange={e => setCardNum(formatCardNumber(e.target.value))} placeholder="0000 0000 0000 0000" maxLength={19} style={{ ...inputStyle, letterSpacing: '0.12em', fontFamily: 'monospace' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>EXPIRATION</label>
                <input value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))} placeholder="MM/AA" maxLength={5} style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.06em' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>CVV</label>
                <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="123" maxLength={3} type="password" style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.1em' }} />
              </div>
            </div>
          </div>
        )}

        {/* Formulaire Edahabia */}
        {method === 'edahabia' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 300, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
              Paiement via BaridiPay · Algérie Poste
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>NUMÉRO CCP</label>
              <input value={ccp} onChange={e => setCcp(formatCCP(e.target.value))} placeholder="00000 00000 00000 00000" maxLength={24} style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.06em' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 800, letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>NIN (Numéro d'Identification National)</label>
              <input value={nin} onChange={e => setNin(e.target.value.replace(/\D/g, '').slice(0, 18))} placeholder="18 chiffres" maxLength={18} style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.06em' }} />
            </div>
          </div>
        )}

        {/* Cash */}
        {method === 'cash' && (
          <div style={{ background: 'rgba(16,185,129,0.06)', border: '0.5px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981', marginBottom: 6 }}>Paiement en main propre</div>
            <div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 300, lineHeight: 1.6 }}>
              Vous payez <strong style={{ color: 'var(--tx)' }}>{amount.toLocaleString('fr-DZ')} DA</strong> directement à <strong style={{ color: 'var(--tx)' }}>{artisanName}</strong> après la prestation, en cash. La réservation est confirmée immédiatement.
            </div>
          </div>
        )}

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '13px', background: 'transparent', border: '0.5px solid var(--border)', borderRadius: 10, color: 'var(--tx3)', fontSize: 13, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>
            Annuler
          </button>
          <button
            onClick={method === 'cash' ? cashConfirm : pay}
            disabled={loading || (method === 'cib' && (!cardNum || !expiry || !cvv || !cardName)) || (method === 'edahabia' && (!ccp || nin.length < 18))}
            style={{
              flex: 2, padding: '13px',
              background: loading ? 'var(--border)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              border: 'none', borderRadius: 10,
              color: loading ? 'var(--tx3)' : '#fff',
              fontSize: 13, fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s',
            }}>
            {loading ? 'Traitement...' : method === 'cash' ? 'Confirmer la réservation' : `Payer ${total.toLocaleString('fr-DZ')} DA`}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 10, color: 'var(--tx3)', fontWeight: 300 }}>
          🔒 Paiement sécurisé — vos données ne sont jamais stockées
        </div>
      </div>
    </div>
  )
}
