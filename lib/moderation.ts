// lib/moderation.ts
// Logique pure de la moderation (sans React ni Supabase) : testable en unitaire.

export const REPORT_REASONS = ['fraude', 'comportement', 'travail_non_fait', 'prix_different', 'faux_profil', 'harcelement', 'autre'] as const
export type ReportReason = (typeof REPORT_REASONS)[number]

export const REPORT_TARGETS = ['artisan', 'client', 'booking', 'review', 'message'] as const
export type ReportTarget = (typeof REPORT_TARGETS)[number]

export const REPORT_STATUSES = ['open', 'in_review', 'resolved', 'rejected'] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

export const REPORT_RESOLUTIONS = ['none', 'warning', 'suspension', 'refund_cash_dispute', 'refund_card', 'other'] as const
export type ReportResolution = (typeof REPORT_RESOLUTIONS)[number]

export const DETAILS_MAX = 2000
export const OTHER_DETAILS_MIN = 10

export type ReportDraft = {
  targetType: ReportTarget
  targetId: string
  reportedUserId: string
  reporterId: string
  bookingId?: string | null
  reason: string
  details: string
}

export type ReportError = 'reason' | 'details_required' | 'details_too_long' | 'self' | 'target'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isReportReason = (v: string): v is ReportReason => (REPORT_REASONS as readonly string[]).includes(v)

// Valide le formulaire AVANT l'envoi (le SQL refait les memes controles : ceci n'est que du confort).
export function validateReport(d: ReportDraft): ReportError | null {
  if (!isReportReason(d.reason)) return 'reason'
  if (!UUID_RE.test(d.targetId) || !UUID_RE.test(d.reportedUserId)) return 'target'
  if (d.reporterId === d.reportedUserId) return 'self'
  if (d.targetType === 'booking' || d.targetType === 'message') {
    if (!d.bookingId || !UUID_RE.test(d.bookingId)) return 'target'
  }
  const len = d.details.trim().length
  if (len > DETAILS_MAX) return 'details_too_long'
  if (d.reason === 'autre' && len < OTHER_DETAILS_MIN) return 'details_required'
  return null
}

// Ligne a inserer : ne contient jamais de champ de traitement (status, resolution...).
export function buildReportRow(d: ReportDraft) {
  return {
    reporter_id: d.reporterId,
    target_type: d.targetType,
    target_id: d.targetId,
    reported_user_id: d.reportedUserId,
    booking_id: d.bookingId || null,
    reason: d.reason,
    details: d.details.trim() || null,
  }
}

// Erreur Postgres → cle d'erreur utilisateur (les messages P0001 viennent de moderation.sql).
export function classifyInsertError(err: { code?: string; message?: string } | null): 'duplicate' | 'limit' | 'generic' {
  if (!err) return 'generic'
  if (err.code === '23505') return 'duplicate'
  if ((err.message || '').includes('reports_limit_reached')) return 'limit'
  return 'generic'
}

// Transitions autorisees dans le panneau admin (un ticket clos peut etre rouvert).
export function allowedStatusTransitions(s: ReportStatus): ReportStatus[] {
  switch (s) {
    case 'open': return ['in_review', 'resolved', 'rejected']
    case 'in_review': return ['resolved', 'rejected', 'open']
    default: return ['open', 'in_review']
  }
}

// Une resolution n'a de sens que sur un ticket traite ; « rejected » = aucune sanction.
export function isResolutionAllowed(status: ReportStatus, resolution: ReportResolution): boolean {
  if (resolution === 'none') return true
  return status === 'resolved'
}

// Libelles admin (francais uniquement) + avertissement honnete sur le remboursement carte.
export const RESOLUTION_LABELS: Record<ReportResolution, string> = {
  none: 'Aucune',
  warning: 'Avertissement',
  suspension: 'Suspension du compte signalé',
  refund_cash_dispute: 'Litige remboursement espèces',
  refund_card: 'Remboursement carte',
  other: 'Autre décision',
}

export const RESOLUTION_NOTES: Partial<Record<ReportResolution, string>> = {
  refund_cash_dispute: 'Décision enregistrée seulement : le remboursement se règle hors plateforme entre les parties (BETI n’encaisse rien).',
  refund_card: 'Non branché : aucun paiement carte n’est encore actif. La décision est enregistrée, aucun remboursement n’est effectué.',
}

export const REASON_LABELS_FR: Record<ReportReason, string> = {
  fraude: 'Fraude',
  comportement: 'Comportement inapproprié',
  travail_non_fait: 'Travail non fait',
  prix_different: 'Prix différent de l’accord',
  faux_profil: 'Faux profil',
  harcelement: 'Harcèlement',
  autre: 'Autre',
}
