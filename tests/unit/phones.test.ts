import { describe, it, expect, vi, beforeEach } from 'vitest'

type Res = { data: unknown; error: unknown }
const absent = async (): Promise<Res> => ({ data: null, error: { message: 'absent' } })
const state = {
  rpc: absent as () => Promise<Res>,
  table: absent as (t: string) => Promise<Res>,
  neqCalls: [] as unknown[][],
}
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: () => state.rpc(),
    from: (t: string) => {
      const b: Record<string, unknown> = {}
      b.select = () => b
      b.in = () => state.table(t)
      b.eq = () => b
      b.neq = (...a: unknown[]) => { state.neqCalls.push(a); return b }
      b.limit = () => state.table(t)
      return b
    },
  },
}))
import { fetchPhones, fetchMyPhone, phoneTaken } from '@/lib/phones'

beforeEach(() => {
  state.neqCalls = []
  state.rpc = absent
  state.table = absent
})

describe('fetchPhones', () => {
  it('liste vide : pas de requête', async () => {
    state.table = async () => { throw new Error('ne doit pas être appelé') }
    expect(await fetchPhones([null, undefined, ''])).toEqual({})
  })
  it('construit la map et ignore les téléphones nuls', async () => {
    state.table = async () => ({ data: [{ id: 'a', phone: '+2135' }, { id: 'b', phone: null }], error: null })
    expect(await fetchPhones(['a', 'b', 'a'])).toEqual({ a: '+2135' })
  })
  it('table absente (erreur) : {}', async () => {
    expect(await fetchPhones(['a'])).toEqual({})
  })
  it('exception : {}', async () => {
    state.table = async () => { throw new Error('boom') }
    expect(await fetchPhones(['a'])).toEqual({})
  })
})

describe('fetchMyPhone', () => {
  it('préfère profile_private', async () => {
    state.table = async () => ({ data: [{ id: 'u', phone: '+213new' }], error: null })
    expect(await fetchMyPhone('u', '+213old')).toBe('+213new')
  })
  it('repli sur la valeur legacy puis chaîne vide', async () => {
    expect(await fetchMyPhone('u', '+213old')).toBe('+213old')
    expect(await fetchMyPhone('u')).toBe('')
  })
})

describe('phoneTaken', () => {
  it('utilise le booléen de la RPC', async () => {
    state.rpc = async () => ({ data: true, error: null })
    expect(await phoneTaken('+2135')).toBe(true)
    state.rpc = async () => ({ data: false, error: null })
    expect(await phoneTaken('+2135')).toBe(false)
  })
  it('RPC absente : repli sur la table', async () => {
    state.table = async () => ({ data: [{ id: 'x' }], error: null })
    expect(await phoneTaken('+2135')).toBe(true)
    state.table = async () => ({ data: [], error: null })
    expect(await phoneTaken('+2135')).toBe(false)
  })
  it('RPC qui lève : repli table, exclut soi-même', async () => {
    state.rpc = async () => { throw new Error('x') }
    state.table = async () => ({ data: [{ id: 'x' }], error: null })
    expect(await phoneTaken('+2135', 'me')).toBe(true)
    expect(state.neqCalls).toEqual([['id', 'me']])
  })
  it('tout échoue : false', async () => {
    state.rpc = async () => { throw new Error('x') }
    state.table = async () => { throw new Error('y') }
    expect(await phoneTaken('+2135')).toBe(false)
  })
})
