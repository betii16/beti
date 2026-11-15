import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'

// Page provisoire : elle prouve que le socle (langues, sens d'écriture, proxy,
// compilation) fonctionne. L'accueil sera construit avec la nouvelle identité.
export default async function Home({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-3xl font-bold">BETI</h1>
      <p className="mt-3">
        {lang === 'ar' ? 'الأساس جاهز. الواجهة الجديدة قيد الإنشاء.' : 'Le socle est en place. La nouvelle interface arrive.'}
      </p>
    </main>
  )
}
