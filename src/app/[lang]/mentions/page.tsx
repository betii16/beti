import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { LegalPage } from '@/components/legal-page'
import { href, isLocale } from '@/i18n/config'
import { LEGAL } from '@/legal/documents'

const doc = LEGAL.mentions

export const metadata: Metadata = { title: doc.title, description: doc.description }

export default async function LegalNoticePage({ params }: PageProps<'/[lang]/mentions'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  // Textes juridiques en français seulement (une langue par page) : l'adresse en arabe y renvoie.
  if (lang !== 'fr') redirect(href('fr', '/mentions'))
  return <LegalPage doc={doc} />
}
