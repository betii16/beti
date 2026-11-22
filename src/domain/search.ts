// Filtres de la recherche, tels qu'ils voyagent dans l'adresse :
// /recherche?categorie=plomberie&wilaya=16&q=fuite&pres=36.75,3.06&page=2
// L'adresse vient du visiteur : ce qui n'est pas valide est ignoré, jamais
// transmis à la base.

import { z } from 'zod'
import { fr } from '@/i18n/dictionaries/fr'

export type CategorySlug = keyof typeof fr.categories
export const CATEGORY_SLUGS = Object.keys(fr.categories) as [CategorySlug, ...CategorySlug[]]

/** Nombre d'artisans par page de résultats. */
export const PAGE_SIZE = 24

const schema = z.object({
  categorie: z.enum(CATEGORY_SLUGS).optional().catch(undefined),
  wilaya: z.coerce.number().int().min(1).max(58).optional().catch(undefined),
  // 60 caractères : la limite que la fonction search_artisans applique elle-même.
  q: z.string().trim().min(1).max(60).optional().catch(undefined),
  // « Près de moi » : latitude et longitude du visiteur, que le navigateur arrondit à 2 décimales (environ 1 km).
  pres: z
    .string()
    // Le motif d'abord : Number('') vaut 0, une moitié vide passerait pour une position.
    .regex(/^-?[0-9]{1,2}([.][0-9]+)?,-?[0-9]{1,3}([.][0-9]+)?$/)
    .transform(value => value.split(',').map(Number))
    .pipe(z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]))
    .optional()
    .catch(undefined),
  page: z.coerce.number().int().min(1).max(200).catch(1),
})

export type SearchFilters = z.infer<typeof schema>

export const parseSearch = (raw: Record<string, string | string[] | undefined>): SearchFilters => schema.parse(raw)

/** Partie « ?… » de l'adresse d'une recherche ; la page 1 et les filtres vides n'y figurent pas. */
export function searchQuery(filters: Partial<SearchFilters>): string {
  const params = new URLSearchParams()
  if (filters.categorie) params.set('categorie', filters.categorie)
  if (filters.wilaya) params.set('wilaya', String(filters.wilaya))
  if (filters.q) params.set('q', filters.q)
  if (filters.pres) params.set('pres', filters.pres.join(','))
  if (filters.page && filters.page > 1) params.set('page', String(filters.page))
  const query = params.toString()
  return query ? `?${query}` : ''
}
