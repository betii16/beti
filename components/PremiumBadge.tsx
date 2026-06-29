// components/PremiumBadge.tsx
// Pastille « Premium » (artisans abonnés Premium). Dégradé violet de marque.
import { Star } from 'lucide-react'

export default function PremiumBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const s = size === 'sm'
  return (
    <span
      title="Artisan Premium"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: s ? '2px 8px' : '3px 10px', borderRadius: 20,
        background: 'var(--gradient)', color: '#fff',
        fontSize: s ? 9 : 10, fontWeight: 800, letterSpacing: '0.05em', lineHeight: 1,
        boxShadow: '0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent)',
      }}
    >
      <Star size={s ? 9 : 11} fill="#fff" strokeWidth={0} /> PREMIUM
    </span>
  )
}
