'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { notFound, useParams } from 'next/navigation'
import PremiumBadge from '@/components/PremiumBadge'
import { effectivePlan, isListed } from '@/lib/subscription'
import { haversineKm } from '@/lib/distance'
import { CategoryIcon, categoryColor, categoryInk } from '@/components/icons'

const WILAYAS: Record<string, { name: string; nameAr: string; lat: number; lng: number; num: number }> = {
  'alger':          { name: 'Alger',          nameAr: 'الجزائر',      lat: 36.7538, lng: 3.0588,  num: 16 },
  'oran':           { name: 'Oran',            nameAr: 'وهران',        lat: 35.6969, lng: -0.6331, num: 31 },
  'constantine':    { name: 'Constantine',     nameAr: 'قسنطينة',     lat: 36.3650, lng: 6.6147,  num: 25 },
  'annaba':         { name: 'Annaba',          nameAr: 'عنابة',        lat: 36.9000, lng: 7.7667,  num: 23 },
  'blida':          { name: 'Blida',           nameAr: 'البليدة',      lat: 36.4700, lng: 2.8300,  num: 9  },
  'batna':          { name: 'Batna',           nameAr: 'باتنة',        lat: 35.5559, lng: 6.1741,  num: 5  },
  'setif':          { name: 'Sétif',           nameAr: 'سطيف',         lat: 36.1898, lng: 5.4108,  num: 19 },
  'tizi-ouzou':     { name: 'Tizi Ouzou',      nameAr: 'تيزي وزو',    lat: 36.7167, lng: 4.0500,  num: 15 },
  'bejaia':         { name: 'Béjaïa',          nameAr: 'بجاية',        lat: 36.7515, lng: 5.0564,  num: 6  },
  'tlemcen':        { name: 'Tlemcen',         nameAr: 'تلمسان',       lat: 34.8786, lng: -1.3175, num: 13 },
  'sidi-bel-abbes': { name: 'Sidi Bel Abbès',  nameAr: 'سيدي بلعباس', lat: 35.1899, lng: -0.6300, num: 22 },
  'biskra':         { name: 'Biskra',          nameAr: 'بسكرة',        lat: 34.8500, lng: 5.7333,  num: 7  },
  'ouargla':        { name: 'Ouargla',         nameAr: 'ورقلة',        lat: 31.9500, lng: 5.3167,  num: 30 },
  'mostaganem':     { name: 'Mostaganem',      nameAr: 'مستغانم',      lat: 35.9333, lng: 0.0833,  num: 27 },
  'mascara':        { name: 'Mascara',         nameAr: 'معسكر',        lat: 35.3958, lng: 0.1403,  num: 29 },
  'tiaret':         { name: 'Tiaret',          nameAr: 'تيارت',        lat: 35.3706, lng: 1.3211,  num: 14 },
  'medea':          { name: 'Médéa',           nameAr: 'المدية',       lat: 36.2639, lng: 2.7500,  num: 26 },
  'chlef':          { name: 'Chlef',           nameAr: 'الشلف',        lat: 36.1650, lng: 1.3317,  num: 2  },
  'boumerdes':      { name: 'Boumerdès',       nameAr: 'بومرداس',      lat: 36.7667, lng: 3.4769,  num: 35 },
  'tipaza':         { name: 'Tipaza',          nameAr: 'تيبازة',       lat: 36.5892, lng: 2.4478,  num: 42 },
  'ghardaia':       { name: 'Ghardaïa',        nameAr: 'غرداية',       lat: 32.4833, lng: 3.6667,  num: 47 },
  'el-oued':        { name: 'El Oued',         nameAr: 'الوادي',       lat: 33.3667, lng: 6.8500,  num: 39 },
  'skikda':         { name: 'Skikda',          nameAr: 'سكيكدة',       lat: 36.8762, lng: 6.9069,  num: 21 },
  'guelma':         { name: 'Guelma',          nameAr: 'قالمة',        lat: 36.4628, lng: 7.4264,  num: 24 },
  'jijel':          { name: 'Jijel',           nameAr: 'جيجل',         lat: 36.8200, lng: 5.7667,  num: 18 },
  'souk-ahras':     { name: 'Souk Ahras',      nameAr: 'سوق أهراس',    lat: 36.2841, lng: 7.9546,  num: 41 },
  'bechar':         { name: 'Béchar',          nameAr: 'بشار',         lat: 31.6167, lng: -2.2167, num: 8  },
}

