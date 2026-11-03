'use client'
// Onglet « Signalements » du panneau admin. Rendu à l'intérieur de `.adm` (app/admin/page.tsx),
// donc il réutilise ses classes (.adm-panel, .adm-btn, .chip…). Français uniquement.
// Sécurité : tout passe par le RLS (moderation.sql). Ici l'UI n'est qu'un confort.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logError } from '@/lib/logError'
import { formatDA } from '@/lib/format'
import {
  REPORT_STATUSES, REPORT_REASONS, REPORT_RESOLUTIONS, RESOLUTION_LABELS, RESOLUTION_NOTES, REASON_LABELS_FR,
  allowedStatusTransitions, isResolutionAllowed,
  type ReportStatus, type ReportResolution, type ReportReason,
} from '@/lib/moderation'

export type ReportRow = {
  id: string
  reporter_id: string
  target_type: string
  target_id: string
  reported_user_id: string
  booking_id: string | null
  reason: ReportReason
  details: string | null
  status: ReportStatus
  resolution: ReportResolution
  handled_by: string | null
  created_at: string
  handled_at: string | null
}
type Person = { id: string; full_name: string | null; role: string | null; is_active: boolean | null }
type BookingInfo = { id: string; title: string | null; status: string; price_agreed: number | null; price_final: number | null; payment_method: string | null; payment_status: string | null; scheduled_at: string | null; created_at: string }
type Msg = { id: string; sender_name: string | null; sender_role: string | null; content: string; created_at: string }
type LogRow = { id: number; action: string; details: Record<string, unknown>; created_at: string; admin_id: string }

const STATUS_LABEL: Record<ReportStatus, string> = { open: 'Ouvert', in_review: 'En cours', resolved: 'Résolu', rejected: 'Rejeté' }
const STATUS_TONE: Record<ReportStatus, string> = { open: 'var(--warning)', in_review: 'var(--accent)', resolved: 'var(--success)', rejected: 'var(--tx2)' }
const TARGET_LABEL: Record<string, string> = { artisan: 'Artisan', client: 'Client', booking: 'Conversation / réservation', review: 'Avis', message: 'Message' }
const EMPTY: React.CSSProperties = { padding: '32px 16px', textAlign: 'center', color: 'var(--tx2)', fontSize: 14 }
const LBL: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--tx2)', marginBottom: 6 }

const fmt = (d: string) => new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function Pill({ s }: { s: ReportStatus }) {
  const c = STATUS_TONE[s]
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', background: `color-mix(in srgb, ${c} 13%, transparent)`, color: `color-mix(in srgb, ${c} 72%, var(--tx))`, border: `1px solid color-mix(in srgb, ${c} 25%, transparent)` }}>{STATUS_LABEL[s]}</span>
}

