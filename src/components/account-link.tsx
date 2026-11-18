'use client'

// Bouton de l'en-tête : « Connexion », ou « Mon compte » quand une session existe.
// Il ne regarde que la présence du cookie de session, pour choisir un libellé :
// ce n'est pas un contrôle d'accès (celui-là est fait par le serveur). Ainsi
// l'en-tête ne lit rien côté serveur et les pages publiques restent statiques.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import { href, type Locale } from '@/i18n/config'

const noSubscription = () => () => {}
const hasSessionCookie = () => /(^|; )sb-[^=;]+-auth-token/.test(document.cookie)

export function AccountLink({ lang, login, account }: { lang: Locale; login: string; account: string }) {
  // Relu à chaque navigation : après une connexion ou une déconnexion, le libellé suit.
  usePathname()
  const signedIn = useSyncExternalStore(noSubscription, hasSessionCookie, () => false)
  return (
    <Link
      href={href(lang, signedIn ? '/compte' : '/connexion')}
      className="inline-flex min-h-[46px] items-center rounded-full bg-ink px-5 font-semibold whitespace-nowrap text-paper sm:px-6"
    >
      {signedIn ? account : login}
    </Link>
  )
}
