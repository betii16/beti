'use client'

// Connexion en deux temps : l'adresse e-mail, puis le code reçu. Les textes
// arrivent en props (seulement ceux de cet écran), les erreurs sous forme de code.

import { useActionState, useState } from 'react'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { sendCode, verifyCode, type LoginState, type VerifyState } from '@/lib/auth/actions'
import { normalizeEmail, OTP_LENGTH, suggestEmail } from '@/lib/auth/input'

const H1 = 'text-[clamp(2rem,4vw,2.75rem)] leading-[1.08] font-bold tracking-[-0.035em] rtl:leading-[1.3]'
const FIELD = 'flex flex-col gap-1.5'
const LABEL = 'text-[15px] font-semibold'
const INPUT = 'min-h-[60px] w-full rounded-[22px] bg-mist px-5 text-lg'
const PRIMARY =
  'inline-flex min-h-[60px] w-full cursor-pointer items-center justify-center rounded-full bg-accent px-7 text-lg font-semibold transition-colors hover:bg-ink hover:text-paper disabled:cursor-wait disabled:opacity-60'
const TEXT_BUTTON = 'inline-flex min-h-11 cursor-pointer items-center font-medium underline underline-offset-4 disabled:cursor-wait disabled:opacity-60'
const ALERT = 'rounded-[20px] border-2 border-ink px-5 py-3.5 font-medium'

export function LoginForm({
  lang,
  next,
  t,
  errors,
}: {
  lang: Locale
  /** Page à ouvrir après la connexion, déjà contrôlée par le serveur ('' : le compte). */
  next: string
  t: Dictionary['login']
  errors: Dictionary['errors']
}) {
  const [sent, send, sending] = useActionState<LoginState, FormData>(sendCode, {})
  const [checked, verify, verifying] = useActionState<VerifyState, FormData>(verifyCode, {})
  const [email, setEmail] = useState('')
  const [changing, setChanging] = useState(false)
  const suggestion = suggestEmail(normalizeEmail(email))

  if (sent.sentTo && !changing) {
    const [before, after] = t.codeIntro.split('{email}')
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2.5">
          <h1 className={H1}>{t.codeTitle}</h1>
          <p className="text-lg text-body">
            {before}
            <bdi dir="ltr" className="font-medium text-ink">
              {sent.sentTo}
            </bdi>
            {after}
          </p>
        </div>

        <form action={verify} className="flex flex-col gap-4">
          <input type="hidden" name="email" value={sent.sentTo} />
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="next" value={next} />
          <label className={FIELD}>
            <span className={LABEL}>{t.code}</span>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={OTP_LENGTH + 3}
              required
              autoFocus
              dir="ltr"
              className={`${INPUT} text-center text-2xl font-semibold tracking-[0.35em]`}
            />
          </label>
          {checked.error && (
            <p role="alert" className={ALERT}>
              {errors[checked.error]}
            </p>
          )}
          <button type="submit" disabled={verifying} className={PRIMARY}>
            {t.verify}
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <form action={send}>
            <input type="hidden" name="email" value={sent.sentTo} />
            <button type="submit" disabled={sending} className={TEXT_BUTTON}>
              {t.resend}
            </button>
          </form>
          <button type="button" onClick={() => setChanging(true)} className={TEXT_BUTTON}>
            {t.change}
          </button>
        </div>
        {sent.error ? (
          <p role="alert" className={ALERT}>
            {errors[sent.error]}
          </p>
        ) : sent.resent ? (
          <p role="status" className="text-body">
            {t.resent}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <h1 className={H1}>{t.title}</h1>
        <p className="max-w-[34em] text-lg text-body">{t.intro}</p>
      </div>

      <form
        action={formData => {
          setChanging(false)
          send(formData)
        }}
        className="flex flex-col gap-4"
      >
        <label className={FIELD}>
          <span className={LABEL}>{t.email}</span>
          {/* Champ contrôlé : React vide les champs libres après une action, l'adresse doit rester en cas d'erreur. */}
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            dir="ltr"
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder={t.emailPlaceholder}
            className={INPUT}
          />
        </label>
        {suggestion && (
          <button type="button" onClick={() => setEmail(suggestion)} className={`${TEXT_BUTTON} self-start text-start`}>
            {t.suggestion.replace('{email}', suggestion)}
          </button>
        )}
        {sent.error && (
          <p role="alert" className={ALERT}>
            {errors[sent.error]}
          </p>
        )}
        <button type="submit" disabled={sending} className={PRIMARY}>
          {t.send}
        </button>
      </form>
    </div>
  )
}
