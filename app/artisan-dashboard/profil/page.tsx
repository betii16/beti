'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'




type Review = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  profiles: { full_name: string } | null
}

function Stars({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ fontSize: 14, color: n <= rating ? '#C9A84C' : '#2a2a3a' }}>★</span>
      ))}
    </div>
  )
}

export default function ProfilPublic() {
  const router = useRouter()
  const [artisan, setArtisan] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const [{ data: art }, { data: prof }] = await Promise.all([
        supabase.from('artisans').select('*').eq('id', user.id).single(),
        supabase.from('profiles').select('full_name, phone, avatar_url').eq('id', user.id).single(),
      ])

      if (art) setArtisan(art)
      if (prof) setProfile(prof)

      const { data: revs } = await supabase
        .from('reviews')
        .select('*, profiles!reviews_client_id_fkey(full_name)')
        .eq('artisan_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      if (revs) setReviews(revs)

      const { data: t } = await supabase
        .from('artisan_tags')
        .select('tag')
        .eq('artisan_id', user.id)
      if (t) setTags(t.map((x: any) => x.tag))

      setLoading(false)
    }
    init()
  }, [])

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: '#555', fontFamily: 'Nexa, sans-serif', fontWeight: 300 }}>Chargement...</div>
    </div>
  )

  const ratingAvg = artisan?.rating_avg || 0
  const ratingCount = artisan?.rating_count || 0

  return (
    <div style={{ paddingTop: 64, minHeight: '100vh', background: '#0D0D12', fontFamily: 'Nexa, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#09090f', borderBottom: '0.5px solid #1e1e2a', padding: '32px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, color: '#C9A84C', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 6 }}>MON DASHBOARD</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#F0EDE8' }}>Mon profil public</h1>
          </div>
          <button onClick={() => setPreviewMode(!previewMode)}
            style={{ padding: '10px 20px', background: previewMode ? '#C9A84C' : 'transparent', border: '0.5px solid #C9A84C44', borderRadius: 10, color: previewMode ? '#0D0D12' : '#C9A84C', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', transition: 'all 0.2s' }}>
            {previewMode ? '✕ Fermer la preview' : '👁 Voir comme un client'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 40px', display: 'grid', gridTemplateColumns: previewMode ? '1fr' : '1fr 1fr', gap: 24 }}>

        {/* Carte profil — vue client */}
        <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 16, overflow: 'hidden' }}>
          {/* Banner */}
          <div style={{ height: 80, background: 'linear-gradient(135deg, #1a1508 0%, #2a2010 100%)' }}/>

          <div style={{ padding: '0 24px 24px' }}>
            {/* Avatar */}
            <div style={{ marginTop: -28, marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#C9A84C22', border: '2px solid #C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#C9A84C' }}>
                {(profile?.full_name || 'A')[0].toUpperCase()}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#F0EDE8', marginBottom: 4 }}>{profile?.full_name || 'Artisan'}</div>
                <div style={{ fontSize: 13, color: '#C9A84C', fontWeight: 300 }}>{artisan?.category}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: artisan?.is_available ? '#0a2010' : '#1a1a1a', border: `0.5px solid ${artisan?.is_available ? '#4ade8044' : '#2a2a3a'}`, borderRadius: 20, padding: '4px 10px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: artisan?.is_available ? '#4ade80' : '#555', boxShadow: artisan?.is_available ? '0 0 6px #4ade80' : 'none' }}/>
                <span style={{ fontSize: 11, color: artisan?.is_available ? '#4ade80' : '#555', fontWeight: 300 }}>
                  {artisan?.is_available ? 'Disponible' : 'Indisponible'}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { value: ratingAvg.toFixed(1), label: 'Note', icon: '⭐' },
                { value: ratingCount, label: 'Avis', icon: '💬' },
                { value: artisan?.total_missions || 0, label: 'Missions', icon: '✅' },
              ].map(s => (
                <div key={s.label} style={{ background: '#0D0D12', borderRadius: 10, padding: '12px', textAlign: 'center', border: '0.5px solid #1e1e2a' }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{s.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#F0EDE8' }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: '#555', fontWeight: 300 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Tarif */}
            {artisan?.hourly_rate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 14px', background: '#0D0D12', borderRadius: 10, border: '0.5px solid #1e1e2a' }}>
                <span style={{ fontSize: 16 }}>💶</span>
                <span style={{ fontSize: 13, color: '#F0EDE8', fontWeight: 800 }}>{artisan.hourly_rate} DA/h</span>
                <span style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>· tarif indicatif</span>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {tags.map(tag => (
                  <span key={tag} style={{ padding: '4px 12px', background: '#1a1508', border: '0.5px solid #C9A84C33', borderRadius: 20, fontSize: 11, color: '#C9A84C', fontWeight: 300 }}>{tag}</span>
                ))}
              </div>
            )}

            {/* Bio */}
            {artisan?.bio && (
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.7, fontWeight: 300 }}>{artisan.bio}</div>
            )}
          </div>
        </div>

        {/* Avis clients */}
        <div>
          <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 16 }}>AVIS CLIENTS ({ratingCount})</div>

          {reviews.length === 0 ? (
            <div style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '32px', textAlign: 'center', color: '#333' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⭐</div>
              <div style={{ fontSize: 13, fontWeight: 300 }}>Aucun avis pour l'instant</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reviews.map(r => (
                <div key={r.id} style={{ background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#F0EDE8' }}>{r.profiles?.full_name || 'Client'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Stars rating={r.rating}/>
                      <span style={{ fontSize: 11, color: '#444', fontWeight: 300 }}>{fmt(r.created_at)}</span>
                    </div>
                  </div>
                  {r.comment && (
                    <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, fontWeight: 300 }}>"{r.comment}"</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


