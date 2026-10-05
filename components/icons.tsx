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

// Palette de catégories « Chaux & Zellige » — UNE seule source de vérité
// (avant : chaque page avait ses couleurs Tailwind, et peinture/serrurerie
// changeaient de teinte d'une page à l'autre). Teintes « matière » de demi-ton,
// lisibles sur chaux comme sur nuit. Hex obligatoires : le code y suffixe un
// canal alpha (`${c}22`).
export const CATEGORY_COLOR: Record<string, string> = {
  plomberie:    '#2B6CB0', // bleu eau
  electricite:  '#A86F1A', // laiton / ambre
  serrurerie:   '#B9512F', // brique
  menage:       '#0E877A', // zellige
  peinture:     '#B4475F', // terre rose
  demenagement: '#8A6A4F', // cèdre
  jardinage:    '#4F7F27', // olivier
  informatique: '#4F6496', // ardoise bleue
  coiffure:     '#A2497E', // grenade
  autre:        '#5E7186', // ardoise
}

export const categoryColor = (id: string | null | undefined): string =>
  (id && CATEGORY_COLOR[id]) || '#175CC4'

/** Couleur de TEXTE d'une catégorie : la teinte tirée vers l'encre du thème
 *  (plus sombre sur chaux, plus claire sur nuit) → contraste AA dans les 2 thèmes. */
export const categoryInk = (id: string | null | undefined): string =>
  `color-mix(in srgb, ${categoryColor(id)} 68%, var(--tx))`

export function CategoryIcon({ id, size = 20, color, strokeWidth = 2, style }: {
  id: string
  size?: number
  color?: string
  strokeWidth?: number
  style?: React.CSSProperties
}) {
  const Ic = CATEGORY_ICON[id] || Sparkles
  return <Ic size={size} color={color} strokeWidth={strokeWidth} style={style} aria-hidden />
}

/** Rend un élément non-<button> (carte, ligne) activable au clavier (Entrée/Espace). */
export function pressable(onActivate: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate() }
    },
  }
}
