'use client'

// Les étapes qui séparent un profil rempli d'un profil visible : le numéro
// (obligatoire pour publier), la publication, puis la disponibilité au jour le jour.

import Link from 'next/link'
import { Check } from 'lucide-react'
import { useActionState, type ReactNode } from 'react'
import { formatPhone } from '@/domain/listing'
import type { Dictionary } from '@/i18n/dictionary'
import { updateListing, type StepState } from '@/lib/listing/actions'

const ON_DARK = 'inline-flex min-h-14 cursor-pointer items-center justify-center rounded-full px-6 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'
const ACCENT = `${ON_DARK} bg-accent text-ink hover:bg-paper`
const OUTLINE = `${ON_DARK} border-2 border-paper/35 hover:border-paper hover:bg-paper hover:text-ink`

function Step({ done, title, children }: { done: boolean; title: string; children?: ReactNode }) {
  return (
    <li className="flex items-start gap-4">
      {done ? (
        <span aria-hidden className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-accent text-ink">
          <Check className="size-4" strokeWidth={3.2} />
        </span>
      ) : (
        <span aria-hidden className="size-[30px] shrink-0 rounded-full border-2 border-paper/40" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-0.5">
        <h3 className="text-lg font-semibold">{title}</h3>
        {children}
      </div>
    </li>
  )
}

export function ListingSteps({
  phone,
  published,
  available,
  suspended,
  profileHref,
  t,
  errors,
}: {
  phone: string | null
  published: boolean
  available: boolean
  suspended: boolean
  profileHref: string
  t: Dictionary['listing']
  errors: Dictionary['errors']
}) {
  const [state, run, running] = useActionState<StepState, FormData>(updateListing, {})

  const phoneForm = (
    <form action={run} className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-0 flex-[1_1_240px] flex-col gap-1.5">
        <span className="text-[15px] font-semibold">{t.phone}</span>
        <input
          type="tel"
          name="phone"
          defaultValue={state.phone ?? ''}
          required
          maxLength={20}
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          placeholder="0555 12 34 56"
          className="min-h-14 w-full rounded-full bg-paper px-5 text-lg text-ink rtl:text-end"
        />
      </label>
      <button type="submit" name="do" value="phone" disabled={running} className={ACCENT}>
        {t.savePhone}
      </button>
    </form>
  )

  return (
    <section aria-labelledby="etapes" className="flex flex-col gap-7 rounded-[28px] bg-night px-6 py-8 text-paper sm:rounded-[36px] sm:px-10 sm:py-10">
      <h2 id="etapes" className="text-[clamp(1.375rem,2.6vw,1.75rem)] leading-tight font-bold tracking-[-0.025em] rtl:leading-snug">
        {t.stepsTitle}
      </h2>

      {suspended && (
        <p role="alert" className="max-w-[620px] rounded-[20px] bg-paper px-5 py-3.5 font-medium text-ink">
          {t.suspended}
        </p>
      )}

      <ol className="flex max-w-[620px] flex-col gap-7">
        <Step done title={t.stepProfile} />

        <Step done={!!phone} title={t.stepPhone}>
          <p className="text-paper/75">{t.phoneHelp}</p>
          {phone ? (
            <>
              <bdi dir="ltr" className="self-start text-xl font-semibold">
                {formatPhone(phone)}
              </bdi>
              <details>
                <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold underline underline-offset-4">{t.changePhone}</summary>
                <div className="pt-3">{phoneForm}</div>
              </details>
            </>
          ) : (
            phoneForm
          )}
        </Step>

        <Step done={published} title={t.stepPublish}>
          {published ? (
            <>
              <p className="text-paper/75">{t.published}</p>
              <p className="font-medium">{available ? t.availableText : t.unavailableText}</p>
              <form action={run} className="flex flex-wrap gap-3">
                <button type="submit" name="do" value={available ? 'unavailable' : 'available'} disabled={running} className={available ? OUTLINE : ACCENT}>
                  {available ? t.setUnavailable : t.setAvailable}
                </button>
                <button type="submit" name="do" value="unpublish" disabled={running} className={OUTLINE}>
                  {t.unpublish}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="text-paper/75">{phone ? t.publishHelp : t.needsPhone}</p>
              <form action={run}>
                <button type="submit" name="do" value="publish" disabled={running || !phone} className={ACCENT}>
                  {t.publish}
                </button>
              </form>
            </>
          )}
        </Step>
      </ol>

      {state.error && (
        <p role="alert" className="max-w-[620px] rounded-[20px] bg-paper px-5 py-3.5 font-medium text-ink">
          {errors[state.error]}
        </p>
      )}

      <Link href={profileHref} className="inline-flex min-h-11 items-center self-start font-semibold underline underline-offset-4">
        {t.view}
      </Link>
    </section>
  )
}
