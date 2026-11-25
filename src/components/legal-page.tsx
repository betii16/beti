import type { LegalDocument } from '@/legal/documents'

// Gabarit des textes juridiques : titre, date, avertissement, articles numérotés.
export function LegalPage({ doc }: { doc: LegalDocument }) {
  return (
    <main id="contenu" className="px-4 pb-6 sm:px-10">
      <article className="mx-auto flex max-w-[760px] flex-col gap-8 pt-4 lg:pt-8">
        <header className="flex flex-col gap-3">
          <h1 className="text-[clamp(1.75rem,3.4vw,2.375rem)] leading-[1.08] font-bold tracking-[-0.035em] text-balance">{doc.title}</h1>
          <p className="text-[15px] text-muted">{doc.updated}</p>
          {doc.intro && <p className="max-w-[65ch] text-lg text-body">{doc.intro}</p>}
        </header>
        {doc.note && <p className="rounded-[22px] bg-mist px-5 py-4 text-[15px] leading-relaxed">{doc.note}</p>}
        <ol className="flex flex-col gap-8">
          {doc.sections.map((section, i) => (
            <li key={section.h} className="flex flex-col gap-3 border-t border-line pt-6">
              <h2 className="text-xl font-semibold tracking-[-0.01em]">
                <span className="me-2 text-muted">{i + 1}.</span>
                {section.h}
              </h2>
              {section.body.map((paragraph, j) => (
                <p key={j} className="max-w-[68ch] leading-relaxed text-body">
                  {paragraph}
                </p>
              ))}
            </li>
          ))}
        </ol>
      </article>
    </main>
  )
}
