'use server'

// Signalement d'un profil d'artisan ou d'une demande. La base déduit elle-même
// la personne signalée et vérifie que l'auteur a le droit de signaler cette cible.

import { z } from 'zod'
import { errorCode, type ErrorCode } from '@/lib/errors'
import { field } from '@/lib/form'
import { createClient } from '@/lib/supabase/server'

export type ReportState = { error?: ErrorCode; sent?: boolean; values?: { reason: string; details: string } }

export async function createReport(_previous: ReportState, formData: FormData): Promise<ReportState> {
  const type = field(formData, 'type')
  const id = field(formData, 'id')
  const values = { reason: field(formData, 'reason'), details: field(formData, 'details') }
  if ((type !== 'artisan' && type !== 'booking') || !z.uuid().safeParse(id).success) return { error: 'not_found', values }

  const supabase = await createClient()
  const { error } = await supabase.rpc('create_report', { p_target_type: type, p_target_id: id, p_reason: values.reason, p_details: values.details })
  if (error) return { error: errorCode(error), values }
  return { sent: true }
}
