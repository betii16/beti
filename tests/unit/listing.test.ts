import { expect, it } from 'vitest'
import { formatPhone, normalizePhone, parseSkills } from '@/domain/listing'

it('regroupe un numéro algérien pour la lecture', () => {
  expect(formatPhone('+213555123456')).toBe('+213 555 12 34 56')
  expect(formatPhone('+21321234567')).toBe('+213 21 23 45 67')
  expect(formatPhone('+33612345678')).toBe('+33612345678')
})

it('met un numéro algérien au format international', () => {
  expect(normalizePhone('0555 12 34 56')).toBe('+213555123456')
  expect(normalizePhone('07.70.12.34.56')).toBe('+213770123456')
  expect(normalizePhone('021 23 45 67')).toBe('+21321234567')
  expect(normalizePhone('00213 555 12 34 56')).toBe('+213555123456')
  expect(normalizePhone('+213 555 12 34 56')).toBe('+213555123456')
  expect(normalizePhone('٠٥٥٥١٢٣٤٥٦')).toBe('+213555123456')
  // Ce que set_phone refuserait : trop court, lettres, indicatif absent ou commençant par 0.
  for (const wrong of ['', '0555', '0555 12 34 5x', '555123456', '+0555123456', '+213 (0)555']) expect(normalizePhone(wrong)).toBeNull()
})

it('découpe les spécialités sur les virgules françaises et arabes', () => {
  expect(parseSkills('fuite, chauffe-eau ,\nsanitaire')).toEqual(['fuite', 'chauffe-eau', 'sanitaire'])
  expect(parseSkills('تسربات، سخان')).toEqual(['تسربات', 'سخان'])
  expect(parseSkills(' , ,')).toEqual([])
})
