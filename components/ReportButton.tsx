'use client'
// Bouton « Signaler » + formulaire modal. N'apparait que pour un utilisateur connecté
// qui n'est pas la personne signalée (un visiteur n'a rien à signaler : RLS exige une session).
import { useEffect, useRef, useState } from 'react'
import { Flag, X, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { logError } from '@/lib/logError'
import {
  REPORT_REASONS, DETAILS_MAX, validateReport, buildReportRow, classifyInsertError,
  type ReportTarget, type ReportError,
} from '@/lib/moderation'

type Props = {
  targetType: ReportTarget
  targetId: string
  reportedUserId: string
  bookingId?: string | null
  /** Titre de la fenêtre (clé rep.aboutXxx déjà traduite par l'appelant) */
  title?: string
  /** Libellé accessible/visible du bouton ; défaut « Signaler » */
  label?: string
  /** 'text' = bouton discret avec texte ; 'icon' = drapeau seul (libellé en aria-label) */
  variant?: 'text' | 'icon'
}

const ERR_KEY: Record<ReportError, string> = {
  reason: 'rep.errReason', details_required: 'rep.errDetails', details_too_long: 'rep.errTooLong',
  self: 'rep.errSelf', target: 'rep.errTarget',
}

export default function ReportButton({ targetType, targetId, reportedUserId, bookingId, title, label, variant = 'text' }: Props) {
  const { t, isAr } = useLang()
  const [uid, setUid] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [err, setErr] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const firstRef = useRef<HTMLSelectElement>(null)
  const openerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let alive = true
    supabase.auth.getUser().then(({ data, error }) => {
      if (!alive) return
      // Pas de session (ou lecture impossible) : le bouton reste simplement masqué.
      if (error) { logError('report.getUser', error); return }
      setUid(data.user?.id ?? null)
    })
    return () => { alive = false }
  }, [])

  const close = () => { setOpen(false); openerRef.current?.focus() }

  useEffect(() => {
    if (!open) return
    firstRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])

  if (!uid || uid === reportedUserId) return null

  const openForm = () => { setReason(''); setDetails(''); setErr(''); setDone(false); setOpen(true) }

  const submit = async () => {
    if (sending) return
    const draft = { targetType, targetId, reportedUserId, reporterId: uid, bookingId, reason, details }
    const bad = validateReport(draft)
    if (bad) { setErr(t(ERR_KEY[bad])); return }
    setSending(true); setErr('')
    const { error } = await supabase.from('reports').insert(buildReportRow(draft))
    setSending(false)
    if (error) {
      // Contexte sans donnée personnelle : types et code seulement.
      logError('report.insert', error, { targetType, reason })
      const kind = classifyInsertError(error)
      setErr(t(kind === 'duplicate' ? 'rep.errDuplicate' : kind === 'limit' ? 'rep.errLimit' : 'rep.errGeneric'))
      return
    }
    setDone(true)
  }

  const text = label || t('rep.btn')
  const needDetails = reason === 'autre'

  return (
    <>
      <button ref={openerRef} type="button" onClick={openForm} aria-haspopup="dialog" aria-label={variant === 'icon' ? text : undefined}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, minWidth: 44, padding: variant === 'icon' ? 0 : '0 12px', background: 'transparent', border: 'none', borderRadius: 'var(--r-btn)', color: 'var(--tx2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        <Flag size={15} aria-hidden />
        {variant === 'text' && <span>{text}</span>}
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--overlay)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 12 }}
          onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
          <div role="dialog" aria-modal="true" aria-labelledby="rep-title" dir={isAr ? 'rtl' : 'ltr'} className="card"
            style={{ width: '100%', maxWidth: 480, maxHeight: '92dvh', overflowY: 'auto', padding: '20px 20px calc(20px + env(safe-area-inset-bottom))', background: 'var(--bg2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
              <h2 id="rep-title" style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx)' }}>{title || t('rep.title')}</h2>
              <button type="button" onClick={close} aria-label={t('rep.close')}
                style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 12, color: 'var(--tx2)', cursor: 'pointer', flexShrink: 0 }}>
                <X size={20} aria-hidden />
              </button>
            </div>

            {done ? (
              <div role="status" style={{ textAlign: 'center', padding: '12px 4px 4px' }}>
                <div aria-hidden style={{ color: 'var(--success)', marginBottom: 10 }}><CheckCircle2 size={40} style={{ margin: '0 auto' }} /></div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)', marginBottom: 6 }}>{t('rep.sentTitle')}</div>
                <p style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.55, marginBottom: 18 }}>{t('rep.sentText')}</p>
                <button type="button" onClick={close} className="btn-primary" style={{ minHeight: 46 }}>{t('rep.close')}</button>
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); submit() }} noValidate>
                <p style={{ fontSize: 13.5, color: 'var(--tx2)', lineHeight: 1.55, marginBottom: 14 }}>{t('rep.intro')}</p>

                <label htmlFor="rep-reason" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--tx)', marginBottom: 6 }}>{t('rep.reasonLabel')}</label>
                <select id="rep-reason" ref={firstRef} className="field" value={reason} onChange={e => { setReason(e.target.value); setErr('') }}
                  style={{ width: '100%', minHeight: 46, marginBottom: 14, fontSize: 16 }}>
                  <option value="" disabled>—</option>
                  {REPORT_REASONS.map(r => <option key={r} value={r}>{t(`rep.reason.${r}`)}</option>)}
                </select>

                <label htmlFor="rep-details" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--tx)', marginBottom: 6 }}>{needDetails ? t('rep.detailsReq') : t('rep.detailsLabel')}</label>
                <textarea id="rep-details" className="field" value={details} maxLength={DETAILS_MAX} rows={4} dir="auto"
                  onChange={e => { setDetails(e.target.value); setErr('') }} placeholder={t('rep.detailsPh')}
                  aria-required={needDetails} style={{ width: '100%', minHeight: 100, marginBottom: 6, fontSize: 16, textAlign: 'start', resize: 'vertical' }} />
                <div className="num" style={{ fontSize: 12, color: 'var(--tx2)', textAlign: 'end', marginBottom: 12 }}>{details.length}/{DETAILS_MAX}</div>

                {err && <div role="alert" style={{ padding: '10px 12px', marginBottom: 12, borderRadius: 'var(--r-field)', background: 'color-mix(in srgb, var(--danger) 10%, var(--bg2))', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', color: 'var(--danger)', fontSize: 13.5, fontWeight: 600, lineHeight: 1.45 }}>{err}</div>}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="submit" disabled={sending} aria-busy={sending} className="btn-primary" style={{ flex: '1 1 180px', minHeight: 46 }}>
                    {sending ? t('rep.sending') : err && !validateReport({ targetType, targetId, reportedUserId, reporterId: uid, bookingId, reason, details }) ? t('rep.retry') : t('rep.send')}
                  </button>
                  <button type="button" onClick={close} className="btn-ghost" style={{ minHeight: 46 }}>{t('rep.cancel')}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
