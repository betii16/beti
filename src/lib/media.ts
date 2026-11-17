// Adresse publique d'un fichier du stockage (espace « media » : avatars, photos
// de réalisations). Les chemins viennent de la base, qui n'enregistre que ceux
// qu'elle a contrôlés.

export const mediaUrl = (path: string): string =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path}`
