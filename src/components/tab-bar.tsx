'use client'

// Barre d'onglets du téléphone, fixée en bas de l'écran : le site sert aussi
// d'appli (Capacitor le charge tel quel). Sur écran large elle disparaît, l'en-tête suffit.
// Comme l'en-tête, elle ne regarde que la présence du cookie de session pour choisir
// « Connexion » ou « Mon compte » : ce n'est pas un contrôle d'accès.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useSyncExternalStore } from 'react'
import { Bell, ClipboardList, House, Search, UserRound, type LucideIcon } from 'lucide-react'
import { href, type Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { hasSessionCookie } from '@/lib/auth/input'
import { refreshUnread, useUnread } from '@/lib/notifications/unread'
import { createClient } from '@/lib/supabase/browser'

const noSubscription = () => () => {}
const readCookie = () => hasSessionCookie(document.cookie)

type Tab = { path: string; label: string; icon: LucideIcon; sections: string[]; badge?: number }

export function TabBar({ lang, t }: { lang: Locale; t: Dictionary['nav'] }) {
  const pathname = usePathname()
  const signedIn = useSyncExternalStore(noSubscription, readCookie, () => false)
  const unread = useUnread()

  // Recompté à chaque page : en ouvrir une peut marquer des notifications lues.
  useEffect(() => {
    void refreshUnread()
  }, [pathname])

  // Et dès qu'une notification arrive ou change, sans attendre la page suivante.
  useEffect(() => {
    if (!signedIn) return
    const supabase = createClient()
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => void refreshUnread())
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [signedIn])

  // /fr/demandes/123 → « demandes » ; l'accueil n'a pas de section.
  const section = pathname.split('/')[2] ?? ''
  const tabs: Tab[] = [
    { path: '', label: t.tabHome, icon: House, sections: [''] },
    { path: '/recherche', label: t.tabSearch, icon: Search, sections: ['recherche', 'artisans'] },
    { path: '/demandes', label: t.tabRequests, icon: ClipboardList, sections: ['demandes'] },
    { path: '/notifications', label: t.tabAlerts, icon: Bell, sections: ['notifications'], badge: unread },
    { path: signedIn ? '/compte' : '/connexion', label: signedIn ? t.account : t.login, icon: UserRound, sections: ['compte', 'connexion', 'artisan'] },
  ]

  return (
    <nav aria-label={t.tabs} className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] sm:hidden">
      <ul className="grid grid-cols-5">
        {tabs.map(({ path, label, icon: Icon, sections, badge = 0 }) => {
          const current = sections.includes(section)
          return (
            <li key={label}>
              <Link
                href={href(lang, path)}
                aria-current={current ? 'page' : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] ${current ? 'font-semibold text-ink' : 'font-medium text-muted'}`}
              >
                <span className={`relative flex h-8 w-14 items-center justify-center rounded-full ${current ? 'bg-accent text-ink' : ''}`}>
                  <Icon aria-hidden className="size-[22px]" strokeWidth={current ? 2.4 : 2} />
                  {badge > 0 && (
                    <span className="absolute -top-1 end-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ink px-1 text-[11px] leading-none font-semibold text-paper">
                      <span aria-hidden>{badge > 9 ? '9+' : badge}</span>
                      <span className="sr-only">{t.unread.replace('{n}', String(badge))}</span>
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
