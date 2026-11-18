// Qui est connecté, côté serveur. Toute page ou action réservée passe par ici :
// le contrôle se fait au plus près des données, jamais dans un layout (un layout
// n'est pas rejoué à chaque navigation).

import { redirect } from 'next/navigation'
import { cache } from 'react'
import { href, type Locale } from '@/i18n/config'
import { createClient } from '@/lib/supabase/server'

export type Session = { userId: string; email: string | null }

/** Session de la requête en cours, signature du jeton vérifiée. Une seule vérification par rendu de page. */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient()
  // getClaims vérifie la signature : un cookie fabriqué à la main ne passe pas.
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (error || !claims?.sub) return null
  return { userId: claims.sub, email: typeof claims.email === 'string' ? claims.email : null }
})

/** Renvoie la session, ou envoie à la page de connexion en retenant la page demandée. */
export async function requireSession(lang: Locale, path: string): Promise<Session> {
  const session = await getSession()
  if (!session) redirect(`${href(lang, '/connexion')}?next=${encodeURIComponent(href(lang, path))}`)
  return session
}
