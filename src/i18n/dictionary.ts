// Textes de l'interface dans la langue de la page. Les composants serveur les
// lisent ici ; un composant client reçoit en props les seuls textes qu'il affiche,
// pour ne pas embarquer tout le dictionnaire dans le navigateur.

import type { Locale } from './config'
import { ar } from './dictionaries/ar'
import { fr, type Dictionary } from './dictionaries/fr'

export type { Dictionary }

export const getDictionary = (locale: Locale): Dictionary => (locale === 'ar' ? ar : fr)
