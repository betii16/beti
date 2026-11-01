import { describe, it, expect } from 'vitest'
import { imageExt } from '@/lib/uploads'

const f = (type: string, name = 'x') => ({ type, name }) as File

describe('imageExt', () => {
  it('déduit l’extension du type MIME', () => {
    expect(imageExt(f('image/jpeg'))).toBe('jpg')
    expect(imageExt(f('image/png'))).toBe('png')
    expect(imageExt(f('image/webp'))).toBe('webp')
  })
  it.each([['image/svg+xml'], ['image/gif'], ['text/html'], ['application/pdf'], ['']])('refuse %j', t => {
    expect(imageExt(f(t))).toBeNull()
  })
  it('ignore le nom de fichier', () => {
    expect(imageExt(f('text/html', 'photo.jpg'))).toBeNull()
    expect(imageExt(f('image/png', 'evil.html'))).toBe('png')
  })
})
