// Point d'entrée unique pour signaler une erreur. Ne lance jamais d'exception.
// Brancher Sentry / Better Stack plus tard : setErrorSink((evt) => Sentry.captureException(...)).
// Sans sink, écrit dans console.error et, si NEXT_PUBLIC_ERROR_ENDPOINT est défini, envoie en best-effort.

export type ErrorEvent = {
  scope: string
  message: string
  name?: string
  context?: Record<string, unknown>
  at: number
}

export type ErrorSink = (evt: ErrorEvent, original: unknown) => void

const SENSITIVE = /phone|token|password|passwd|secret|email|authorization|cookie|apikey|api_key|^otp$|^lat$|^lng$|latitude|longitude|address/i
const MAX_PER_MINUTE = 10
const DEDUP_MS = 30_000

let sink: ErrorSink | null = null
const recent = new Map<string, number>()
let windowStart = 0
let windowCount = 0

export function setErrorSink(fn: ErrorSink | null) { sink = fn }

/** Retire les clés sensibles (récursif, profondeur limitée). */
export function scrub(value: unknown, depth = 0): unknown {
  if (value == null || typeof value !== 'object') {
    return typeof value === 'string' && value.length > 300 ? value.slice(0, 300) + '…' : value
  }
  if (depth > 3) return '[truncated]'
  if (Array.isArray(value)) return value.slice(0, 10).map(v => scrub(v, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE.test(k) ? '[redacted]' : scrub(v, depth + 1)
  }
  return out
}

// Les messages d'erreur peuvent contenir un numéro ou un jeton : on les masque.
function scrubText(s: string): string {
  return s
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[number]')
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[jwt]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .slice(0, 300)
}

function allow(key: string, now: number): boolean {
  if (now - windowStart > 60_000) { windowStart = now; windowCount = 0 }
  const last = recent.get(key)
  if (last !== undefined && now - last < DEDUP_MS) return false
  if (windowCount >= MAX_PER_MINUTE) return false
  windowCount++
  recent.set(key, now)
  if (recent.size > 100) {
    for (const [k, t] of recent) if (now - t > DEDUP_MS) recent.delete(k)
  }
  return true
}

/** Réinitialise la limitation (tests). */
export function _resetLogError() { recent.clear(); windowStart = 0; windowCount = 0; sink = null }

export function logError(scope: string, error: unknown, context?: Record<string, unknown>): void {
  try {
    const raw = error instanceof Error ? error.message : typeof error === 'string' ? error
      : error && typeof (error as { message?: unknown }).message === 'string' ? (error as { message: string }).message : ''
    const evt: ErrorEvent = {
      scope,
      message: scrubText(raw || 'unknown'),
      name: error instanceof Error ? error.name : undefined,
      context: context ? (scrub(context) as Record<string, unknown>) : undefined,
      at: Date.now(),
    }
    if (!allow(`${scope}|${evt.message}`, evt.at)) return
    try { console.error(`[beti:${scope}]`, evt.message, evt.context ?? '') } catch { /* console indisponible */ }
    if (sink) { try { sink(evt, error) } catch { /* un sink défaillant ne doit jamais casser l'UI */ } }
    send(evt)
  } catch { /* logError ne lance jamais */ }
}

function send(evt: ErrorEvent) {
  const url = process.env.NEXT_PUBLIC_ERROR_ENDPOINT
  if (!url || typeof window === 'undefined') return
  try {
    const body = JSON.stringify(evt)
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function'
      && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return
    if (typeof fetch === 'function') {
      void fetch(url, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => { /* best-effort */ })
    }
  } catch { /* best-effort */ }
}
