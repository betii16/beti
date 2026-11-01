// Connexion / inscription des CLIENTS par code reçu par e-mail (gratuit).
// Les artisans gardent le code téléphone (WhatsApp/SMS) : c'est lui qui rend vraie
// la mention « numéro vérifié ». Fonctions pures, sans dépendance React.

/**
 * Longueur du code e-mail. À aligner avec Supabase (Auth > Providers > Email >
 * « Email OTP Length »). Une seule constante : la changer ici suffit côté interface.
 */
export const EMAIL_OTP_LENGTH = 6

/** Rôle envoyé en métadonnées pour le flux e-mail : toujours 'client', jamais autre chose. */
export const EMAIL_FLOW_ROLE = 'client' as const

/** Normalise une adresse saisie : espaces retirés (y compris internes), minuscules. */
export function normalizeEmail(raw: string): string {
  return raw.replace(/\s+/g, '').toLowerCase()
}

/** Validation volontairement simple : x@y.zz, sans espace. Le serveur reste juge. */
export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)
}

const DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.con': 'gmail.com', 'gmaill.com': 'gmail.com',
  'gamil.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gnail.com': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'homail.com': 'hotmail.com', 'hotmai.com': 'hotmail.com',
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'yhoo.com': 'yahoo.com',
  'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'outloo.com': 'outlook.com',
}

/** Adresse corrigée proposée si le domaine ressemble à une faute fréquente, sinon null. */
export function suggestEmail(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at < 1) return null
  const fixed = DOMAIN_TYPOS[email.slice(at + 1)]
  return fixed ? `${email.slice(0, at)}@${fixed}` : null
}

/** Le serveur dit qu'aucun compte n'existe (connexion avec shouldCreateUser: false). */
export const NO_ACCOUNT_RE = /not found|no user|sign.?ups? not allowed|shouldCreateUser/i