export default function ReportsPanel({ adminId, onCountChange }: { adminId: string; onCountChange: (openCount: number) => void }) {
  const [rows, setRows] = useState<ReportRow[]>([])
  const [people, setPeople] = useState<Record<string, Person>>({})
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [fStatus, setFStatus] = useState<'all' | ReportStatus>('open')
  const [fReason, setFReason] = useState<'all' | ReportReason>('all')
  const [sel, setSel] = useState<ReportRow | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('reports')
      .select('id, reporter_id, target_type, target_id, reported_user_id, booking_id, reason, details, status, resolution, handled_by, created_at, handled_at')
      .order('created_at', { ascending: false }).limit(300).returns<ReportRow[]>()
    if (error) { logError('admin.reports.load', error); setLoadErr('Chargement des signalements impossible (la table existe-t-elle ? moderation.sql exécuté ?).'); setLoading(false); return }
    const list = data || []
    setLoadErr('')
    setRows(list)
    onCountChange(list.filter(r => r.status === 'open').length)
    const ids = Array.from(new Set(list.flatMap(r => [r.reporter_id, r.reported_user_id])))
    if (ids.length) {
      const { data: ps, error: pErr } = await supabase.from('profiles').select('id, full_name, role, is_active').in('id', ids).returns<Person[]>()
      if (pErr) logError('admin.reports.people', pErr) // noms affichés « — » : non bloquant
      setPeople(Object.fromEntries((ps || []).map(p => [p.id, p])))
    }
    setLoading(false)
  }, [onCountChange])

  // setTimeout : chargement initial hors du corps synchrone de l'effet (règle react-hooks/set-state-in-effect)
  useEffect(() => { const h = setTimeout(load, 0); return () => clearTimeout(h) }, [load])

  const name = (id: string) => people[id]?.full_name || '—'
  const shown = rows.filter(r => (fStatus === 'all' || r.status === fStatus) && (fReason === 'all' || r.reason === fReason))

  if (sel) {
    const live = rows.find(r => r.id === sel.id) || sel
    return <ReportDetail report={live} adminId={adminId} people={people} onBack={() => setSel(null)} onChanged={load} />
  }

  return (
    <div style={{ animation: 'admFadeUp 0.4s ease' }}>
      <div className="adm-panel">
        <div className="adm-panel-head">
          <span className="adm-panel-title">Signalements ({shown.length})</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div role="group" aria-label="Filtrer par statut" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['all', ...REPORT_STATUSES] as const).map(id => (
                <button key={id} onClick={() => setFStatus(id)} aria-pressed={fStatus === id} className={fStatus === id ? 'chip chip-active' : 'chip'} style={{ padding: '7px 12px', minHeight: 36 }}>
                  {id === 'all' ? 'Tous' : STATUS_LABEL[id]}
                </button>
              ))}
            </div>
            <select aria-label="Filtrer par motif" className="field" value={fReason} onChange={e => setFReason(e.target.value as 'all' | ReportReason)} style={{ minHeight: 36, padding: '4px 10px', fontSize: 13 }}>
              <option value="all">Tous les motifs</option>
              {REPORT_REASONS.map(r => <option key={r} value={r}>{REASON_LABELS_FR[r]}</option>)}
            </select>
          </div>
        </div>
        {loadErr ? (
          <div role="alert" style={{ ...EMPTY, color: 'var(--danger)' }}>{loadErr} <button className="adm-btn adm-btn-ghost" onClick={() => { setLoading(true); load() }}>Réessayer</button></div>
        ) : loading ? (
          <div style={EMPTY}>Chargement…</div>
        ) : shown.length === 0 ? (
          <div style={EMPTY}>Aucun signalement pour ce filtre.</div>
        ) : (
          <div className="adm-table-wrap"><table>
            <thead><tr><th>DATE</th><th>MOTIF</th><th>SIGNALÉ</th><th>PAR</th><th>TYPE</th><th>STATUT</th><th>ACTIONS</th></tr></thead>
            <tbody>
              {shown.map(r => (
                <tr key={r.id}>
                  <td className="muted">{fmt(r.created_at)}</td>
                  <td style={{ fontWeight: 700 }}>{REASON_LABELS_FR[r.reason]}</td>
                  <td>{name(r.reported_user_id)}{people[r.reported_user_id]?.is_active === false && <span style={{ color: 'var(--danger)', fontSize: 12 }}> (suspendu)</span>}</td>
                  <td>{name(r.reporter_id)}</td>
                  <td className="muted">{TARGET_LABEL[r.target_type] || r.target_type}</td>
                  <td><Pill s={r.status} /></td>
                  <td><button onClick={() => setSel(r)} className="adm-btn adm-btn-ghost">Ouvrir</button></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  )
}

function ReportDetail({ report, adminId, people, onBack, onChanged }: {
  report: ReportRow; adminId: string; people: Record<string, Person>; onBack: () => void; onChanged: () => Promise<void>
}) {
  const [booking, setBooking] = useState<BookingInfo | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [history, setHistory] = useState<LogRow[]>([])
  const [ctxErr, setCtxErr] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<ReportStatus>(report.status)
  const [resolution, setResolution] = useState<ReportResolution>(report.resolution)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const reported = people[report.reported_user_id]
  const reporter = people[report.reporter_id]

  const loadCtx = useCallback(async () => {
    const jobs = await Promise.all([
      report.booking_id
        ? supabase.from('bookings').select('id, title, status, price_agreed, price_final, payment_method, payment_status, scheduled_at, created_at').eq('id', report.booking_id).maybeSingle<BookingInfo>()
        : Promise.resolve({ data: null, error: null }),
      report.booking_id
        ? supabase.from('messages').select('id, sender_name, sender_role, content, created_at').eq('booking_id', report.booking_id).order('created_at', { ascending: true }).limit(300).returns<Msg[]>()
        : Promise.resolve({ data: [] as Msg[], error: null }),
      supabase.from('moderation_log').select('id, action, details, created_at, admin_id').eq('report_id', report.id).order('created_at', { ascending: false }).returns<LogRow[]>(),
      supabase.from('report_admin_notes').select('note').eq('report_id', report.id).maybeSingle<{ note: string }>(),
    ])
    const [b, m, h, n] = jobs
    const firstErr = b.error || m.error || h.error || n.error
    if (firstErr) logError('admin.reports.context', firstErr, { reportId: report.id })
    setCtxErr(firstErr ? 'Une partie du contexte n’a pas pu être chargée.' : '')
    setBooking(b.data ?? null)
    setMsgs(m.data || [])
    setHistory(h.data || [])
    setNote(n.data?.note || '')
  }, [report.id, report.booking_id])

  useEffect(() => { const h = setTimeout(loadCtx, 0); return () => clearTimeout(h) }, [loadCtx])

  const log = async (action: string, target: string, details: Record<string, unknown>) => {
    const { error } = await supabase.from('moderation_log').insert({ admin_id: adminId, action, target, report_id: report.id, details })
    if (error) { logError('admin.reports.log', error, { action, reportId: report.id }); return false }
    return true
  }

  const statusOptions: ReportStatus[] = [report.status, ...allowedStatusTransitions(report.status)]
  const resolutionOk = isResolutionAllowed(status, resolution)

  const save = async (nextStatus: ReportStatus = status) => {
    if (busy) return
    const nextRes: ReportResolution = nextStatus === status ? resolution : 'none'
    if (!isResolutionAllowed(nextStatus, nextRes)) { setMsg({ ok: false, text: 'Une décision (sanction, remboursement) exige le statut « Résolu ».' }); return }
    if (nextRes === 'suspension') {
      if (reported?.role === 'admin') { setMsg({ ok: false, text: 'Un compte admin ne peut pas être suspendu ici.' }); return }
      if (!confirm(`Suspendre le compte de ${reported?.full_name || 'cet utilisateur'} ? Il ne pourra plus réserver, écrire ni apparaître dans les résultats.`)) return
    }
    setBusy(true); setMsg(null)
    const warnings: string[] = []

    // 1) Suspension d'abord : si elle échoue, le ticket n'est pas marqué « résolu » à tort.
    if (nextRes === 'suspension' && report.resolution !== 'suspension') {
      const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', report.reported_user_id)
      if (error) { logError('admin.reports.suspend', error, { reportId: report.id }); setMsg({ ok: false, text: 'Suspension impossible : ' + error.message }); setBusy(false); return }
      if (!(await log('suspend_account', 'profile:' + report.reported_user_id, { reason: report.reason }))) warnings.push('journal')
    }
    // 2) Ticket
    const { error: upErr } = await supabase.from('reports').update({ status: nextStatus, resolution: nextRes }).eq('id', report.id)
    if (upErr) { logError('admin.reports.update', upErr, { reportId: report.id }); setMsg({ ok: false, text: 'Mise à jour impossible : ' + upErr.message }); setBusy(false); return }
    if (nextStatus !== report.status || nextRes !== report.resolution) {
      if (!(await log('report_' + nextStatus, 'report:' + report.id, { from: report.status, to: nextStatus, resolution: nextRes }))) warnings.push('journal')
    }
    // 3) Note interne
    const { error: nErr } = await supabase.from('report_admin_notes').upsert({ report_id: report.id, note: note.trim(), updated_by: adminId, updated_at: new Date().toISOString() })
    if (nErr) { logError('admin.reports.note', nErr, { reportId: report.id }); warnings.push('note') }

    setBusy(false)
    setStatus(nextStatus); setResolution(nextRes)
    setMsg(warnings.length
      ? { ok: false, text: 'Enregistré, mais échec pour : ' + warnings.join(', ') + '. Réessayez pour compléter.' }
      : { ok: true, text: nextRes === 'refund_card' ? 'Décision enregistrée. Remboursement carte non branché : rien n’a été remboursé.' : 'Enregistré.' })
    await onChanged()
    await loadCtx()
  }

  const reactivate = async () => {
    if (!confirm('Réactiver ce compte ?')) return
    setBusy(true); setMsg(null)
    const { error } = await supabase.from('profiles').update({ is_active: true }).eq('id', report.reported_user_id)
    if (error) { logError('admin.reports.reactivate', error, { reportId: report.id }); setMsg({ ok: false, text: 'Réactivation impossible : ' + error.message }); setBusy(false); return }
    const logged = await log('reactivate_account', 'profile:' + report.reported_user_id, {})
    setBusy(false)
    setMsg(logged ? { ok: true, text: 'Compte réactivé.' } : { ok: false, text: 'Compte réactivé, mais le journal n’a pas été écrit.' })
    await onChanged(); await loadCtx()
  }

  const box: React.CSSProperties = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-field)', padding: '12px 14px' }

  return (
    <div style={{ animation: 'admFadeUp 0.4s ease', display: 'grid', gap: 16 }}>
      <div><button onClick={onBack} className="adm-btn adm-btn-ghost">← Retour à la liste</button></div>

      <div className="adm-panel">
        <div className="adm-panel-head">
          <span className="adm-panel-title">{REASON_LABELS_FR[report.reason]} · {TARGET_LABEL[report.target_type] || report.target_type}</span>
          <Pill s={report.status} />
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <div style={box}><span style={LBL}>SIGNALÉ PAR</span><b>{reporter?.full_name || '—'}</b> <span className="muted" style={{ color: 'var(--tx2)' }}>({reporter?.role || '?'})</span></div>
            <div style={box}><span style={LBL}>PERSONNE SIGNALÉE</span><b>{reported?.full_name || '—'}</b> <span style={{ color: 'var(--tx2)' }}>({reported?.role || '?'})</span>
              {reported?.is_active === false && <div style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 13, marginTop: 4 }}>Compte suspendu</div>}
              {reported?.role === 'artisan' && <div style={{ marginTop: 6 }}><a href={`/artisan/${report.reported_user_id}`} className="adm-btn adm-btn-ghost">Voir la fiche</a></div>}
            </div>
            <div style={box}><span style={LBL}>DATE</span>{fmt(report.created_at)}{report.handled_at && <div style={{ color: 'var(--tx2)', fontSize: 13 }}>Traité le {fmt(report.handled_at)}</div>}</div>
          </div>
          <div style={box}><span style={LBL}>DÉTAILS DE L’AUTEUR</span><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.6 }}>{report.details || <span style={{ color: 'var(--tx2)' }}>Aucun détail fourni.</span>}</p></div>
          {ctxErr && <div role="alert" style={{ color: 'var(--danger)', fontSize: 13.5 }}>{ctxErr} <button className="adm-btn adm-btn-ghost" onClick={loadCtx}>Réessayer</button></div>}
        </div>
      </div>

      {report.booking_id && (
        <div className="adm-panel">
          <div className="adm-panel-head"><span className="adm-panel-title">Réservation liée</span></div>
          <div style={{ padding: 16, display: 'grid', gap: 12 }}>
            {booking ? (
              <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
                <div style={box}><span style={LBL}>SERVICE</span>{booking.title || '—'}</div>
                <div style={box}><span style={LBL}>STATUT</span>{booking.status}</div>
                <div style={box}><span style={LBL}>PRIX CONVENU</span><span className="num">{formatDA(booking.price_agreed, 'fr')}</span>{booking.price_final != null && <div style={{ fontSize: 13, color: 'var(--tx2)' }}>Final : {formatDA(booking.price_final, 'fr')}</div>}</div>
                <div style={box}><span style={LBL}>PAIEMENT</span>{booking.payment_method === 'cash' || !booking.payment_method ? 'Espèces' : booking.payment_method}{booking.payment_status && <div style={{ fontSize: 13, color: 'var(--tx2)' }}>{booking.payment_status}</div>}</div>
              </div>
            ) : <div style={{ color: 'var(--tx2)' }}>Réservation introuvable ou supprimée.</div>}
            <div style={{ ...box, maxHeight: 320, overflowY: 'auto' }}>
              <span style={LBL}>MESSAGES ({msgs.length})</span>
              {msgs.length === 0 ? <div style={{ color: 'var(--tx2)' }}>Aucun message.</div> : msgs.map(m => (
                <div key={m.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--tx2)' }}><b style={{ color: m.sender_role === 'artisan' ? 'var(--accent)' : 'var(--tx)' }}>{m.sender_name || m.sender_role || '?'}</b> · {fmt(m.created_at)}</div>
                  <div dir="auto" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', textAlign: 'start', fontSize: 14 }}>{m.content}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="adm-panel">
        <div className="adm-panel-head"><span className="adm-panel-title">Traitement</span></div>
        <div style={{ padding: 16, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {report.status === 'open' && <button disabled={busy} onClick={() => save('in_review')} className="adm-btn adm-btn-ghost">Passer en cours</button>}
            {report.status !== 'rejected' && <button disabled={busy} onClick={() => save('rejected')} className="adm-btn adm-btn-no">Rejeter</button>}
            {reported?.is_active === false && <button disabled={busy} onClick={reactivate} className="adm-btn adm-btn-ok">Réactiver le compte</button>}
          </div>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <div>
              <label htmlFor="rp-status" style={LBL}>Statut</label>
              <select id="rp-status" className="field" value={status} onChange={e => { const s = e.target.value as ReportStatus; setStatus(s); if (s !== 'resolved') setResolution('none') }} style={{ width: '100%', minHeight: 40 }}>
                {Array.from(new Set(statusOptions)).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="rp-res" style={LBL}>Décision</label>
              <select id="rp-res" className="field" value={resolution} onChange={e => setResolution(e.target.value as ReportResolution)} disabled={status !== 'resolved'} style={{ width: '100%', minHeight: 40 }}>
                {REPORT_RESOLUTIONS.map(r => <option key={r} value={r}>{RESOLUTION_LABELS[r]}</option>)}
              </select>
            </div>
          </div>
          {RESOLUTION_NOTES[resolution] && (
            <div role="note" style={{ ...box, borderColor: resolution === 'refund_card' ? 'var(--warning)' : 'var(--border)', fontSize: 13.5, lineHeight: 1.55 }}>{RESOLUTION_NOTES[resolution]}</div>
          )}
          <div>
            <label htmlFor="rp-note" style={LBL}>Note interne (jamais visible par l’auteur ni par le signalé)</label>
            <textarea id="rp-note" className="field" rows={3} maxLength={4000} value={note} onChange={e => setNote(e.target.value)} style={{ width: '100%', fontSize: 14 }} />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button disabled={busy || !resolutionOk} onClick={() => save()} className="adm-btn adm-btn-ok" aria-busy={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
            {msg && <span role={msg.ok ? 'status' : 'alert'} style={{ fontSize: 13.5, fontWeight: 600, color: msg.ok ? 'var(--success)' : 'var(--danger)' }}>{msg.text}</span>}
          </div>
        </div>
      </div>

      <div className="adm-panel">
        <div className="adm-panel-head"><span className="adm-panel-title">Historique</span></div>
        {history.length === 0 ? <div style={EMPTY}>Aucune action enregistrée.</div> : (
          <ul style={{ listStyle: 'none', margin: 0, padding: '8px 16px 12px' }}>
            {history.map(h => (
              <li key={h.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                <b>{h.action}</b> <span style={{ color: 'var(--tx2)' }}>· {fmt(h.created_at)}{h.admin_id === adminId ? ' · vous' : ''}</span>
                {Object.keys(h.details || {}).length > 0 && <div className="mono" style={{ fontSize: 12, color: 'var(--tx2)', overflowWrap: 'anywhere' }}>{JSON.stringify(h.details)}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
