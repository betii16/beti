// Qui est connecté, côté serveur. Toute page ou action réservée passe par ici :
// le contrôle se fait au plus près des données, jamais dans un layout (un layout
// n'est pas rejoué à chaque navigation).

import { notFound, redirect } from 'next/navigation'
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

/**
 * Page de l'équipe : sans session, la connexion ; hors équipe, une page introuvable (le panneau
 * ne signale pas son existence). Le panneau est en français seulement : l'adresse en arabe y renvoie.
 * La base revérifie l'équipe à chaque lecture (RLS) et chaque action (require_staff).
 */
export async function requireStaff(lang: Locale, path: string): Promise<Session> {
  if (lang !== 'fr') redirect(href('fr', path))
  const session = await requireSession(lang, path)
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('my_access')
  // Une panne n'est pas un refus : elle part vers la page d'erreur, pas vers « introuvable ».
  if (error) throw new Error(`my_access: ${error.code}`)
  const staffRole = data && typeof data === 'object' && !Array.isArray(data) ? data.staff_role : null
  if (typeof staffRole !== 'string') notFound()
  return session
}
