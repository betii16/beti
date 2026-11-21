'use client'

// Petit formulaire d'action de l'équipe : les champs et boutons viennent de la
// page serveur ; le bouton cliqué donne l'action (champ « do »). Le résultat
// s'affiche sous le formulaire.

import { useActionState, type ReactNode } from 'react'
import type { Dictionary } from '@/i18n/dictionary'
import { adminAction, type AdminState } from '@/lib/admin/actions'

export function AdminForm({ children, errors, className = '' }: { children: ReactNode; errors: Dictionary['errors']; className?: string }) {
  const [state, run, pending] = useActionState<AdminState, FormData>(adminAction, {})
  return (
    <form action={run} className={`flex flex-col gap-2 ${className}`}>
      {/* Désactive tous les boutons pendant l'envoi : une action ne part qu'une fois. */}
      <fieldset disabled={pending} className="flex flex-wrap items-center gap-2">
        {children}
      </fieldset>
      {state.error ? (
        <p role="alert" className="text-sm font-semibold">
          {errors[state.error]}
        </p>
      ) : (
        state.done && (
          <p role="status" className="text-sm text-muted">
            Fait.
          </p>
        )
      )}
    </form>
  )
}
