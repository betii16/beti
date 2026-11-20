// Ce qui vient du visiteur au moment de se connecter : son adresse e-mail, le
// code reçu, et la page où il voulait aller. Fonctions pures, testées dans
// tests/unit/auth.test.ts.

// Le réglage Supabase (Auth > Providers > Email > Email OTP Length) va de 6 à 10 chiffres :
// tout cet intervalle est accepté, le serveur d'authentification juge du reste.
const OTP_PATTERN = /^[0-9]{6,10}$/

/** Adresse telle qu'on l'envoie : sans espaces (même au milieu), en minuscules. */
export const normalizeEmail = (raw: string): string => raw.replace(/\s+/g, '').toLowerCase()

/** Contrôle volontairement simple (x@y.zz) : le serveur d'authentification reste juge. */
export const isValidEmail = (email: string): boolean => email.length <= 254 && /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)

const DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.con': 'gmail.com', 'gmaill.com': 'gmail.com',
  'gamil.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gnail.com': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'homail.com': 'hotmail.com', 'hotmai.com': 'hotmail.com',
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'yhoo.com': 'yahoo.com',
  'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'outloo.com': 'outlook.com',
}

/** Adresse corrigée à proposer si le domaine ressemble à une faute de frappe courante, sinon null. */
export function suggestEmail(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at < 1) return null
  const fixed = DOMAIN_TYPOS[email.slice(at + 1)]
  return fixed ? `${email.slice(0, at)}@${fixed}` : null
}

/** Code tel qu'on l'envoie : espaces retirés, chiffres arabes convertis ; null s'il n'a pas de 6 à 10 chiffres. */
export function normalizeCode(raw: string): string | null {
  const code = raw.replace(/\s+/g, '').replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660))
  return OTP_PATTERN.test(code) ? code : null
}

/**
 * Cookie de session présent ? Seul le jeton compte (sb-<projet>-auth-token, ou découpé en .0, .1…) :
 * les cookies « …-auth-token-code-verifier » posés à l'envoi d'un code ne sont pas une session.
 */
export const hasSessionCookie = (cookie: string): boolean => /(^|; )sb-[^=;]+-auth-token(\.\d+)?=/.test(cookie)

/**
 * Page de retour après connexion (?next=…) : uniquement une page du site, sous
 * /fr ou /ar, jamais un autre site ni la page de connexion elle-même. Sinon ''.
 */
export function safeNext(raw: string | null | undefined): string {
  const next = raw ?? ''
  if (next.length > 2048) return ''
  // Un navigateur retire tabulations et retours à la ligne d'une adresse : « /\t/evil.com » deviendrait « //evil.com ».
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return ''
  if (!/^\/(fr|ar)(\/|\?|$)/.test(next)) return ''
  if (/^\/(fr|ar)\/connexion(\/|\?|$)/.test(next)) return ''
  return next
}
