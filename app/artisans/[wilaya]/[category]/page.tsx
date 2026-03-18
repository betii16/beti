import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const WILAYAS: Record<string, { name: string; lat: number; lng: number; num: number }> = {
  'alger':         { name: 'Alger',          lat: 36.7538, lng: 3.0588,  num: 16 },
  'oran':          { name: 'Oran',            lat: 35.6969, lng: -0.6331, num: 31 },
  'constantine':   { name: 'Constantine',     lat: 36.3650, lng: 6.6147,  num: 25 },
  'annaba':        { name: 'Annaba',          lat: 36.9000, lng: 7.7667,  num: 23 },
  'blida':         { name: 'Blida',           lat: 36.4700, lng: 2.8300,  num: 9  },
  'batna':         { name: 'Batna',           lat: 35.5559, lng: 6.1741,  num: 5  },
  'setif':         { name: 'Sétif',           lat: 36.1898, lng: 5.4108,  num: 19 },
  'tizi-ouzou':    { name: 'Tizi Ouzou',      lat: 36.7167, lng: 4.0500,  num: 15 },
  'bejaia':        { name: 'Béjaïa',          lat: 36.7515, lng: 5.0564,  num: 6  },
  'tlemcen':       { name: 'Tlemcen',         lat: 34.8786, lng: -1.3175, num: 13 },
  'sidi-bel-abbes':{ name: 'Sidi Bel Abbès',  lat: 35.1899, lng: -0.6300, num: 22 },
  'biskra':        { name: 'Biskra',          lat: 34.8500, lng: 5.7333,  num: 7  },
  'ouargla':       { name: 'Ouargla',         lat: 31.9500, lng: 5.3167,  num: 30 },
  'boumerdes':     { name: 'Boumerdès',       lat: 36.7667, lng: 3.4769,  num: 35 },
  'tipaza':        { name: 'Tipaza',          lat: 36.5892, lng: 2.4478,  num: 42 },
}

const CATEGORIES: Record<string, { label: string; labelPlural: string; icon: string; desc: string }> = {
  plomberie:    { label: 'Plombier',      labelPlural: 'Plombiers',      icon: '⚙', desc: 'fuite d\'eau, installation sanitaire, débouchage, chauffe-eau' },
  electricite:  { label: 'Électricien',   labelPlural: 'Électriciens',   icon: '⚡', desc: 'installation électrique, tableau électrique, dépannage' },
  menage:       { label: 'Ménage',        labelPlural: 'Femmes de ménage',icon: '✦', desc: 'nettoyage domicile, entretien maison, femme de ménage' },
  demenagement: { label: 'Déménageur',    labelPlural: 'Déménageurs',    icon: '◈', desc: 'déménagement, transport meubles, emballage' },
  jardinage:    { label: 'Jardinier',     labelPlural: 'Jardiniers',     icon: '❧', desc: 'entretien jardin, taille haies, pelouse, plantes' },
  peinture:     { label: 'Peintre',       labelPlural: 'Peintres',       icon: '◉', desc: 'peinture intérieure, extérieure, ravalement façade' },
  serrurerie:   { label: 'Serrurier',     labelPlural: 'Serruriers',     icon: '⌘', desc: 'dépannage serrure, porte blindée, ouverture porte' },
  informatique: { label: 'Informaticien', labelPlural: 'Informaticiens', icon: '⬡', desc: 'réparation PC, réseau wifi, installation logiciels' },
  coiffure:     { label: 'Coiffeur',      labelPlural: 'Coiffeurs',      icon: '✂', desc: 'coiffure à domicile, coupe, coloration, brushing' },
}

export async function generateMetadata({ params }: { params: { wilaya: string; category: string } }): Promise<Metadata> {
  const w = WILAYAS[params.wilaya]
  const c = CATEGORIES[params.category]
  if (!w || !c) return {}

  const title = `${c.label} à ${w.name} — Certifié BETI | Disponible maintenant`
  const description = `Trouvez un ${c.label.toLowerCase()} certifié à ${w.name} (wilaya ${w.num}). ${c.desc}. Intervention rapide, paiement en cash. Devis gratuit.`

  return {
    title,
    description,
    keywords: [
      `${c.label.toLowerCase()} ${w.name.toLowerCase()}`,
      `${c.label.toLowerCase()} wilaya ${w.num}`,
      `${c.label.toLowerCase()} domicile ${w.name.toLowerCase()}`,
      `${c.labelPlural.toLowerCase()} ${w.name.toLowerCase()}`,
      `${c.desc.split(',')[0]} ${w.name.toLowerCase()}`,
    ],
    openGraph: {
      title,
      description,
      url: `https://beti.dz/artisans/${params.wilaya}/${params.category}`,
    },
    alternates: { canonical: `https://beti.dz/artisans/${params.wilaya}/${params.category}` },
  }
}

