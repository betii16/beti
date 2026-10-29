import { ImageResponse } from 'next/og'

// Runtime edge : environnement standard de next/og — évite le « Invalid URL »
// au chargement de la police lors de la génération statique.
export const runtime = 'edge'

// Image de partage (Open Graph) générée à la volée — c'est l'aperçu affiché
// quand un lien BETI est envoyé sur WhatsApp, Facebook, etc. (canal n°1 en
// Algérie). Convention de fichier App Router : Next injecte automatiquement
// les balises og:image / twitter:image correspondantes.
// Charte « Chaux & Zellige » : fond chaux, encre bleu-nuit, bleu d'Alger, sans dégradé.

export const alt = 'BETI — Artisans certifiés à domicile en Algérie'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  const INK = '#17242F'
  const ACCENT = '#175CC4'
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
          background: '#F0ECE3',
          color: INK,
          fontFamily: 'sans-serif',
          borderLeft: `24px solid ${ACCENT}`,
        }}
      >
        <div style={{ fontSize: 170, fontWeight: 900, letterSpacing: '-5px', color: ACCENT, display: 'flex', lineHeight: 1 }}>
          BETI
        </div>
        <div style={{ fontSize: 58, fontWeight: 700, marginTop: 20, color: INK, display: 'flex' }}>
          Artisans certifiés à domicile
        </div>
        <div style={{ fontSize: 34, marginTop: 16, color: '#4A5864', display: 'flex' }}>
          Plombier · Électricien · Ménage · Peinture · Serrurerie
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 48,
            padding: '14px 30px',
            borderRadius: 999,
            background: ACCENT,
            fontSize: 32,
            fontWeight: 700,
            color: '#FFFFFF',
          }}
        >
          Partout en Algérie · Paiement en cash
        </div>
      </div>
    ),
    { ...size }
  )
}
