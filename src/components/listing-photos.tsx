'use client'

// Photos du profil d'artisan : photo de profil, couverture, réalisations. Le
// navigateur envoie les fichiers (src/lib/photos.ts), puis l'action serveur les
// rattache à la fiche ; la base et le stockage revérifient chemins et limites.

import Image from 'next/image'
import { useRef, useState, useTransition, type FormEvent } from 'react'
import type { Dictionary } from '@/i18n/dictionary'
import type { ErrorCode } from '@/lib/errors'
import { addPortfolioPost, deletePortfolioPost, setListingPhoto, type PhotoResult } from '@/lib/listing/actions'
import { mediaUrl } from '@/lib/media'
import { uploadPhotos } from '@/lib/photos'
import { ALERT, FIELD, HELP, INPUT, LABEL } from './form-styles'

export type PortfolioPost = { id: string; caption: string | null; photos: string[] }

const PILL = 'inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full px-5 font-semibold transition-colors'
// Le champ fichier est caché dans son libellé : c'est le libellé qui montre le focus clavier.
const DARK = `${PILL} bg-ink text-paper hover:bg-accent hover:text-ink has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ink`
const LIGHT = `${PILL} bg-mist hover:bg-ink hover:text-paper disabled:cursor-wait disabled:opacity-60`
const H3 = 'text-lg font-semibold'

