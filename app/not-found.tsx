import NotFoundContent from '@/components/NotFoundContent'

// Page 404 brandée — rendue dans le RootLayout (thème et LangProvider disponibles).
// Le texte, traduit FR/AR, est dans un composant client.
export const metadata = { title: 'Page introuvable' }

export default function NotFound() {
  return <NotFoundContent />
}
