// lib/cinematic.ts
// Configuration de l'expérience cinématique 3D (première visite desktop).
//
// RÉGLAGES : le modèle est recentré sur l'origine (son bbox fait ~31.6 × 2.7 × 10 m,
// donc x ∈ [-16, 16], z ∈ [-5, 5] après centrage). Pour déplacer une étape de la
// visite sur la bonne pièce, ajuste `cam` (position caméra) et `look` (point visé,
// aussi utilisé pour le halo lumineux au sol). Aucune autre modification nécessaire.

export type CineWaypoint = {
  /** Position caméra [x, y, z] */
  cam: [number, number, number]
  /** Point visé (et position du halo au sol) [x, y, z] */
  look: [number, number, number]
}

export type CineSection = CineWaypoint & {
  id: string
  titleKey: string
  descKey: string
  /** Couleur d'accent de la carte + du halo */
  color: string
  /** Position au sol [x, z] de la mascotte artisan dans la pièce */
  bot: [number, number]
}

/** Vue d'ouverture : tout l'appartement, caméra haute et reculée pour laisser
    le titre respirer (le modèle occupe la moitié basse de l'écran). */
export const HERO: CineWaypoint = { cam: [0, 21, 26], look: [0, 0, -2.5] }

/** Vue de sortie : la caméra recule et s'élève, l'appartement s'embrase en violet. */
export const FINAL: CineWaypoint = { cam: [0, 24, 31], look: [0, 0, 0] }

/** Les 5 étapes de la visite — pièces réelles repérées visuellement (13/07) :
    salle de bain (-12.7,-2.3) · salon (-3,0.5) · cuisine (3.3,0.7) ·
    chambre (7.2,0.4) · suite droite (12.5,0.2) · terrasse au sud (z>3).
    Caméra BASSE, dans la pièce, plongée douce — on visite vraiment. */
export const SECTIONS: CineSection[] = [
  { id: 'plomberie',    titleKey: 'cine.s1Title', descKey: 'cine.s1Desc', color: '#3b82f6', cam: [-12.6, 4.4, 1.4], look: [-12.7, 0.2, -2.4], bot: [-11.9, -1.6] },
  { id: 'electricite',  titleKey: 'cine.s3Title', descKey: 'cine.s3Desc', color: '#eab308', cam: [-3, 3.2, 3.5],    look: [-3, 0.5, -0.2],    bot: [-1.9, 1.2]   },
  { id: 'menuiserie',   titleKey: 'cine.s2Title', descKey: 'cine.s2Desc', color: '#f59e0b', cam: [5, 3.6, 3.8],     look: [3.2, 0.5, 0.4],    bot: [4.4, 0.4]    },
  { id: 'peinture',     titleKey: 'cine.s4Title', descKey: 'cine.s4Desc', color: '#f97316', cam: [7, 5.5, 2.8],     look: [7, 0.3, 1],        bot: [5.9, 0.9]    },
  { id: 'climatisation',titleKey: 'cine.s5Title', descKey: 'cine.s5Desc', color: '#38bdf8', cam: [12.9, 5.5, 1.8],  look: [12.9, 0.3, -0.5],  bot: [12.6, 1.5]   },
]

/** Altitude de croisière des arcs caméra entre deux pièces (au-dessus des murs). */
export const ARC_HEIGHT = 8.5

/** Violet de marque vers lequel l'appartement « s'embrase » en fin de visite. */
export const CINE_VIOLET = '#7C5CFF'

export const MODEL_URL = '/models/apartment.glb'

/** Mascotte artisan : RobotExpressive (three.js examples, CC0 — Tomás Laulhé),
    compressé Draco. Animations : Idle, Walking, Running, Punch, Wave, Yes,
    ThumbsUp, Dance… — voir ArtisanBot dans Scene.tsx. */
export const BOT_URL = '/models/bot.glb'

/**
 * État caméra partagé entre GSAP (qui le mute au scroll) et le rig three.js
 * (qui le lit à chaque frame). Objet simple → GSAP l'anime sans adaptateur.
 */
export type CamState = {
  x: number; y: number; z: number      // position caméra
  tx: number; ty: number; tz: number   // point visé
  hx: number; hz: number; hOp: number  // halo : position sol + opacité
  hColor: string                       // halo : couleur d'accent de la section
  bx: number; bz: number               // mascotte : position au sol dans la pièce
  zone: number                         // index de la section active (particules thématiques)
  tint: number                         // 0→1 : embrasement violet final
  spin: number                         // 1→0 : amplitude de la rotation lente du héros
}

export const initialCamState = (): CamState => ({
  x: HERO.cam[0], y: HERO.cam[1], z: HERO.cam[2],
  tx: HERO.look[0], ty: HERO.look[1], tz: HERO.look[2],
  hx: 0, hz: 0, hOp: 0, hColor: CINE_VIOLET, bx: 0, bz: 2, zone: -1,
  tint: 0, spin: 1,
})
