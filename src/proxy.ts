// Avant chaque page : choisit la langue si l'adresse n'en a pas, puis renouvelle
// la session. Aucune décision d'accès ici : les droits sont vérifiés par la base
// (RLS et fonctions) et par les pages serveur.

import { NextResponse, type NextRequest } from 'next/server'
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from '@/i18n/config'
import { updateSession } from '@/lib/supabase/session'

/** Langue choisie par la personne (cookie), sinon celle du navigateur, sinon le français. */
function preferredLocale(request: NextRequest): Locale {
  const chosen = request.cookies.get(LOCALE_COOKIE)?.value
  if (chosen && isLocale(chosen)) return chosen
  for (const part of (request.headers.get('accept-language') ?? '').split(',')) {
    const code = part.split(';')[0].trim().slice(0, 2).toLowerCase()
    if (isLocale(code)) return code
  }
  return defaultLocale
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const first = pathname.split('/')[1] ?? ''
  if (!isLocale(first)) {
    const url = request.nextUrl.clone()
    url.pathname = `/${preferredLocale(request)}${pathname === '/' ? '' : pathname}`
    return NextResponse.redirect(url)
  }
  return updateSession(request)
}

export const config = {
  // Tout sauf les fichiers internes de Next, les routes d'API et les fichiers statiques.
  matcher: ['/((?!_next/|api/|.*\\.[a-zA-Z0-9]+$).*)'],
}
