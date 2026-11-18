// Lecture des champs d'un formulaire dans une action serveur. Tout vient du
// navigateur : un champ absent, ou un fichier à la place d'un texte, vaut ''.

import { defaultLocale, isLocale, type Locale } from '@/i18n/config'

export const field = (formData: FormData, name: string): string => {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

/** Langue de la page qui a envoyé le formulaire (champ caché « lang »), pour savoir où renvoyer. */
export const localeOf = (formData: FormData): Locale => {
  const lang = field(formData, 'lang')
  return isLocale(lang) ? lang : defaultLocale
}
