'use client'

// app/facture/[bookingId]/page.tsx
// Facture BETI — imprimable / téléchargeable en PDF via le navigateur

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function pad(n: number) { return String(n).padStart(2, '0') }

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`
}

function generateFactureNumber(bookingId: string, date: string) {
  const d = new Date(date)
  return `BETI-${d.getFullYear()}-${pad(d.getMonth()+1)}-${bookingId.slice(0,6).toUpperCase()}`
}

export default function FacturePage() {
  const { bookingId } = useParams()
  const router = useRouter()
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          artisan:artisans(
            id, category, hourly_rate,
            profiles!artisans_id_fkey(full_name, phone, avatar_url)
          ),
          client:profiles!bookings_client_id_fkey(full_name, phone)
        `)
        .eq('id', bookingId)
        .single()

      if (error || !data) { setError('Facture introuvable'); setLoading(false); return }
      if (data.status !== 'completed') { setError("La mission n'est pas encore terminée"); setLoading(false); return }
      setBooking(data)
      setLoading(false)
    }
    load()
  }, [bookingId])

  const handlePrint = () => window.print()

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Nexa, sans-serif' }}>
      <div style={{ fontSize: 14, color: '#555' }}>Chargement de la facture...</div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Nexa, sans-serif', gap: 16 }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <div style={{ fontSize: 16, color: '#f87171', fontWeight: 800 }}>{error}</div>
      <button onClick={() => router.back()} style={{ padding: '10px 24px', background: '#C9A84C', border: 'none', borderRadius: 10, color: '#0D0D12', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif' }}>Retour</button>
    </div>
  )

  const artisan = booking.artisan
  const client = booking.client
  const artisanName = artisan?.profiles?.full_name || 'Artisan'
  const clientName = client?.full_name || 'Client'
  const factureNum = generateFactureNumber(booking.id, booking.created_at)
  const hourlyRate = artisan?.hourly_rate || 0
  const hours = booking.duration_hours || 1
  const subtotal = hourlyRate * hours
  const tva = 0 // Algérie : pas de TVA pour artisans individuels
  const total = subtotal + tva
  const category = artisan?.category || 'Service'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0D0D12;
          font-family: 'Inter', sans-serif;
          color: #111;
        }

        /* ── BARRE D'ACTION (cachée à l'impression) ── */
        .action-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: #161620;
          border-bottom: 0.5px solid #2a2a3a;
          padding: 14px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: 'Nexa', sans-serif;
        }

        .page-wrap {
          padding: 80px 40px 40px;
          display: flex;
          justify-content: center;
        }

        /* ── FACTURE ── */
        .invoice {
          width: 210mm;
          min-height: 297mm;
          background: #fff;
          padding: 16mm 18mm;
          position: relative;
          box-shadow: 0 8px 64px rgba(0,0,0,0.5);
        }

        /* Header */
        .inv-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10mm;
          padding-bottom: 8mm;
          border-bottom: 2px solid #C9A84C;
        }

        .inv-logo { display: flex; align-items: center; gap: 10px; }
        .inv-logo-box {
          width: 44px; height: 44px;
          background: #C9A84C;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; font-weight: 700; color: #fff;
        }
        .inv-logo-name { font-size: 22px; font-weight: 700; color: #111; letter-spacing: .05em; }
        .inv-logo-sub { font-size: 11px; color: #888; font-weight: 400; margin-top: 2px; }

        .inv-meta { text-align: right; }
        .inv-title { font-size: 28px; font-weight: 700; color: #C9A84C; letter-spacing: .05em; }
        .inv-num { font-size: 13px; color: #888; margin-top: 4px; font-weight: 400; }
        .inv-date { font-size: 12px; color: #888; margin-top: 2px; }

        /* Parties */
        .inv-parties {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12mm;
          margin-bottom: 10mm;
        }

        .inv-party-label {
          font-size: 9px;
          font-weight: 600;
          color: #C9A84C;
          letter-spacing: .12em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .inv-party-name { font-size: 16px; font-weight: 600; color: #111; margin-bottom: 4px; }
        .inv-party-info { font-size: 12px; color: #666; line-height: 1.6; }

        /* Badge statut */
        .inv-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: #f0fdf4;
          border: 1px solid #86efac;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          color: #16a34a;
          margin-bottom: 8mm;
        }

        /* Table */
        .inv-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8mm;
        }

        .inv-table th {
          background: #fafafa;
          border-bottom: 1px solid #e5e5e5;
          padding: 10px 14px;
          text-align: left;
          font-size: 10px;
          font-weight: 600;
          color: #888;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .inv-table th:last-child, .inv-table td:last-child { text-align: right; }

        .inv-table td {
          padding: 14px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 13px;
          color: #333;
          vertical-align: top;
        }

        .inv-table td:first-child { font-weight: 500; color: #111; }

        /* Totaux */
        .inv-totals {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 10mm;
        }

        .inv-totals-box { width: 260px; }

        .inv-total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 13px;
          color: #555;
          border-bottom: 1px solid #f0f0f0;
        }

        .inv-total-final {
          display: flex;
          justify-content: space-between;
          padding: 12px 0 8px;
          font-size: 17px;
          font-weight: 700;
          color: #111;
          border-top: 2px solid #111;
          margin-top: 4px;
        }

        .inv-total-final .amount { color: #C9A84C; }

        /* Paiement */
        .inv-payment {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 10px;
          padding: 14px 18px;
          margin-bottom: 8mm;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .inv-payment-icon { font-size: 22px; flex-shrink: 0; }
        .inv-payment-title { font-size: 13px; font-weight: 600; color: #92400e; margin-bottom: 2px; }
        .inv-payment-desc { font-size: 11px; color: #b45309; }

        /* Footer */
        .inv-footer {
          border-top: 1px solid #e5e5e5;
          padding-top: 6mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .inv-footer-left { font-size: 11px; color: #aaa; line-height: 1.6; }
        .inv-footer-brand { font-size: 12px; font-weight: 600; color: #C9A84C; }

        /* Filigrane */
        .inv-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-35deg);
          font-size: 120px;
          font-weight: 700;
          color: #C9A84C;
          opacity: 0.03;
          pointer-events: none;
          letter-spacing: .2em;
          white-space: nowrap;
        }

        /* ── IMPRESSION ── */
        @media print {
          body { background: #fff !important; }
          .action-bar { display: none !important; }
          .page-wrap { padding: 0 !important; }
          .invoice {
            box-shadow: none !important;
            width: 100% !important;
            padding: 12mm 16mm !important;
          }

          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>

      {/* Barre d'action — cachée à l'impression */}
      <div className="action-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()}
            style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, padding: 4 }}>←</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: '#C9A84C', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#0D0D12' }}>B</div>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8' }}>Facture {factureNum}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handlePrint}
            style={{ padding: '10px 20px', borderRadius: 10, background: '#C9A84C', border: 'none', color: '#0D0D12', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D0D12" strokeWidth="2.5"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
            Imprimer / Télécharger PDF
          </button>
        </div>
      </div>

      {/* Facture */}
      <div className="page-wrap">
        <div className="invoice">
          <div className="inv-watermark">BETI</div>

          {/* En-tête */}
          <div className="inv-header">
            <div className="inv-logo">
              <div className="inv-logo-box">B</div>
              <div>
                <div className="inv-logo-name">BETI</div>
                <div className="inv-logo-sub">Services à domicile · Algérie</div>
              </div>
            </div>
            <div className="inv-meta">
              <div className="inv-title">FACTURE</div>
              <div className="inv-num">{factureNum}</div>
              <div className="inv-date">Émise le {formatDate(booking.completed_at || booking.updated_at || booking.created_at)}</div>
            </div>
          </div>

          {/* Parties */}
          <div className="inv-parties">
            <div>
              <div className="inv-party-label">Prestataire</div>
              <div className="inv-party-name">{artisanName}</div>
              <div className="inv-party-info">
                {category.charAt(0).toUpperCase() + category.slice(1)}<br/>
                {artisan?.profiles?.phone && <>{artisan.profiles.phone}<br/></>}
                Artisan certifié BETI
              </div>
            </div>
            <div>
              <div className="inv-party-label">Client</div>
              <div className="inv-party-name">{clientName}</div>
              <div className="inv-party-info">
                {client?.phone && <>{client.phone}<br/></>}
                {booking.address && <>{booking.address}<br/></>}
                Algérie
              </div>
            </div>
          </div>

          {/* Statut */}
          <div className="inv-status">
            <span>✓</span>
            Mission terminée · Paiement reçu
          </div>

          {/* Tableau prestations */}
          <table className="inv-table">
            <thead>
              <tr>
                <th>Prestation</th>
                <th>Date</th>
                <th>Durée</th>
                <th>Prix unitaire</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style={{ fontWeight: 600, color: '#111', marginBottom: 3 }}>{booking.title || `Intervention ${category}`}</div>
                  {booking.description && <div style={{ fontSize: 12, color: '#888', fontWeight: 400, lineHeight: 1.5 }}>{booking.description}</div>}
                </td>
                <td style={{ color: '#555' }}>{formatDate(booking.booking_date || booking.created_at)}</td>
                <td style={{ color: '#555' }}>{hours}h</td>
                <td style={{ color: '#555' }}>{hourlyRate.toLocaleString('fr-DZ')} DA/h</td>
                <td style={{ fontWeight: 600, color: '#111' }}>{subtotal.toLocaleString('fr-DZ')} DA</td>
              </tr>
              {booking.travel_fee > 0 && (
                <tr>
                  <td>Frais de déplacement</td>
                  <td>—</td>
                  <td>—</td>
                  <td>{booking.travel_fee.toLocaleString('fr-DZ')} DA</td>
                  <td style={{ fontWeight: 600 }}>{booking.travel_fee.toLocaleString('fr-DZ')} DA</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totaux */}
          <div className="inv-totals">
            <div className="inv-totals-box">
              <div className="inv-total-row">
                <span>Sous-total</span>
                <span>{subtotal.toLocaleString('fr-DZ')} DA</span>
              </div>
              <div className="inv-total-row">
                <span>TVA (exonéré)</span>
                <span>0 DA</span>
              </div>
              {booking.travel_fee > 0 && (
                <div className="inv-total-row">
                  <span>Frais déplacement</span>
                  <span>{booking.travel_fee.toLocaleString('fr-DZ')} DA</span>
                </div>
              )}
              <div className="inv-total-final">
                <span>TOTAL TTC</span>
                <span className="amount">{total.toLocaleString('fr-DZ')} DA</span>
              </div>
            </div>
          </div>

          {/* Mode de paiement */}
          <div className="inv-payment">
            <div className="inv-payment-icon">💵</div>
            <div>
              <div className="inv-payment-title">Paiement en espèces</div>
              <div className="inv-payment-desc">Règlement effectué directement à l'artisan lors de l'intervention · Référence : {factureNum}</div>
            </div>
          </div>

          {/* Footer */}
          <div className="inv-footer">
            <div className="inv-footer-left">
              <div className="inv-footer-brand">BETI — Plateforme de services à domicile</div>
              <div>beti.dz · contact@beti.dz · Algérie 🇩🇿</div>
              <div style={{ marginTop: 4 }}>Document généré le {formatDate(new Date().toISOString())} · Facture non soumise à TVA (artisan individuel)</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>Certifié par</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                <div style={{ width: 24, height: 24, background: '#C9A84C', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>B</div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C' }}>BETI CERTIFIÉ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
