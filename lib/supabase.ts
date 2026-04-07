import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ''
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const localStorageAdapter = typeof window !== 'undefined'
  ? {
      getItem:    (key: string) => window.localStorage.getItem(key),
      setItem:    (key: string, value: string) => window.localStorage.setItem(key, value),
      removeItem: (key: string) => window.localStorage.removeItem(key),
    }
  : undefined

/**
 * Supabase client — safe during build (returns a stub when env vars are absent).
 * At runtime the env vars are always present via Vercel.
 */
export const supabase: SupabaseClient = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnon, {
      auth: {
        storage:            localStorageAdapter,
        storageKey:         'beti-auth',
        persistSession:     true,
        autoRefreshToken:   true,
        detectSessionInUrl: false,
      },
    })
  : (new Proxy({} as SupabaseClient, {
      get: (_target, prop) => {
        // During build, return no-op functions that resolve to empty data
        if (prop === 'from') return () => ({
          select: () => ({ eq: () => ({ eq: () => ({ limit: () => ({ data: [], error: null }), data: [], error: null }), limit: () => ({ data: [], error: null }), data: [], error: null }), limit: () => ({ data: [], error: null }), data: [], error: null }),
        })
        if (prop === 'auth') return { getUser: async () => ({ data: { user: null }, error: null }), getSession: async () => ({ data: { session: null }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), signOut: async () => ({}) }
        if (prop === 'channel') return () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) })
        if (prop === 'removeChannel') return () => {}
        return () => {}
      }
    }))