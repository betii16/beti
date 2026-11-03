// components/SlotPhoto.tsx
// Affiche /photos/<slot>.<ext> en remplissant son parent (position: relative
// + dimensions/ratio fixés par le parent). Rend null si le fichier n'existe
// pas : le parent garde son affichage de repli. `scrim` ajoute un voile sobre
// seulement quand une photo est présente.
import Image from 'next/image'
import { photoSrc } from '@/lib/photos'

export default function SlotPhoto({
  slot, alt, sizes, scrim,
}: { slot: string; alt: string; sizes: string; scrim?: string }) {
  const src = photoSrc(slot)
  if (!src) return null
  return (
    <>
      <Image src={src} alt={alt} fill sizes={sizes} loading="lazy" style={{ objectFit: 'cover' }} />
      {scrim ? <span aria-hidden style={{ position: 'absolute', inset: 0, background: scrim }} /> : null}
    </>
  )
}
