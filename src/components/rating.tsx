import { Star } from 'lucide-react'

/** Une note, avec le nombre d'avis s'il est donné. Le lecteur d'écran lit la phrase complète (label). */
export function Rating({ value, count, label, className = '' }: { value: string; count?: number; label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Star aria-hidden className="size-4 fill-ink" />
      <span aria-hidden className="font-semibold">
        {value}
      </span>
      {count != null && (
        <span aria-hidden className="text-muted">
          ({count})
        </span>
      )}
      <span className="sr-only">{label}</span>
    </span>
  )
}
