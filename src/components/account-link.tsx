'use client'

// Bouton de l'en-tête : « Connexion », ou « Mon compte » quand une session existe.
// Il ne regarde que la présence du cookie de session, pour choisir un libellé :
// ce n'est pas un contrôle d'accès (celui-là est fait par le serveur). Ainsi
// l'en-tête ne lit rien côté serveur et les pages publiques restent statiques.
// Sur téléphone il s'efface : la barre d'onglets (tab-bar.tsx) porte le même lien.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import { href, type Locale } from '@/i18n/config'
import { hasSessionCookie } from '@/lib/auth/input'
import { useUnread } from '@/lib/notifications/unread'

const noSubscription = () => () => {}
const readCookie = () => hasSessionCookie(document.cookie)

export function AccountLink({ lang, login, account, unreadLabel }: { lang: Locale; login: string; account: string; unreadLabel: string }) {
  // Relu à chaque navigation : après une connexion ou une déconnexion, le libellé suit.
  usePathname()
  const signedIn = useSyncExternalStore(noSubscription, readCookie, () => false)
  // Tenu à jour par la barre d'onglets, présente sur toutes les pages.
  const unread = useUnread()
  return (
    <Link
      href={href(lang, signedIn ? '/compte' : '/connexion')}
      className="hidden min-h-[46px] items-center gap-2 rounded-full bg-ink px-6 font-semibold whitespace-nowrap text-paper sm:inline-flex"
    >
      {signedIn ? account : login}
      {signedIn && unread > 0 && (
        <span className="rounded-full bg-accent px-2 py-0.5 text-sm leading-tight text-ink">
          <span aria-hidden>{unread > 9 ? '9+' : unread}</span>
          <span className="sr-only">{unreadLabel.replace('{n}', String(unread))}</span>
        </span>
      )}
    </Link>
  )
}
