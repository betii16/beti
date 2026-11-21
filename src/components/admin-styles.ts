// Classes des boutons et champs du panneau admin, plus compacts que ceux du site :
// l'équipe traite des listes. Un fichier à part, lisible côté serveur comme côté client.

export const ADMIN_BUTTON =
  'inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full px-4 text-[15px] font-semibold transition-colors disabled:cursor-wait disabled:opacity-60'
export const ADMIN_DARK = `${ADMIN_BUTTON} bg-ink text-paper hover:bg-accent hover:text-ink`
export const ADMIN_LIGHT = `${ADMIN_BUTTON} bg-mist hover:bg-ink hover:text-paper`
export const ADMIN_INPUT = 'min-h-10 rounded-full bg-mist px-4 text-[15px]'
