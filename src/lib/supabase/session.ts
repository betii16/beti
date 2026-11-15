// Rafraîchit la session Supabase (cookies) à chaque requête de page.
// Appelé par src/proxy.ts. Sans lui, un jeton expiré ne serait jamais renouvelé
// côté serveur et la personne serait déconnectée au hasard.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return response
  // Visiteur sans session : rien à rafraîchir, la page reste servie depuis le cache.
  if (!request.cookies.getAll().some(c => c.name.startsWith('sb-'))) return response

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        // en-têtes anti-cache fournis par la bibliothèque : une réponse qui pose un
        // jeton ne doit jamais être mise en cache par un CDN
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value))
      },
    },
  })
  // Vérifie la signature du jeton et le renouvelle s'il a expiré.
  await supabase.auth.getClaims()
  return response
}
