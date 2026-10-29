// Extensions d'images acceptées pour les envois vers le bucket public.
// On déduit l'extension du type MIME (jamais du nom de fichier fourni par l'utilisateur).
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export const imageExt = (file: File): string | null => EXT[file.type] || null
export const IMAGE_ERR = 'JPG, PNG ou WebP uniquement'
