// Photos envoyées depuis le navigateur. Chacune est réduite et réencodée en JPEG
// avant l'envoi : le stockage refuse plus de 5 Mo, et le réencodage retire les
// métadonnées d'une photo de téléphone, dont la position GPS de la prise de vue.

import { errorCode, type ErrorCode } from '@/lib/errors'
import { createClient } from '@/lib/supabase/browser'

/** Côté le plus long d'une photo envoyée, en pixels : net sur un écran, loin des 5 Mo. */
export const MAX_SIDE = 1600

/** Dimensions ramenées à `max` pixels au plus sur le côté le plus long, proportions gardées. */
export function fitWithin(width: number, height: number, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Photo réduite et réencodée en JPEG ; échoue si le navigateur ne sait pas la lire. */
export async function compressImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWithin(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas indisponible')
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('encodage impossible'))), 'image/jpeg', 0.85))
}

type Upload = { paths: string[]; error?: undefined } | { paths?: undefined; error: ErrorCode }

/**
 * Envoie des photos dans un dossier que le stockage ouvre à la personne : avatars/<son id>,
 * portfolio/<son id>, ou reviews/<id d'une de ses demandes terminées>. Tout ou rien : si une
 * photo échoue, celles déjà envoyées sont retirées.
 */
export async function uploadPhotos(folder: string, files: File[]): Promise<Upload> {
  const storage = createClient().storage.from('media')
  const paths: string[] = []
  let failure: ErrorCode | null = null
  for (const file of files) {
    let blob: Blob
    try {
      blob = await compressImage(file)
    } catch (error) {
      console.error('[beti] photo illisible', error)
      failure = 'invalid_photos'
      break
    }
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`
    const { error } = await storage.upload(path, blob, { contentType: 'image/jpeg', upsert: false })
    if (error) {
      failure = errorCode(error)
      break
    }
    paths.push(path)
  }
  if (failure === null) return { paths }
  if (paths.length > 0) {
    const { error } = await storage.remove(paths)
    if (error) console.error('[beti] photos envoyées non retirées', error)
  }
  return { error: failure }
}
