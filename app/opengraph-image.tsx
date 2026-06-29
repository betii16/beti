import { ImageResponse } from 'next/og'

// Runtime edge : environnement standard de next/og — évite le « Invalid URL »
// au chargement de la police lors de la génération statique.
export const runtime = 'edge'

// Image de partage (Open Graph) générée à la volée — c'est l'aperçu affiché
// quand un lien BETI est envoyé sur WhatsApp, Facebook, etc. (canal n°1 en
// Algérie). Convention de fichier App Router : Next injecte automatiquement
// les balises og:image / twitter:image correspondantes.

export const alt = 'BETI — Artisans certifiés à domicile en Algérie'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #0b0b12 0%, #15152a 55%, #1c1640 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 150,
            fontWeight: 900,
            letterSpacing: '-4px',
            background: 'linear-gradient(135deg, #7C5CFF, #a78bfa)',
            backgroundClip: 'text',
            color: 'transparent',
            display: 'flex',
          }}
        >
          BETI
        </div>
        <div style={{ fontSize: 46, fontWeight: 700, marginTop: 8, color: '#e0dfe5', display: 'flex' }}>
          Artisans certifiés à domicile
        </div>
        <div style={{ fontSize: 32, marginTop: 14, color: '#8585a0', display: 'flex' }}>
          Plombier · Électricien · Ménage · Peinture · Serrurerie
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginTop: 48,
            padding: '14px 28px',
            borderRadius: 999,
            background: 'rgba(90, 61, 240,0.18)',
            border: '1px solid rgba(90, 61, 240,0.45)',
            fontSize: 30,
            fontWeight: 700,
            color: '#c7d2fe',
          }}
        >
          <div
            style={{
              display: 'flex',
              padding: '4px 14px',
              borderRadius: 8,
              background: '#5A3DF0',
              color: '#ffffff',
              fontSize: 26,
              fontWeight: 900,
            }}
          >
            DZ
          </div>
          Partout en Algérie · Paiement en cash
        </div>
      </div>
    ),
    { ...size }
  )
}
