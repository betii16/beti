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

const emptyResult = { data: [] as unknown[], error: null, count: 0 }
const emptyChain = (): any =>
  new Proxy(function () {}, {
    get: (_t, p) =>
      p === 'then'
        ? (res: any, rej: any) => Promise.resolve(emptyResult).then(res, rej)
        : p in emptyResult ? (emptyResult as any)[p] : emptyChain(),
    apply: () => emptyChain(),
  })

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
        detectSessionInUrl: true,
      },
    })
  : (new Proxy({} as SupabaseClient, {
      get: (_target, prop) => {
        // Sans configuration (build, aperçu local sans clés) : toute chaîne de requête
        // (from/rpc/select/eq/not/order/limit…) renvoie des données vides, sans erreur.
        if (prop === 'from' || prop === 'rpc') return () => emptyChain()
        if (prop === 'auth') {
          // ⚠️ Si on arrive ici au RUNTIME (pas juste au build), c'est que les
          // variables NEXT_PUBLIC_SUPABASE_* étaient absentes du build → toute
          // l'auth est inopérante. On renvoie la forme { data, error } habituelle
          // avec un message clair, au lieu d'un cryptique « is not a function ».
          const cfgErr = { message: 'Configuration Supabase absente (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY manquantes au build). Renseigne-les dans Vercel puis redéploie.' }
          return new Proxy({}, {
            get: (_t, m) => {
              if (m === 'getUser')           return async () => ({ data: { user: null }, error: null })
              if (m === 'getSession')        return async () => ({ data: { session: null }, error: null })
              if (m === 'onAuthStateChange') return () => ({ data: { subscription: { unsubscribe: () => {} } } })
              if (m === 'signOut')           return async () => ({ error: null })
              // signInWithPassword / signInWithOtp / verifyOtp / signUp / updateUser…
              return async () => ({ data: { user: null, session: null }, error: cfgErr })
            },
          })
        }
        if (prop === 'channel') return () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) })
        if (prop === 'removeChannel') return () => {}
        return () => {}
      }
    }))