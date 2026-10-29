'use client'

// app/onboarding/page.tsx
// Ancien tunnel en 5 étapes (tarif, expérience, carte...) : il doublonnait la page
// profil et écrivait le téléphone dans profiles.phone. L'inscription artisan mène
// désormais directement à /artisan-dashboard/profil (4 champs obligatoires, le reste
// est facultatif). On garde cette route pour les anciens liens.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/artisan-dashboard/profil') }, [router])
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div role="status" aria-label="Chargement" className="loader-ring" />
    </div>
  )
}