export function ListingPhotos({
  userId,
  name,
  avatar,
  cover,
  posts,
  t,
  errors,
}: {
  userId: string
  name: string
  avatar: string | null
  cover: string | null
  posts: PortfolioPost[]
  t: Dictionary['listing']
  errors: Dictionary['errors']
}) {
  const [error, setError] = useState<ErrorCode | null>(null)
  const [pending, start] = useTransition()
  const workForm = useRef<HTMLFormElement>(null)

  const run = (job: () => Promise<PhotoResult>, done?: () => void) =>
    start(async () => {
      setError(null)
      const result = await job()
      if (result.error) setError(result.error)
      else done?.()
    })

  const replace = (kind: 'avatar' | 'cover', file: File | undefined) => {
    if (!file) return
    run(async () => {
      const upload = await uploadPhotos(`${kind === 'avatar' ? 'avatars' : 'portfolio'}/${userId}`, [file])
      return upload.error ? { error: upload.error } : setListingPhoto(kind, upload.paths[0])
    })
  }

  const addWork = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const files = form.getAll('photos').filter((file): file is File => file instanceof File && file.size > 0)
    if (files.length === 0 || files.length > 6) return setError('invalid_photos')
    const caption = String(form.get('caption') ?? '')
    run(
      async () => {
        const upload = await uploadPhotos(`portfolio/${userId}`, files)
        return upload.error ? { error: upload.error } : addPortfolioPost(caption, upload.paths)
      },
      () => workForm.current?.reset(),
    )
  }

  const picker = (kind: 'avatar' | 'cover', label: string) => (
    <label className={`${DARK} ${pending ? 'pointer-events-none opacity-60' : ''}`}>
      {label}
      <input
        type="file"
        accept="image/*"
        disabled={pending}
        className="sr-only"
        onChange={event => {
          replace(kind, event.currentTarget.files?.[0])
          // Le même fichier choisi deux fois doit relancer l'envoi.
          event.currentTarget.value = ''
        }}
      />
    </label>
  )

  return (
    <section aria-labelledby="photos" className="flex flex-col gap-8">
      <h2 id="photos" className="text-[clamp(1.5rem,3vw,2rem)] leading-tight font-bold tracking-[-0.025em] rtl:leading-snug">
        {t.photosTitle}
      </h2>

      <div className="flex flex-wrap items-center gap-5">
        {avatar ? (
          <Image src={mediaUrl(avatar)} alt={t.avatar} width={112} height={112} className="size-[112px] shrink-0 rounded-[28px] object-cover" />
        ) : (
          <span aria-hidden className="flex size-[112px] shrink-0 items-center justify-center rounded-[28px] bg-sage text-4xl font-bold">
            {name.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2.5">
          <h3 className={H3}>{t.avatar}</h3>
          <p className={HELP}>{t.avatarHelp}</p>
          <div className="flex flex-wrap gap-2.5">
            {picker('avatar', avatar ? t.changePhoto : t.choosePhoto)}
            {avatar && (
              <button type="button" disabled={pending} onClick={() => run(() => setListingPhoto('avatar', null))} className={LIGHT}>
                {t.removePhoto}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <h3 className={H3}>{t.cover}</h3>
        <p className={HELP}>{t.coverHelp}</p>
        <div className={`relative flex min-h-[120px] items-center justify-center overflow-hidden rounded-[28px] bg-mist ${cover ? 'aspect-[3/1]' : ''}`}>
          {cover ? (
            <Image src={mediaUrl(cover)} alt={t.cover} fill sizes="(min-width: 1080px) 1000px, 100vw" className="object-cover" />
          ) : (
            <p className="px-5 text-center text-muted">{t.noCover}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2.5">
          {picker('cover', cover ? t.changePhoto : t.choosePhoto)}
          {cover && (
            <button type="button" disabled={pending} onClick={() => run(() => setListingPhoto('cover', null))} className={LIGHT}>
              {t.removePhoto}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className={H3}>{t.works}</h3>
        <p className={HELP}>{t.worksHelp}</p>
        {posts.length === 0 ? (
          <p className="text-body">{t.noWorks}</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-x-4 gap-y-6">
            {posts.map(post => (
              <li key={post.id} className="flex flex-col gap-2.5">
                <div className="grid grid-cols-3 gap-1.5 overflow-hidden rounded-[28px]">
                  {post.photos.map((photo, i) => (
                    <div key={photo} className={`relative bg-mist ${i === 0 ? 'col-span-3 aspect-[4/3]' : 'aspect-square'}`}>
                      <Image src={mediaUrl(photo)} alt="" fill sizes="(min-width: 1080px) 320px, 50vw" className="object-cover" />
                    </div>
                  ))}
                </div>
                {post.caption && <p className="text-body">{post.caption}</p>}
                {/* Supprimer ne se rattrape pas : le lien ne fait qu'ouvrir la confirmation. */}
                <details>
                  <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold underline underline-offset-4">{t.deleteWork}</summary>
                  <button type="button" disabled={pending} onClick={() => run(() => deletePortfolioPost(post.id))} className={`${LIGHT} mt-2`}>
                    {t.confirmDeleteWork}
                  </button>
                </details>
              </li>
            ))}
          </ul>
        )}

        <form ref={workForm} onSubmit={addWork} className="flex max-w-[620px] flex-col gap-4 rounded-[28px] bg-mist p-5 sm:p-6">
          <label className={FIELD}>
            <span className={LABEL}>{t.workPhotos}</span>
            <input
              type="file"
              name="photos"
              accept="image/*"
              multiple
              required
              disabled={pending}
              className="text-[15px] file:me-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-ink file:px-5 file:py-3 file:font-semibold file:text-paper"
            />
            <span className={HELP}>{t.workPhotosHelp}</span>
          </label>
          <label className={FIELD}>
            <span className={LABEL}>
              {t.caption} <span className="font-normal text-muted">({t.optional})</span>
            </span>
            <input name="caption" maxLength={500} disabled={pending} className={`${INPUT} bg-paper`} />
          </label>
          <button type="submit" disabled={pending} className={`${PILL} min-h-14 bg-accent hover:bg-ink hover:text-paper disabled:cursor-wait disabled:opacity-60`}>
            {t.addWork}
          </button>
        </form>
      </div>

      {pending && (
        <p role="status" className="font-medium">
          {t.sending}
        </p>
      )}
      {error && (
        <p role="alert" className={`${ALERT} max-w-[620px]`}>
          {errors[error]}
        </p>
      )}
    </section>
  )
}
