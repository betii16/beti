// Fiche privée de la personne connectée.

import { getSession } from '@/lib/auth/session'
import { errorCode, type ErrorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'

/**
 * Change le nom, et lui seul. save_profile REMPLACE toute la fiche : une valeur
 * non transmise (wilaya, commune, photo) serait effacée. On relit donc ce qui
 * existe et on le renvoie tel quel avec le nouveau nom.
 */
export async function saveFullName(name: string): Promise<ErrorCode | null> {
  const session = await getSession()
  if (!session) return 'not_authenticated'
  const supabase = await createClient()
  const current = await supabase.from('profiles').select('wilaya_code, commune, avatar_path').eq('id', session.userId).maybeSingle()
  // Sans la fiche actuelle on n'écrit rien : mieux vaut une erreur qu'une fiche vidée.
  if (current.error) return errorCode(current.error)
  const { error } = await supabase.rpc('save_profile', {
    p_full_name: name,
    p_wilaya_code: current.data?.wilaya_code ?? undefined,
    p_commune: current.data?.commune ?? undefined,
    p_avatar_path: current.data?.avatar_path ?? undefined,
  })
  return error ? errorCode(error) : null
}
