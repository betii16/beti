'use client'

// app/facture/[bookingId]/page.tsx
// Facture BETI — imprimable / téléchargeable en PDF via le navigateur

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchPhones } from '@/lib/phones'
import { SkeletonPage } from '@/components/Skeleton'
import { AlertTriangle, Banknote, Check, ArrowLeft, Printer } from 'lucide-react'
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
          artisan_profile:profiles!bookings_artisan_id_fkey(full_name, phone, avatar_url),
          client:profiles!bookings_client_id_fkey(full_name, phone)
        `)
        .eq('id', bookingId)
        .single()

      if (error || !data) { setError('Facture introuvable'); setLoading(false); return }
      if (data.status !== 'completed') { setError("La mission n'est pas encore terminée"); setLoading(false); return }
      // bookings.artisan_id référence profiles : la fiche métier est lue à part.
      const { data: art } = await supabase.from('artisans').select('id, category, hourly_rate').eq('id', data.artisan_id).maybeSingle()
      const ph = await fetchPhones([data.client_id, data.artisan_id])
      const client = data.client ? { ...data.client, phone: ph[data.client_id] || data.client.phone || null } : data.client
      const artisanProfile = data.artisan_profile ? { ...data.artisan_profile, phone: ph[data.artisan_id] || data.artisan_profile.phone || null } : data.artisan_profile
      setBooking({ ...data, client, artisan: { ...(art || {}), profiles: artisanProfile } })
      setLoading(false)
    }
    load()
  }, [bookingId])

  const handlePrint = () => window.print()

  if (loading) return <SkeletonPage rows={4} paddingTop={48} />

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div role="alert" className="card" style={{ maxWidth: 420, width: '100%', padding: '28px 22px', textAlign: 'center' }}>
        <div aria-hidden style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', background: 'color-mix(in srgb, var(--danger) 11%, transparent)' }}><AlertTriangle size={24}/></div>
        <div style={{ fontSize: 17, color: 'var(--tx)', fontWeight: 800, marginBottom: 8 }}>{error}</div>
        <p style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.55, marginBottom: 20 }}>La facture est disponible une fois la mission terminée et confirmée par le client.</p>
        <button onClick={() => router.back()} className="btn-primary" style={{ minHeight: 44 }}><ArrowLeft size={16} aria-hidden/> Retour</button>
      </div>
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
      <style suppressHydrationWarning>{`
        /* Styles scopés (préfixe fac-/inv-) : plus de body{color:#111}, de police
           Inter externe ni de reset global * qui fuyaient sur toute la webapp. */

        /* ── BARRE D'ACTION (cachée à l'impression) ── */
        .fac-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: var(--bg2);
          border-bottom: 1px solid var(--border);
          padding: 10px 24px;
          padding-top: calc(10px + env(safe-area-inset-top));
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .fac-bar :is(a,button):focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

        .fac-wrap {
          padding: 88px 40px 40px;
          display: flex;
          justify-content: center;
        }

        /* ── FACTURE ── */
        .invoice {
          width: 210mm;
          min-height: 297mm;
          background: #fff;
          color: #17242F;
          padding: 16mm 18mm;
          position: relative;
          box-shadow: 0 12px 40px -12px rgba(23,36,47,0.35);
          border-radius: 4px;
        }

        /* ── Écran étroit : la feuille A4 s'adapte (plus de scroll horizontal) ── */
        @media screen and (max-width: 860px) {
          .fac-bar { padding-left: 12px; padding-right: 12px; }
          .fac-wrap { padding: 76px 10px 24px; }
          .invoice { width: 100%; min-height: 0; padding: 22px 18px; }
          .inv-header { flex-direction: column; gap: 16px; }
          .inv-meta { text-align: start !important; }
          .inv-parties { grid-template-columns: 1fr !important; gap: 18px !important; }
          .inv-table-wrap { overflow-x: auto; }
          .inv-table { min-width: 520px; }
          .inv-totals-box { width: 100% !important; }
          .inv-footer { flex-direction: column; align-items: flex-start !important; gap: 14px; }
          .inv-watermark { font-size: 72px !important; }
        }
        @media screen and (max-width: 520px) { .fac-print-label { display: none; } }

        /* Header */
        .inv-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10mm;
          padding-bottom: 8mm;
          border-bottom: 2px solid #175CC4;
        }

        .inv-logo { display: flex; align-items: center; gap: 10px; }
        .inv-logo-box {
          width: 44px; height: 44px;
          background: #175CC4;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; font-weight: 700; color: #fff;
        }
        .inv-logo-name { font-size: 22px; font-weight: 700; color: #111; letter-spacing: .05em; }
        .inv-logo-sub { font-size: 11px; color: #55636D; font-weight: 400; margin-top: 2px; }

        .inv-meta { text-align: right; }
        .inv-title { font-size: 28px; font-weight: 700; color: #175CC4; letter-spacing: .05em; }
        .inv-num { font-size: 13px; color: #55636D; margin-top: 4px; font-weight: 400; font-family: var(--font-mono, ui-monospace, monospace) !important; }
        .inv-date { font-size: 12px; color: #55636D; margin-top: 2px; }

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
          color: #175CC4;
          letter-spacing: .12em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .inv-party-name { font-size: 16px; font-weight: 600; color: #111; margin-bottom: 4px; }
        .inv-party-info { font-size: 12px; color: #55636D; line-height: 1.6; }

        /* Badge statut */
        .inv-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: #E6F3F1;
          border: 1px solid #9FD3CB;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          color: #0B6B61;
          margin-bottom: 8mm;
        }

        /* Table */
        .inv-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8mm;
        }

        .inv-table th {
          background: #F5F2EB;
          border-bottom: 1px solid #E2DBCC;
          padding: 10px 14px;
          text-align: start;
          font-size: 10px;
          font-weight: 600;
          color: #55636D;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .inv-table th:last-child, .inv-table td:last-child { text-align: end; }

        .inv-table td {
          padding: 14px;
          border-bottom: 1px solid #EFEAE0;
          font-size: 13px;
          color: #33414B;
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
          color: #33414B;
          border-bottom: 1px solid #EFEAE0;
        }

        .inv-total-final {
          display: flex;
          justify-content: space-between;
          padding: 12px 0 8px;
          font-size: 17px;
          font-weight: 700;
          color: #17242F;
          border-top: 2px solid #17242F;
          margin-top: 4px;
        }

        .inv-total-final .amount { color: #175CC4; }

        /* Paiement */
        .inv-payment {
          background: #FBF5E8;
          border: 1px solid #E8D3A6;
          border-radius: 10px;
          padding: 14px 18px;
          margin-bottom: 8mm;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .inv-payment-icon { font-size: 22px; flex-shrink: 0; }
        .inv-payment-title { font-size: 13px; font-weight: 600; color: #6E4F12; margin-bottom: 2px; }
        .inv-payment-desc { font-size: 11px; color: #7A5A1C; }

        /* Footer */
        .inv-footer {
          border-top: 1px solid #E2DBCC;
          padding-top: 6mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .inv-footer-left { font-size: 11px; color: #6B767E; line-height: 1.6; }
        .inv-footer-brand { font-size: 12px; font-weight: 600; color: #175CC4; }

        /* Filigrane */
        .inv-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-35deg);
          font-size: 120px;
          font-weight: 700;
          color: #175CC4;
          opacity: 0.03;
          pointer-events: none;
          letter-spacing: .2em;
          white-space: nowrap;
        }

        /* ── IMPRESSION ── */
        @media print {
          html, body { background: #fff !important; }
          .fac-bar { display: none !important; }
          .fac-wrap { padding: 0 !important; }
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
      <div className="fac-bar" dir="ltr">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <button onClick={() => router.back()} aria-label="Retour"
            style={{ width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 'var(--r-btn)', color: 'var(--tx)', cursor: 'pointer' }}><ArrowLeft size={20}/></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div aria-hidden style={{ width: 28, height: 28, flexShrink: 0, background: 'var(--accent)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>B</div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Facture <span className="num">{factureNum}</span></span>
          </div>
        </div>
        <button onClick={handlePrint} className="btn-primary" aria-label="Imprimer ou télécharger en PDF" style={{ minHeight: 44, flexShrink: 0 }}>
          <Printer size={16} aria-hidden/>
          <span className="fac-print-label">Imprimer / Télécharger PDF</span>
        </button>
      </div>

      {/* Facture */}
      <div className="fac-wrap" dir="ltr">
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
            <Check size={12} strokeWidth={3}/>
            Mission terminée · Paiement reçu
          </div>

          {/* Tableau prestations */}
          <div className="inv-table-wrap"><table className="inv-table">
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
                  <div style={{ fontWeight: 600, color: '#17242F', marginBottom: 3 }}>{booking.title || `Intervention ${category}`}</div>
                  {booking.description && <div style={{ fontSize: 12, color: '#55636D', fontWeight: 400, lineHeight: 1.5 }}>{booking.description}</div>}
                </td>
                <td style={{ color: '#55636D' }}>{formatDate(booking.booking_date || booking.created_at)}</td>
                <td style={{ color: '#55636D' }}>{hours}h</td>
                <td style={{ color: '#55636D', whiteSpace: 'nowrap' }}>{hourlyRate.toLocaleString('fr-DZ')} DA/h</td>
                <td style={{ fontWeight: 600, color: '#17242F', whiteSpace: 'nowrap' }}>{subtotal.toLocaleString('fr-DZ')} DA</td>
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
          </table></div>

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
            <div className="inv-payment-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Banknote size={22}/></div>
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
            <div style={{ textAlign: 'end' }}>
              <div style={{ fontSize: 11, color: '#6B767E', marginBottom: 6 }}>Certifié par</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                <div style={{ width: 24, height: 24, background: '#175CC4', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>B</div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#175CC4' }}>BETI CERTIFIÉ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}


