import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Données wilayas ────────────────────────────────────────────────

const WILAYAS: Record<string, { name: string; nameAr: string; lat: number; lng: number; num: number }> = {
  'alger':         { name: 'Alger',          nameAr: 'الجزائر',    lat: 36.7538, lng: 3.0588,  num: 16 },
  'oran':          { name: 'Oran',            nameAr: 'وهران',      lat: 35.6969, lng: -0.6331, num: 31 },
  'constantine':   { name: 'Constantine',     nameAr: 'قسنطينة',   lat: 36.3650, lng: 6.6147,  num: 25 },
  'annaba':        { name: 'Annaba',          nameAr: 'عنابة',      lat: 36.9000, lng: 7.7667,  num: 23 },
  'blida':         { name: 'Blida',           nameAr: 'البليدة',    lat: 36.4700, lng: 2.8300,  num: 9  },
  'batna':         { name: 'Batna',           nameAr: 'باتنة',      lat: 35.5559, lng: 6.1741,  num: 5  },
  'setif':         { name: 'Sétif',           nameAr: 'سطيف',       lat: 36.1898, lng: 5.4108,  num: 19 },
  'tizi-ouzou':    { name: 'Tizi Ouzou',      nameAr: 'تيزي وزو',  lat: 36.7167, lng: 4.0500,  num: 15 },
  'bejaia':        { name: 'Béjaïa',          nameAr: 'بجاية',      lat: 36.7515, lng: 5.0564,  num: 6  },
  'tlemcen':       { name: 'Tlemcen',         nameAr: 'تلمسان',     lat: 34.8786, lng: -1.3175, num: 13 },
  'sidi-bel-abbes':{ name: 'Sidi Bel Abbès',  nameAr: 'سيدي بلعباس',lat: 35.1899, lng: -0.6300, num: 22 },
  'biskra':        { name: 'Biskra',          nameAr: 'بسكرة',      lat: 34.8500, lng: 5.7333,  num: 7  },
  'ouargla':       { name: 'Ouargla',         nameAr: 'ورقلة',      lat: 31.9500, lng: 5.3167,  num: 30 },
  'mostaganem':    { name: 'Mostaganem',      nameAr: 'مستغانم',    lat: 35.9333, lng: 0.0833,  num: 27 },
  'mascara':       { name: 'Mascara',         nameAr: 'معسكر',      lat: 35.3958, lng: 0.1403,  num: 29 },
  'tiaret':        { name: 'Tiaret',          nameAr: 'تيارت',      lat: 35.3706, lng: 1.3211,  num: 14 },
  'medea':         { name: 'Médéa',           nameAr: 'المدية',     lat: 36.2639, lng: 2.7500,  num: 26 },
  'chlef':         { name: 'Chlef',           nameAr: 'الشلف',      lat: 36.1650, lng: 1.3317,  num: 2  },
  'boumerdes':     { name: 'Boumerdès',       nameAr: 'بومرداس',    lat: 36.7667, lng: 3.4769,  num: 35 },
  'tipaza':        { name: 'Tipaza',          nameAr: 'تيبازة',     lat: 36.5892, lng: 2.4478,  num: 42 },
  'ghardaia':      { name: 'Ghardaïa',        nameAr: 'غرداية',     lat: 32.4833, lng: 3.6667,  num: 47 },
  'el-oued':       { name: 'El Oued',         nameAr: 'الوادي',     lat: 33.3667, lng: 6.8500,  num: 39 },
  'skikda':        { name: 'Skikda',          nameAr: 'سكيكدة',     lat: 36.8762, lng: 6.9069,  num: 21 },
  'guelma':        { name: 'Guelma',          nameAr: 'قالمة',      lat: 36.4628, lng: 7.4264,  num: 24 },
  'jijel':         { name: 'Jijel',           nameAr: 'جيجل',       lat: 36.8200, lng: 5.7667,  num: 18 },
  'souk-ahras':    { name: 'Souk Ahras',      nameAr: 'سوق أهراس',  lat: 36.2841, lng: 7.9546,  num: 41 },
  'bechar':        { name: 'Béchar',          nameAr: 'بشار',       lat: 31.6167, lng: -2.2167, num: 8  },
}

const CATEGORIES_LABELS: Record<string, string> = {
  plomberie: 'Plombier', electricite: 'Électricien', menage: 'Ménage',
  demenagement: 'Déménagement', jardinage: 'Jardinier', peinture: 'Peintre',
  serrurerie: 'Serrurier', informatique: 'Informaticien', coiffure: 'Coiffeur',
}

// ── Metadata dynamique ─────────────────────────────────────────────

