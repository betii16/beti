// Fiche artisan : composant SERVEUR (metadata, h1, JSON-LD) + coque interactive client.
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { SITE_URL } from '@/lib/site'
import { isListed } from '@/lib/subscription'
import ArtisanClient from './ArtisanClient'

export const revalidate = 600

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const METIERS: Record<string, string> = {
  plomberie: 'Plombier', electricite: 'Électricien', menage: 'Ménage', demenagement: 'Déménageur',
  jardinage: 'Jardinier', peinture: 'Peintre', serrurerie: 'Serrurier', informatique: 'Technicien informatique',
  coiffure: 'Coiffeur', maconnerie: 'Maçon', climatisation: 'Climatisation', menuiserie: 'Menuisier',
}

type Fiche = {
  name: string; metier: string; city: string; bio: string
  rating: number; count: number; avatar: string | null
}
type Result = { status: 'ok'; fiche: Fiche } | { status: 'missing' } | { status: 'unknown' }

async function load(id: string): Promise<Result> {
  if (!UUID_RE.test(id)) return { status: 'unknown' }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { status: 'unknown' }
  try {
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const [a, p] = await Promise.all([
      sb.from('artisans').select('category,bio,location_city,rating_avg,rating_count,plan,plan_until').eq('id', id).maybeSingle(),
      sb.from('profiles').select('full_name,avatar_url').eq('id', id).maybeSingle(),
    ])
    if (a.error) return { status: 'unknown' }
    if (!a.data) return { status: 'missing' }
    const d = a.data as any
    if (!isListed(d)) return { status: 'unknown' }
    return {
      status: 'ok',
      fiche: {
        name: (p.data as any)?.full_name || 'Artisan BETI',
        metier: METIERS[d.category] || 'Artisan',
        city: d.location_city || 'Algérie',
        bio: (d.bio || '').toString().slice(0, 300),
        rating: Number(d.rating_avg) || 0,
        count: Number(d.rating_count) || 0,
        avatar: (p.data as any)?.avatar_url || null,
      },
    }
  } catch { return { status: 'unknown' } }
}

const GENERIC = { name: 'Artisan BETI', metier: 'Artisan', city: 'Algérie', bio: '', rating: 0, count: 0, avatar: null } as Fiche

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const r = await load(id)
  const f = r.status === 'ok' ? r.fiche : GENERIC
  const title = `${f.name} — ${f.metier} à ${f.city} | BETI`
  const description = f.bio
    ? f.bio.slice(0, 155)
    : `${f.name}, ${f.metier.toLowerCase()} à ${f.city}. Consultez le profil, les avis et réservez sur BETI.`
  const canonical = `${SITE_URL}/artisan/${encodeURIComponent(id)}`
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'profile', siteName: 'BETI', ...(f.avatar ? { images: [f.avatar] } : {}) },
    twitter: { card: 'summary', title, description },
    ...(r.status === 'unknown' ? { robots: { index: false, follow: true } } : {}),
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await load(id)
  if (r.status === 'missing') notFound()
  const f = r.status === 'ok' ? r.fiche : GENERIC
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: f.name,
    description: f.bio || `${f.metier} à ${f.city}`,
    url: `${SITE_URL}/artisan/${encodeURIComponent(id)}`,
    areaServed: f.city,
    address: { '@type': 'PostalAddress', addressLocality: f.city, addressCountry: 'DZ' },
    ...(f.avatar ? { image: f.avatar } : {}),
    ...(f.count > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: f.rating.toFixed(1), reviewCount: f.count } } : {}),
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
        {f.name} — {f.metier} à {f.city}
      </h1>
      <ArtisanClient />
    </>
  )
}
