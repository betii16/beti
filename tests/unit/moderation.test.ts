import { describe, it, expect } from 'vitest'
import {
  validateReport, buildReportRow, classifyInsertError, allowedStatusTransitions,
  isResolutionAllowed, DETAILS_MAX, type ReportDraft,
} from '@/lib/moderation'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'

const base: ReportDraft = { targetType: 'artisan', targetId: B, reportedUserId: B, reporterId: A, reason: 'fraude', details: '' }

describe('validateReport', () => {
  it('accepte un signalement valide sans details', () => expect(validateReport(base)).toBeNull())
  it('refuse un motif hors liste', () => expect(validateReport({ ...base, reason: 'spam' })).toBe('reason'))
  it('refuse de se signaler soi-meme', () => expect(validateReport({ ...base, reportedUserId: A, targetId: A })).toBe('self'))
  it('refuse un id non UUID', () => expect(validateReport({ ...base, targetId: 'x' })).toBe('target'))
  it('exige une reservation pour un message', () => {
    expect(validateReport({ ...base, targetType: 'message', targetId: C })).toBe('target')
    expect(validateReport({ ...base, targetType: 'message', targetId: C, bookingId: C })).toBeNull()
  })
  it('« autre » exige au moins 10 caracteres utiles', () => {
    expect(validateReport({ ...base, reason: 'autre', details: '   court  ' })).toBe('details_required')
    expect(validateReport({ ...base, reason: 'autre', details: 'Explication suffisante' })).toBeNull()
  })
  it('limite les details a 2000 caracteres', () => {
    expect(validateReport({ ...base, details: 'a'.repeat(DETAILS_MAX) })).toBeNull()
    expect(validateReport({ ...base, details: 'a'.repeat(DETAILS_MAX + 1) })).toBe('details_too_long')
  })
})

describe('buildReportRow', () => {
  it('ne contient aucun champ de traitement et nettoie les details', () => {
    const row = buildReportRow({ ...base, details: '  bonjour  ' })
    expect(row.details).toBe('bonjour')
    expect(row).not.toHaveProperty('status')
    expect(row).not.toHaveProperty('resolution')
    expect(row).not.toHaveProperty('handled_by')
  })
  it('details vides → null, booking absent → null', () => {
    const row = buildReportRow(base)
    expect(row.details).toBeNull()
    expect(row.booking_id).toBeNull()
  })
})

describe('classifyInsertError', () => {
  it('reconnait doublon, limite et erreur generique', () => {
    expect(classifyInsertError({ code: '23505' })).toBe('duplicate')
    expect(classifyInsertError({ code: 'P0001', message: 'reports_limit_reached' })).toBe('limit')
    expect(classifyInsertError({ code: '500', message: 'boom' })).toBe('generic')
    expect(classifyInsertError(null)).toBe('generic')
  })
})

describe('workflow admin', () => {
  it('transitions de statut', () => {
    expect(allowedStatusTransitions('open')).toContain('in_review')
    expect(allowedStatusTransitions('resolved')).not.toContain('rejected')
  })
  it('une sanction n’est permise que sur un ticket resolu', () => {
    expect(isResolutionAllowed('rejected', 'suspension')).toBe(false)
    expect(isResolutionAllowed('in_review', 'warning')).toBe(false)
    expect(isResolutionAllowed('resolved', 'suspension')).toBe(true)
    expect(isResolutionAllowed('rejected', 'none')).toBe(true)
  })
})
