// components/PremiumBadge.tsx
// Pastille « Premium » (artisans abonnés Premium). Aplat LAITON (la matière
// « noble » de la palette Chaux & Zellige) — distincte du bleu d'Alger des
// actions, pour ne pas se confondre avec un bouton. Blanc sur #8C6A1E ≈ 5.3:1.
import { Star } from 'lucide-react'

export default function PremiumBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const s = size === 'sm'
  return (
    <span
      title="Artisan Premium"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: s ? '3px 8px' : '4px 10px', borderRadius: 'var(--r-pill)',
        background: '#8C6A1E', color: '#fff',
        fontSize: s ? 10 : 11, fontWeight: 800, letterSpacing: '0.06em', lineHeight: 1,
        boxShadow: '0 1px 0 #6B5014, 0 4px 10px -4px rgba(140,106,30,0.6)',
        whiteSpace: 'nowrap',
      }}
    >
      <Star size={s ? 10 : 11} fill="#fff" strokeWidth={0} aria-hidden /> PREMIUM
    </span>
  )
}
