'use server'

// Notifications de la personne connectée : la base ne lui montre que les siennes.

import { refresh } from 'next/cache'
import { errorCode, type ErrorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'

/** Toutes marquées lues une fois la liste affichée. Un échec n'empêche pas de lire : il est consigné. */
export async function markNotificationsRead(): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('mark_notifications_read', {})
  if (error) console.error('[beti] notifications non marquées lues', error)
}

export type ClearState = { error?: ErrorCode }

export async function clearNotifications(): Promise<ClearState> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('clear_notifications')
  if (error) return { error: errorCode(error) }
  refresh()
  return {}
}
