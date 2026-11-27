// Erreurs que l'application sait expliquer.
// Les fonctions SQL lèvent des codes stables (raise exception 'not_found') que
// PostgREST renvoie dans error.message. Ce message n'est jamais montré tel quel :
// errorCode() le range dans une des clés ci-dessous, et les dictionnaires
// (src/i18n/dictionaries) donnent la phrase en français et en arabe.
// tests/unit/errors.test.ts vérifie que chaque code levé par le SQL est reconnu.

export const ERROR_CODES = [
  // session et droits
  'not_authenticated',
  'forbidden',
  'account_suspended',
  'not_an_artisan',
  // état des choses
  'not_found',
  'invalid_transition',
  'rate_limited',
  // demande et conversation
  'invalid_artisan',
  'artisan_unavailable',
  'too_many_pending',
  'conversation_closed',
  'not_sharing',
  // avis et signalements
  'booking_not_completed',
  'review_window_closed',
  'already_reviewed',
  'already_reported',
  'reports_limit',
  'details_required',
  // profil d'artisan et abonnement
  'listing_missing',
  'phone_required',
  'portfolio_limit',
  'already_pending',
  'skills_required',
  // équipe
  'cannot_suspend_staff',
  'staff_account',
  // connexion par code (service d'authentification, pas la base)
  'email_invalid',
  'email_not_deliverable',
  'code_invalid',
  'code_rate_limited',
  // saisie
  'invalid_full_name',
  'invalid_description',
  'invalid_date',
  'invalid_phone',
  'invalid_target',
  'invalid_photos',
  'invalid_location',
  'invalid_input',
  // hors base
  'network',
  'unknown',
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

const KNOWN: ReadonlySet<string> = new Set(ERROR_CODES)

// Codes du service d'authentification (connexion par code), rangés dans les nôtres.
const AUTH: Record<string, ErrorCode> = {
  otp_expired: 'code_invalid',
  over_email_send_rate_limit: 'code_rate_limited',
  over_sms_send_rate_limit: 'code_rate_limited',
  over_request_rate_limit: 'code_rate_limited',
  email_address_invalid: 'email_invalid',
  // Sans service d'envoi branché, Supabase n'écrit qu'aux adresses de l'équipe.
  email_address_not_authorized: 'email_not_deliverable',
  user_banned: 'account_suspended',
  session_not_found: 'not_authenticated',
  session_expired: 'not_authenticated',
  bad_jwt: 'not_authenticated',
  no_authorization: 'not_authenticated',
}

/** Range une erreur Supabase (ou n'importe quelle erreur) dans un code que l'on sait expliquer. */
export function errorCode(error: unknown): ErrorCode {
  const { message, code, name } = (error ?? {}) as { message?: unknown; code?: unknown; name?: unknown }
  if (typeof message === 'string') {
    if (KNOWN.has(message)) return message as ErrorCode
    // Les autres invalid_* doublent un contrôle que le formulaire fait déjà.
    if (/^invalid_[a-z_]+$/.test(message)) return 'invalid_input'
  }
  if (typeof code === 'string' && Object.hasOwn(AUTH, code)) return AUTH[code]
  // Le service d'authentification n'a pas pu être joint.
  if (name === 'AuthRetryableFetchError') return 'network'
  // Droit refusé par la base ou jeton expiré : la session n'est plus là.
  if (code === '42501' || code === 'PGRST301' || code === 'PGRST303') return 'not_authenticated'
  // Le client Supabase laisse code vide quand la requête n'a pas atteint le serveur.
  if (code === '') return 'network'
  // Rien n'est avalé en silence : ce qu'on ne sait pas expliquer est consigné.
  console.error('[beti] erreur non reconnue', error)
  return 'unknown'
}