const CATEGORIES_LABELS: Record<string, string> = {
  plomberie: 'Plombier', electricite: 'Électricien', menage: 'Ménage',
  demenagement: 'Déménagement', jardinage: 'Jardinier', peinture: 'Peintre',
  serrurerie: 'Serrurier', informatique: 'Informaticien', coiffure: 'Coiffeur',
}

export default function WilayaPage() {
  const params = useParams<{ wilaya: string }>()
  const w = WILAYAS[params.wilaya]
  const [artisans, setArtisans] = useState<any[]>([])

  useEffect(() => {
    if (!w) return
    supabase
      .from('artisans')
      .select('id, category, hourly_rate, is_available, rating_avg, rating_count, plan, plan_until, lat, lng, profiles(full_name)')
      .eq('is_available', true)
      .limit(100)
      .then(({ data }) => {
        // Paywall : hors période de lancement, on masque les non-abonnés.
        const list = ((data || []) as any[])
          .filter(a => isListed(a))
          .filter(a => a.lat != null && a.lng != null && haversineKm(w.lat, w.lng, a.lat, a.lng) <= 60)
        // Premium en tête (mise en avant promise dans la grille tarifaire).
        list.sort((a, b) => (effectivePlan(b) === 'premium' ? 1 : 0) - (effectivePlan(a) === 'premium' ? 1 : 0))
        setArtisans(list.slice(0, 12))
      })
  }, [params.wilaya])

  if (!w) return notFound()

  return (
    <div style={{ minHeight: '100vh', paddingTop: 80 }}>

      {/* Hero SEO */}
      <section className="seo-wrap" style={{ paddingTop: 48, paddingBottom: 32 }}>
        <div className="section-label">Wilaya {w.num} · <span lang="ar">{w.nameAr}</span></div>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 800, color: 'var(--tx)', marginBottom: 16, lineHeight: 1.1 }}>
          Artisans à {w.name}
        </h1>
        <p style={{ fontSize: 16, color: 'var(--tx2)', maxWidth: 600, lineHeight: 1.7, marginBottom: 32 }}>
          Trouvez un artisan certifié BETI à {w.name} — plombier, électricien, femme de ménage, peintre, serrurier. Disponibles maintenant, paiement en cash.
        </p>
        <a href={`/?wilaya=${params.wilaya}`} className="btn-primary btn-lg">
          Trouver un artisan à {w.name}
        </a>
      </section>

      {/* Liens par catégorie */}
      <section className="seo-wrap" style={{ paddingBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)', marginBottom: 20 }}>
          Par spécialité à {w.name}
        </h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {Object.entries(CATEGORIES_LABELS).map(([id, label]) => (
            <a key={id} href={`/artisans/${params.wilaya}/${id}`} className="seo-pill" style={{ gap: 8 }}>
              <CategoryIcon id={id} size={15} color={categoryColor(id)}/>{label} {w.name}
            </a>
          ))}
        </div>
      </section>

      {/* Artisans disponibles */}
      {artisans.length > 0 && (
        <section className="seo-wrap" style={{ paddingBottom: 80 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)', marginBottom: 20 }}>
            Artisans disponibles à {w.name}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {artisans.map((a: any) => (
              <a key={a.id} href={`/artisan/${a.id}`} className="card is-clickable seo-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)' }}>{a.profiles?.full_name || 'Artisan'}</span>
                  {effectivePlan(a) === 'premium' && <PremiumBadge size="sm" />}
                </div>
                <div style={{ fontSize: 12.5, color: categoryInk(a.category), fontWeight: 700, marginBottom: 10 }}>{CATEGORIES_LABELS[a.category] || a.category}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge-tone tone-success"><span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }}/>Disponible</span>
                  <span className="num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{a.hourly_rate} <span style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 400 }}>DA/h</span></span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Autres wilayas */}
      <section style={{ borderTop: '1px solid var(--border)', padding: '48px 0', background: 'var(--bg3)' }}>
        <div className="seo-wrap">
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx)', marginBottom: 20 }}>Autres wilayas</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(WILAYAS).filter(([id]) => id !== params.wilaya).map(([id, data]) => (
              <a key={id} href={`/artisans/${id}`} className="seo-pill is-small">
                {data.name}
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
