'use client'

// app/template.tsx
// Transition de page GLOBALE. En App Router, template.tsx est re-monté à chaque
// navigation (contrairement à layout.tsx) : c'est l'endroit canonique pour
// animer l'entrée d'une route. Les navigations client n'avaient aucune
// transition jusque-là — maintenant chaque écran apparaît en fondu net.
//
// IMPORTANT : on anime via une keyframe CSS d'OPACITÉ uniquement, sans aucun
// `transform`. Un transform (même identité, ce que pose framer-motion) créerait
// un containing-block qui réduit les enfants `position:fixed` plein écran
// (carte, dock) à une boîte 0×0 → écran blanc. L'opacité n'a pas cet effet.

export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-fade">{children}</div>
}
