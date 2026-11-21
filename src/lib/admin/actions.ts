'use server'

// Actions de l'équipe. Chaque fonction admin_* de la base vérifie elle-même que
// l'appelant est de l'équipe (require_staff) et inscrit l'action au journal :
// cette action ne fait que lire le formulaire et choisir la fonction.

import { refresh } from 'next/cache'
import { z } from 'zod'
import { dayToTimestamp } from '@/domain/bookings'
import { errorCode, type ErrorCode } from '@/lib/errors'
import { field } from '@/lib/form'
import { createClient } from '@/lib/supabase/server'

export type AdminState = { error?: ErrorCode; done?: boolean }

export async function adminAction(_previous: AdminState, formData: FormData): Promise<AdminState> {
  const action = field(formData, 'do')
  const id = field(formData, 'id')
  const reason = field(formData, 'reason').trim() || undefined
  const supabase = await createClient()

  let result: { error: unknown }
  if (action === 'launch_until') {
    const until = dayToTimestamp(field(formData, 'until'))
    if (!until) return { error: 'invalid_date' }
    result = await supabase.rpc('admin_set_launch_free_until', { p_until: until })
  } else {
    if (!z.uuid().safeParse(id).success) return { error: 'not_found' }
    switch (action) {
      case 'suspend_user':
      case 'restore_user':
        result = await supabase.rpc('admin_set_user_active', { p_user_id: id, p_active: action === 'restore_user', p_reason: reason })
        break
      case 'publish':
      case 'unpublish':
        result = await supabase.rpc('admin_set_listing', { p_artisan_id: id, p_published: action === 'publish', p_reason: reason })
        break
      case 'verify':
      case 'unverify':
        result = await supabase.rpc('admin_set_listing', { p_artisan_id: id, p_verified: action === 'verify', p_reason: reason })
        break
      case 'approve_subscription':
      case 'reject_subscription':
        result = await supabase.rpc('admin_review_subscription', { p_subscription_id: id, p_approve: action === 'approve_subscription', p_note: reason })
        break
      case 'cancel_booking':
      case 'complete_booking':
        result = await supabase.rpc('admin_set_booking_status', {
          p_booking_id: id,
          p_status: action === 'cancel_booking' ? 'cancelled' : 'completed',
          p_reason: reason,
        })
        break
      case 'hide_review':
      case 'show_review':
        result = await supabase.rpc('admin_set_review_visibility', { p_review_id: id, p_visible: action === 'show_review', p_reason: reason })
        break
      case 'report':
        result = await supabase.rpc('admin_update_report', {
          p_report_id: id,
          p_status: field(formData, 'status'),
          p_resolution: field(formData, 'resolution') || 'none',
          p_note: field(formData, 'note').trim() || undefined,
        })
        break
      default:
        return { error: 'invalid_input' }
    }
  }
  if (result.error) return { error: errorCode(result.error) }
  refresh()
  return { done: true }
}
