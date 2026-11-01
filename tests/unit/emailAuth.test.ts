import { describe, it, expect } from 'vitest'
import { EMAIL_OTP_LENGTH, EMAIL_FLOW_ROLE, normalizeEmail, isValidEmail, suggestEmail, NO_ACCOUNT_RE } from '@/lib/emailAuth'

describe('emailAuth', () => {
  it('normalise : espaces retirés et minuscules', () => {
    expect(normalizeEmail('  Amine@Gmail.COM ')).toBe('amine@gmail.com')
    expect(normalizeEmail('a mine@gmail.com')).toBe('amine@gmail.com')
  })
  it.each(['a@b.co', 'amine.b+x@gmail.com', 'x@sub.domaine.dz'])('accepte %s', e => expect(isValidEmail(e)).toBe(true))
  it.each(['', 'a', 'a@', '@b.com', 'a@b', 'a@b.', 'a@@b.com', 'a b@c.com', 'a@b..com', 'a@.com'])('refuse %j', e => expect(isValidEmail(e)).toBe(false))
  it('refuse une adresse démesurée', () => expect(isValidEmail('a@' + 'b'.repeat(260) + '.com')).toBe(false))
  it.each([['x@gmial.com', 'x@gmail.com'], ['x@hotmial.com', 'x@hotmail.com'], ['x@yaho.com', 'x@yahoo.com']])('suggère %s -> %s', (i, o) => expect(suggestEmail(i)).toBe(o))
  it('ne suggère rien pour un domaine correct ou inconnu', () => {
    expect(suggestEmail('x@gmail.com')).toBeNull()
    expect(suggestEmail('x@entreprise.dz')).toBeNull()
    expect(suggestEmail('pas-un-email')).toBeNull()
  })
  it('code à 6 chiffres par défaut, rôle borné à client', () => {
    expect(EMAIL_OTP_LENGTH).toBe(6)
    expect(EMAIL_FLOW_ROLE).toBe('client')
  })
  it('reconnaît « compte inexistant »', () => {
    expect(NO_ACCOUNT_RE.test('Signups not allowed for otp')).toBe(true)
    expect(NO_ACCOUNT_RE.test('email rate limit exceeded')).toBe(false)
  })
})
