// lib/countryCodes.ts — indicatifs pays partagés (login + signup)
// `local: true` = numéro algérien (canal SMS par défaut) ; les autres seront
// routés vers WhatsApp quand le split sera activé côté serveur.

export type Country = { c: string; f: string; n: string; local?: boolean }

export const COUNTRY_CODES: Country[] = [
  { c: '+213', f: '🇩🇿', n: 'Algérie', local: true },
  { c: '+33',  f: '🇫🇷', n: 'France' },
  { c: '+212', f: '🇲🇦', n: 'Maroc' },
  { c: '+216', f: '🇹🇳', n: 'Tunisie' },
  { c: '+218', f: '🇱🇾', n: 'Libye' },
  { c: '+20',  f: '🇪🇬', n: 'Égypte' },
  { c: '+966', f: '🇸🇦', n: 'Arabie Saoudite' },
  { c: '+971', f: '🇦🇪', n: 'EAU' },
  { c: '+90',  f: '🇹🇷', n: 'Turquie' },
  { c: '+49',  f: '🇩🇪', n: 'Allemagne' },
  { c: '+44',  f: '🇬🇧', n: 'UK' },
  { c: '+1',   f: '🇺🇸', n: 'USA' },
  { c: '+39',  f: '🇮🇹', n: 'Italie' },
  { c: '+34',  f: '🇪🇸', n: 'Espagne' },
  { c: '+32',  f: '🇧🇪', n: 'Belgique' },
  { c: '+41',  f: '🇨🇭', n: 'Suisse' },
]

// Construit le numéro E.164 (ex : +213555123456) à partir d'un indicatif + saisie.
export const toE164 = (cc: string, raw: string) => `${cc}${raw.replace(/[\s\-().]/g, '').replace(/^0+/, '')}`
