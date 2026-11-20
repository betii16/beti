// Nettoyage du stockage côté serveur, avec la session de la personne : le
// stockage ne la laisse retirer que ses propres fichiers.

import type { createClient } from '@/lib/supabase/server'

type Server = Awaited<ReturnType<typeof createClient>>

/** Fichiers devenus inutiles. Un fichier resté en trop ne casse rien : il est consigné, pas montré. */
export async function removePhotos(supabase: Server, paths: string[]) {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from('media').remove(paths)
  if (error) console.error('[beti] photos non retirées du stockage', error)
}