export async function generateMetadata({ params }: { params: { wilaya: string } }): Promise<Metadata> {
  const w = WILAYAS[params.wilaya]
  if (!w) return {}

  const title = `Artisans à ${w.name} — Plombier, Électricien, Ménage | BETI`
  const description = `Trouvez un artisan certifié à ${w.name} (wilaya ${w.num}). Plombier, électricien, femme de ménage, peintre disponibles maintenant. Intervention rapide, paiement en cash.`

  return {
    title,
    description,
    keywords: [
      `artisan ${w.name.toLowerCase()}`,
      `plombier ${w.name.toLowerCase()}`,
      `electricien ${w.name.toLowerCase()}`,
      `menage ${w.name.toLowerCase()}`,
      `serrurerie ${w.name.toLowerCase()}`,
      `peintre ${w.name.toLowerCase()}`,
      `artisan wilaya ${w.num}`,
      `service domicile ${w.name.toLowerCase()}`,
    ],
    openGraph: {
      title,
      description,
      url: `https://beti.dz/artisans/${params.wilaya}`,
      locale: 'fr_DZ',
    },
    alternates: { canonical: `https://beti.dz/artisans/${params.wilaya}` },
  }
}

export async function generateStaticParams() {
  return Object.keys(WILAYAS).map(w => ({ wilaya: w }))
}

// ── Page ──────────────────────────────────────────────────────────

export default async function WilayaPage({ params }: { params: { wilaya: string; category?: string } }) {
  const w = WILAYAS[params.wilaya]
  if (!w) notFound()

  // Charger les artisans de la wilaya depuis Supabase
  const { data: artisans } = await supabase
    .from('artisans')
    .select('id, category, hourly_rate, is_available, rating_avg, rating_count, profiles(full_name)')
    .eq('is_available', true)
    .limit(12)

  // Schema.org LocalBusiness pour la wilaya
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': `Artisans à ${w.name}`,
    'description': `Liste des artisans certifiés BETI à ${w.name}, Algérie`,
    'url': `https://beti.dz/artisans/${params.wilaya}`,
    'numberOfItems': artisans?.length || 0,
    'itemListElement': (artisans || []).map((a: any, i: number) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'item': {
        '@type': 'LocalBusiness',
        'name': a.profiles?.full_name || 'Artisan BETI',
        'serviceType': CATEGORIES_LABELS[a.category] || a.category,
        'areaServed': w.name,
        'priceRange': `${a.hourly_rate} DA/h`,
        'aggregateRating': a.rating_avg ? {
          '@type': 'AggregateRating',
          'ratingValue': a.rating_avg,
          'reviewCount': a.rating_count,
        } : undefined,
      },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}/>

      <div style={{ minHeight: '100vh', background: '#0D0D12', paddingTop: 80, fontFamily: 'Nexa, sans-serif' }}>
        
        {/* Hero SEO */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 40px 32px' }}>
          <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.1em', marginBottom: 8 }}>
            WILAYA {w.num} · {w.nameAr}
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 800, color: '#F0EDE8', marginBottom: 16, lineHeight: 1.1 }}>
            Artisans à {w.name}
          </h1>
          <p style={{ fontSize: 15, color: '#555', maxWidth: 600, lineHeight: 1.7, fontWeight: 300, marginBottom: 32 }}>
            Trouvez un artisan certifié BETI à {w.name} — plombier, électricien, femme de ménage, peintre, serrurier. Disponibles maintenant, paiement en cash.
          </p>

          {/* CTA */}
          <a href={`/?wilaya=${params.wilaya}`}>
            <button style={{ padding: '12px 28px', borderRadius: 10, background: '#C9A84C', border: 'none', color: '#0D0D12', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
              Trouver un artisan à {w.name}
            </button>
          </a>
        </section>

        {/* Liens par catégorie — maillage interne */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px 48px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#F0EDE8', marginBottom: 20 }}>
            Par spécialité à {w.name}
          </h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(CATEGORIES_LABELS).map(([id, label]) => (
              <a key={id} href={`/artisans/${params.wilaya}/${id}`} style={{ textDecoration: 'none' }}>
                <div style={{ padding: '8px 16px', borderRadius: 20, background: '#161620', border: '0.5px solid #2a2a3a', color: '#888', fontSize: 13, fontWeight: 300, transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#C9A84C'; (e.currentTarget as HTMLElement).style.color = '#C9A84C' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2a3a'; (e.currentTarget as HTMLElement).style.color = '#888' }}
                >
                  {label} {w.name}
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Artisans disponibles */}
        {artisans && artisans.length > 0 && (
          <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px 80px' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#F0EDE8', marginBottom: 20 }}>
              Artisans disponibles à {w.name}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {artisans.map((a: any) => (
                <a key={a.id} href={`/artisan/${a.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '18px', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#C9A84C44'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2a3a'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EDE8', marginBottom: 4 }}>{a.profiles?.full_name || 'Artisan'}</div>
                    <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, marginBottom: 8 }}>{CATEGORIES_LABELS[a.category] || a.category}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#4ade80' }}>● Disponible</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#C9A84C' }}>{a.hourly_rate} DA/h</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Maillage autres wilayas */}
        <section style={{ background: '#09090f', borderTop: '0.5px solid #1e1e2a', padding: '48px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F0EDE8', marginBottom: 20 }}>Autres wilayas</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(WILAYAS).filter(([id]) => id !== params.wilaya).map(([id, data]) => (
                <a key={id} href={`/artisans/${id}`} style={{ fontSize: 12, color: '#444', textDecoration: 'none', padding: '4px 10px', borderRadius: 20, border: '0.5px solid #1e1e2a', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = '#C9A84C'}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = '#444'}
                >{data.name}</a>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
