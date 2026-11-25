'use server'

// Actions de connexion. Ce sont des points d'entrée publics : tout ce qu'elles
// reçoivent vient du navigateur et est recontrôlé ici. Aucune erreur du service
// d'authentification n'est ignorée : elle revient à l'écran sous forme de code
// (src/lib/errors.ts), que l'écran traduit.

import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { href } from '@/i18n/config'
import { errorCode, type ErrorCode } from '@/lib/errors'
import { field, localeOf } from '@/lib/form'
import { saveFullName } from '@/lib/profile'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isValidEmail, normalizeCode, normalizeEmail, safeNext } from './input'
import { getSession } from './session'

export type LoginState = { sentTo?: string; resent?: boolean; error?: ErrorCode }

/** Étape 1 : envoie un code à l'adresse donnée. À la première connexion, le compte est créé. */
export async function sendCode(previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = normalizeEmail(field(formData, 'email'))
  if (!isValidEmail(email)) return { error: 'email_invalid' }
  // Les données sont gardées hors d'Algérie : la loi 18-07 (art. 45) demande l'accord exprès de la personne.
  // shortcut: l'accord n'est pas enregistré en base, y ajouter une date par compte si une preuve devient nécessaire.
  if (field(formData, 'consent') !== 'oui') return { error: 'invalid_input' }
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

/** Enregistre le nom, sans toucher au reste de la fiche (voir saveFullName). */
export async function saveName(_previous: NameState, formData: FormData): Promise<NameState> {
  const error = await saveFullName(field(formData, 'name'))
  if (error) return { error }
  refresh()
  return { saved: true }
}

export type DeleteState = { error?: ErrorCode }

/**
 * Supprime pour de bon le compte de la personne connectée : photos, puis textes et demandes
 * (purge_user), puis le compte lui-même. Chaque étape peut être rejouée : si l'une échoue,
 * la personne voit l'erreur et recommence, rien ne reste à moitié fait en silence.
 */
export async function deleteAccount(_previous: DeleteState, formData: FormData): Promise<DeleteState> {
  // La case est obligatoire dans le formulaire ; tout vient du navigateur, elle est recontrôlée ici.
  if (field(formData, 'confirm') !== 'oui') return { error: 'invalid_input' }
  const session = await getSession()
  if (!session) return { error: 'not_authenticated' }
  const userId = session.userId

  // Un compte de l'équipe ne part pas d'ici : le dernier admin fermerait le panneau à tout le monde.
  const supabase = await createClient()
  const access = await supabase.rpc('my_access')
  if (access.error) return { error: errorCode(access.error) }
  const me = access.data
  if (me && typeof me === 'object' && !Array.isArray(me) && typeof me.staff_role === 'string') return { error: 'staff_account' }

  const admin = createAdminClient()
  if (!admin) {
    console.error('[beti] suppression de compte impossible : SUPABASE_SERVICE_ROLE_KEY absente')
    return { error: 'unknown' }
  }

  // Les photos d'abord : une fois la purge faite, la base ne sait plus lesquelles étaient à la personne.
  // shortcut: 1 000 fichiers par dossier et les demandes en une requête, à paginer si un compte en a plus.
  const media = admin.storage.from('media')
  const [avatars, portfolio, bookings] = await Promise.all([
    media.list(`avatars/${userId}`, { limit: 1000 }),
    media.list(`portfolio/${userId}`, { limit: 1000 }),
    admin.from('bookings').select('id').eq('client_id', userId),
  ])
  const listError = avatars.error ?? portfolio.error ?? bookings.error
  if (listError) return { error: errorCode(listError) }
  const bookingIds = (bookings.data ?? []).map(booking => booking.id)
  const reviews = bookingIds.length > 0 ? await admin.from('reviews').select('booking_id, photos').in('booking_id', bookingIds) : null
  if (reviews?.error) return { error: errorCode(reviews.error) }
  const paths = [
    ...(avatars.data ?? []).map(file => `avatars/${userId}/${file.name}`),
    ...(portfolio.data ?? []).map(file => `portfolio/${userId}/${file.name}`),
    // Seulement ce qui est rangé dans le dossier de l'avis : la clé service retirerait n'importe quel chemin.
    ...(reviews?.data ?? []).flatMap(review => review.photos.filter(path => path.startsWith(`reviews/${review.booking_id}/`))),
  ]
  if (paths.length > 0) {
    const removed = await media.remove(paths)
    if (removed.error) return { error: errorCode(removed.error) }
  }

  const purged = await admin.rpc('purge_user', { p_user_id: userId })
  if (purged.error) return { error: errorCode(purged.error) }
  const deleted = await admin.auth.admin.deleteUser(userId)
  if (deleted.error) return { error: errorCode(deleted.error) }

  // Le compte n'existe plus : il ne reste qu'à retirer les cookies de cet appareil.
  const out = await supabase.auth.signOut({ scope: 'local' })
  if (out.error) console.error('[beti] cookies de session non retirés après la suppression du compte', out.error)
  redirect(href(localeOf(formData)))
}
