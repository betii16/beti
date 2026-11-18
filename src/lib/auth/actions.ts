'use server'

// Actions de connexion. Ce sont des points d'entrée publics : tout ce qu'elles
// reçoivent vient du navigateur et est recontrôlé ici. Aucune erreur du service
// d'authentification n'est ignorée : elle revient à l'écran sous forme de code
// (src/lib/errors.ts), que l'écran traduit.

import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { defaultLocale, href, isLocale } from '@/i18n/config'
import { errorCode, type ErrorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'
import { isValidEmail, normalizeCode, normalizeEmail, safeNext } from './input'

const field = (formData: FormData, name: string): string => {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}
const localeOf = (formData: FormData) => {
  const lang = field(formData, 'lang')
  return isLocale(lang) ? lang : defaultLocale
}

export type LoginState = { sentTo?: string; resent?: boolean; error?: ErrorCode }

/** Étape 1 : envoie un code à l'adresse donnée. À la première connexion, le compte est créé. */
export async function sendCode(previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = normalizeEmail(field(formData, 'email'))
  if (!isValidEmail(email)) return { error: 'email_invalid' }
  const again = previous.sentTo === email

  const supabase = await createClient()
  // Aucun rôle n'est envoyé : la base crée toujours un compte client. On devient artisan ensuite, par become_artisan().
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
  // Un renvoi refusé (trop de demandes) laisse la personne sur l'écran du code : le précédent reste valable.
  if (error) return { sentTo: again ? email : undefined, error: errorCode(error) }
  return { sentTo: email, resent: again }
}

export type VerifyState = { error?: ErrorCode }

/** Étape 2 : vérifie le code. S'il est bon, la session est posée en cookies et la page de retour s'ouvre. */
export async function verifyCode(_previous: VerifyState, formData: FormData): Promise<VerifyState> {
  const email = normalizeEmail(field(formData, 'email'))
  const token = normalizeCode(field(formData, 'code'))
  if (!isValidEmail(email) || !token) return { error: 'code_invalid' }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) return { error: errorCode(error) }

  redirect(safeNext(field(formData, 'next')) || href(localeOf(formData), '/compte'))
}

/** Ferme la session de cet appareil. En cas d'échec, la personne reste connectée et le compte le lui dit. */
export async function signOut(formData: FormData): Promise<void> {
  const lang = localeOf(formData)
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) redirect(`${href(lang, '/compte')}?erreur=${errorCode(error)}`)
  redirect(href(lang))
}

export type NameState = { saved?: boolean; error?: ErrorCode }

/** Enregistre le nom. La fonction save_profile identifie elle-même l'appelant et contrôle la valeur. */
export async function saveName(_previous: NameState, formData: FormData): Promise<NameState> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('save_profile', { p_full_name: field(formData, 'name') })
  if (error) return { error: errorCode(error) }
  refresh()
  return { saved: true }
}
