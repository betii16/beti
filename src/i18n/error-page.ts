// Textes des pages d'erreur. Ce sont des composants client que le serveur ne
// rend pas : ils ne peuvent pas recevoir le dictionnaire en props, et l'importer
// entier l'embarquerait dans chaque page. Ces quelques phrases restent donc ici.

import type { Locale } from './config'

type ErrorTexts = { title: string; text: string; retry: string; home: string }

export const errorPageTexts: Record<Locale, ErrorTexts> = {
  fr: {
    title: 'Cette page n’a pas pu s’afficher',
    text: 'Un problème est survenu de notre côté. Réessayez ; s’il se répète, revenez dans quelques minutes.',
    retry: 'Réessayer',
    home: 'Revenir à l’accueil',
  },
  ar: {
    title: 'تعذّر عرض هذه الصفحة',
    text: 'حدث خلل من جهتنا. أعد المحاولة، وإن تكرر فعد بعد بضع دقائق.',
    retry: 'أعد المحاولة',
    home: 'العودة إلى الرئيسية',
  },
}
