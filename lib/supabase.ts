import { createClient } from '@supabase/supabase-js'

const localStorageAdapter = typeof window !== 'undefined'
  ? {
      getItem:    (key: string) => window.localStorage.getItem(key),
      setItem:    (key: string, value: string) => window.localStorage.setItem(key, value),
      removeItem: (key: string) => window.localStorage.removeItem(key),
    }
  : undefined

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage:            localStorageAdapter,
      storageKey:         'beti-auth',
      persistSession:     true,
      autoRefreshToken:   true,
      detectSessionInUrl: false,
    },
  }
)