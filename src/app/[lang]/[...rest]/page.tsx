import { notFound } from 'next/navigation'

// Toute adresse inconnue sous /fr ou /ar : la page 404 du site, dans la bonne
// langue et avec son en-tête, au lieu de la page nue de Next.
export default function UnknownPage() {
  notFound()
}
