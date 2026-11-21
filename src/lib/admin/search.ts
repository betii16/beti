// Recherche par nom dans le panneau admin : le texte vient de l'adresse.

/** Texte cherché, nettoyé et borné ; '' si absent. */
export const searchText = (raw: string | string[] | undefined): string => (typeof raw === 'string' ? raw.trim().slice(0, 60) : '')

/** Motif ILIKE « contient », les jokers % et _ tapés par la personne étant pris à la lettre. */
export const containsPattern = (text: string): string => `%${text.replace(/[\\%_]/g, char => `\\${char}`)}%`
