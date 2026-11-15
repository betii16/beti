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
  // équipe
  'cannot_suspend_staff',
  // saisie
  'invalid_phone',
  'invalid_photos',
  'invalid_location',
  'invalid_input',
  // hors base
  'network',
  'unknown',
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

const KNOWN: ReadonlySet<string> = new Set(ERROR_CODES)

/** Range une erreur Supabase (ou n'importe quelle erreur) dans un code que l'on sait expliquer. */
export function errorCode(error: unknown): ErrorCode {
  const { message, code } = (error ?? {}) as { message?: unknown; code?: unknown }
  if (typeof message === 'string') {
    if (KNOWN.has(message)) return message as ErrorCode
    // Les autres invalid_* doublent un contrôle que le formulaire fait déjà.
    if (/^invalid_[a-z_]+$/.test(message)) return 'invalid_input'
  }
  // Droit refusé par la base ou jeton expiré : la session n'est plus là.
  if (code === '42501' || code === 'PGRST301' || code === 'PGRST303') return 'not_authenticated'
  // Le client Supabase laisse code vide quand la requête n'a pas atteint le serveur.
  if (code === '') return 'network'
  // Rien n'est avalé en silence : ce qu'on ne sait pas expliquer est consigné.
  console.error('[beti] erreur non reconnue', error)
  return 'unknown'
}
