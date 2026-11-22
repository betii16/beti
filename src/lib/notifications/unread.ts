'use client'

// Nombre de notifications non lues, partagé par la barre d'onglets et le bouton
// « Mon compte ». Un seul compteur pour la page : la barre d'onglets le tient à
// jour (à chaque navigation et à chaque notification reçue), les autres le lisent.

import { useSyncExternalStore } from 'react'
import { hasSessionCookie } from '@/lib/auth/input'
import { createClient } from '@/lib/supabase/browser'

let count = 0
const listeners = new Set<() => void>()

const set = (next: number) => {
  if (next === count) return
  count = next
  listeners.forEach(listener => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Recompte auprès de la base (le RLS ne montre que les notifications de la personne). Sans session : zéro, sans requête. */
export async function refreshUnread() {
  if (!hasSessionCookie(document.cookie)) return set(0)
  const { count: unread, error } = await createClient().from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null)
  // Une pastille qui ne se met pas à jour ne bloque personne : l'erreur est consignée, le dernier nombre reste.
  if (error) return console.error('[beti] notifications non comptées', error)
  set(unread ?? 0)
}

export const useUnread = () =>
  useSyncExternalStore(
    subscribe,
    () => count,
    () => 0,
  )
