// Ce que l'artisan saisit sur sa fiche, mis en forme avant l'envoi. La base
// revérifie tout (save_listing, set_phone) ; testé dans tests/unit/listing.test.ts.

/** Spécialités : séparées par des virgules (latines ou arabes) ou des retours à la ligne. La base garde 12 au plus. */
export const parseSkills = (raw: string): string[] =>
  raw
    .split(/[,،\n]/)
    .map(skill => skill.trim())
    .filter(Boolean)

/**
 * Numéro au format international (+213…), ou null s'il n'a pas une forme connue.
 * Accepte l'écriture courante en Algérie : 0555 12 34 56, 021 23 45 67, 00213…, chiffres arabes.
 */
export function normalizePhone(raw: string): string | null {
  const phone = raw.replace(/[\s().-]/g, '').replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660))
  if (/^\+[1-9]\d{7,14}$/.test(phone)) return phone
  if (/^00[1-9]\d{7,14}$/.test(phone)) return `+${phone.slice(2)}`
  // Mobile 05/06/07 suivi de 8 chiffres ; fixe 0 suivi de 8 chiffres.
  if (/^0[5-7]\d{8}$/.test(phone) || /^0[1-9]\d{7}$/.test(phone)) return `+213${phone.slice(1)}`
  return null
}

/** Numéro algérien regroupé pour la lecture (+213 555 12 34 56) ; les autres restent tels quels. */
export function formatPhone(phone: string): string {
  const local = /^\+213(\d{8,9})$/.exec(phone)?.[1]
  if (!local) return phone
  const head = local.length === 9 ? 3 : 2
  return ['+213', local.slice(0, head), ...(local.slice(head).match(/\d{2}/g) ?? [])].join(' ')
}
