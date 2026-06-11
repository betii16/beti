// components/icons.tsx
// Icônes de catégories (lucide-react) — remplace les emojis, partagé entre les pages.
import {
  Wrench, Zap, Sparkles, Truck, Leaf, Paintbrush, KeyRound, Monitor, Scissors,
  type LucideIcon,
} from 'lucide-react'

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  plomberie:    Wrench,
  electricite:  Zap,
  menage:       Sparkles,
  demenagement: Truck,
  jardinage:    Leaf,
  peinture:     Paintbrush,
  serrurerie:   KeyRound,
  informatique: Monitor,
  coiffure:     Scissors,
  autre:        Sparkles,
}

export function CategoryIcon({ id, size = 20, color, strokeWidth = 2, style }: {
  id: string
  size?: number
  color?: string
  strokeWidth?: number
  style?: React.CSSProperties
}) {
  const Ic = CATEGORY_ICON[id] || Sparkles
  return <Ic size={size} color={color} strokeWidth={strokeWidth} style={style} />
}
