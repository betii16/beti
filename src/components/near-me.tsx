'use client'

// Recherche : « Près de moi ». Demande la position à l'appareil, puis rouvre la
// recherche avec elle dans l'adresse ; la base trie alors du plus proche au plus loin.

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LocateFixed } from 'lucide-react'

export function NearMe({ base, label, denied, unavailable }: { base: string; label: string; denied: string; unavailable: string }) {
  const router = useRouter()
  const [problem, setProblem] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  const locate = () => {
    if (!navigator.geolocation) return setProblem(unavailable)
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const url = new URL(base, location.origin)
        // Deux décimales, environ 1 km : assez pour trier, sans laisser une adresse exacte dans l'historique.
        url.searchParams.set('pres', `${coords.latitude.toFixed(2)},${coords.longitude.toFixed(2)}`)
        router.push(url.pathname + url.search)
      },
      error => {
        setLocating(false)
        setProblem(error.code === error.PERMISSION_DENIED ? denied : unavailable)
      },
      { maximumAge: 60_000, timeout: 20_000 },
    )
  }

  return (
    <div className="flex flex-col items-start gap-2.5">
      <button
        type="button"
        onClick={locate}
        disabled={locating}
        className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full bg-mist px-6 font-semibold transition-colors hover:bg-ink hover:text-paper disabled:cursor-wait disabled:opacity-60"
      >
        <LocateFixed aria-hidden className="size-5" />
        {label}
      </button>
      {problem && (
        <p role="alert" className="max-w-[620px] rounded-[20px] border-2 border-ink px-5 py-3.5 font-medium">
          {problem}
        </p>
      )}
    </div>
  )
}