export async function generateStaticParams() {
  return Object.keys(WILAYAS).flatMap(w =>
    Object.keys(CATEGORIES).map(c => ({ wilaya: w, category: c }))
  )
}

export default async function WilayaCategoryPage({ params }: { params: { wilaya: string; category: string } }) {
  const w = WILAYAS[params.wilaya]
  const c = CATEGORIES[params.category]
  if (!w || !c) notFound()

  const { data: artisans } = await supabase
    .from('artisans')
    .select('id, hourly_rate, is_available, rating_avg, rating_count, total_missions, profiles(full_name)')
    .eq('category', params.category)
    .eq('is_available', true)
    .limit(12)

  // Schema.org
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    'serviceType': c.label,
    'provider': { '@type': 'Organization', 'name': 'BETI' },
    'areaServed': { '@type': 'City', 'name': w.name, 'addressCountry': 'DZ' },
    'description': `${c.labelPlural} certifiés BETI à ${w.name} — ${c.desc}`,
    'url': `https://beti.dz/artisans/${params.wilaya}/${params.category}`,
    'offers': {
      '@type': 'AggregateOffer',
      'priceCurrency': 'DZD',
      'availability': 'https://schema.org/InStock',
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}/>

      <div style={{ minHeight: '100vh', background: '#0D0D12', paddingTop: 80, fontFamily: 'Nexa, sans-serif' }}>
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 40px 40px' }}>
          {/* Fil d'ariane */}
          <div style={{ fontSize: 12, color: '#555', marginBottom: 16, display: 'flex', gap: 6, alignItems: 'center' }}>
            <a href="/" style={{ color: '#555', textDecoration: 'none' }}>Accueil</a> /
            <a href={`/artisans/${params.wilaya}`} style={{ color: '#555', textDecoration: 'none' }}>{w.name}</a> /
            <span style={{ color: '#C9A84C' }}>{c.label}</span>
          </div>

          <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.1em', marginBottom: 8 }}>
            {c.icon} {c.labelPlural.toUpperCase()}
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 800, color: '#F0EDE8', marginBottom: 16, lineHeight: 1.1 }}>
            {c.label} à {w.name}
          </h1>
          <p style={{ fontSize: 15, color: '#555', maxWidth: 600, lineHeight: 1.7, fontWeight: 300, marginBottom: 32 }}>
            Trouvez un {c.label.toLowerCase()} certifié BETI à {w.name} (wilaya {w.num}). 
            Spécialisé en {c.desc}. Intervention rapide, devis gratuit, paiement en cash.
          </p>

          <a href={`/?wilaya=${params.wilaya}&category=${params.category}`}>
            <button style={{ padding: '12px 28px', borderRadius: 10, background: '#C9A84C', border: 'none', color: '#0D0D12', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
              Trouver un {c.label.toLowerCase()} maintenant
            </button>
          </a>
        </section>

        {/* Artisans */}
        {artisans && artisans.length > 0 && (
          <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px 48px' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#F0EDE8', marginBottom: 20 }}>
              {c.labelPlural} disponibles à {w.name}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {artisans.map((a: any) => (
                <a key={a.id} href={`/artisan/${a.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '18px' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8', marginBottom: 4 }}>{a.profiles?.full_name}</div>
                    <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, marginBottom: 10 }}>{c.label} certifié BETI</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#4ade80' }}>● Disponible</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#C9A84C' }}>{a.hourly_rate} DA/h</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Autres catégories dans cette wilaya */}
        <section style={{ background: '#09090f', borderTop: '0.5px solid #1e1e2a', padding: '40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#F0EDE8', marginBottom: 16 }}>Autres services à {w.name}</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(CATEGORIES).filter(([id]) => id !== params.category).map(([id, cat]) => (
                <a key={id} href={`/artisans/${params.wilaya}/${id}`} style={{ fontSize: 12, color: '#444', textDecoration: 'none', padding: '4px 12px', borderRadius: 20, border: '0.5px solid #1e1e2a' }}>
                  {cat.label} {w.name}
                </a>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
