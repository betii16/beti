// lib/avatar.ts
// Avatar illustré de secours pour les artisans sans photo (open-peeps, peau
// mate — public/artisans/a1..a12.png). Choix DÉTERMINISTE par id/nom : un même
// artisan garde toujours le même visage. Vrais artisans avec photo → leur photo.
const POOL = 12

export function illustratedAvatar(seed: string | null | undefined): string {
  const s = (seed && String(seed)) || 'beti'
  let h = 7
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return `/artisans/a${(Math.abs(h) % POOL) + 1}.png`
}

/** Photo réelle si dispo, sinon avatar illustré déterministe. */
export function artisanAvatar(avatarUrl: string | null | undefined, seed: string | null | undefined): string {
  return avatarUrl || illustratedAvatar(seed)
}
