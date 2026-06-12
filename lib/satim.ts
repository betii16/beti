// lib/satim.ts
// Client de l'API e-paiement SATIM (CIB / Edahabia). SERVEUR UNIQUEMENT.
// ⚠️ Ne JAMAIS importer ce fichier depuis un composant client : il lit les
//    identifiants marchands (userName/password) qui ne doivent jamais fuiter
//    dans le navigateur. Il n'est importé que par les Route Handlers.
//
// Flux SATIM (passerelle hébergée, type RBS/Assist) :
//   1. register.do      → on déclare la commande, SATIM renvoie {orderId, formUrl}
//   2. on redirige le client vers formUrl (il saisit sa carte CHEZ SATIM)
//   3. SATIM le renvoie sur notre returnUrl
//   4. confirmOrder.do  → on vérifie le VRAI statut côté serveur (jamais l'URL)
//
// Identifiants & URL fournis par ta banque après l'onboarding marchand SATIM.

// Base : test => https://test.satim.dz | prod => https://cib.satim.dz
const BASE     = process.env.SATIM_BASE_URL || 'https://test.satim.dz'
const USER     = process.env.SATIM_USERNAME || ''
const PASS     = process.env.SATIM_PASSWORD || ''
const TERMINAL = process.env.SATIM_TERMINAL || '' // force_terminal_id assigné par la banque

export function satimConfigured(): boolean {
  return Boolean(USER && PASS)
}

type RegisterResult =
  | { ok: true; orderId: string; formUrl: string }
  | { ok: false; error: string }

export async function satimRegister(opts: {
  orderNumber: string          // notre référence unique (alphanumérique, court)
  amountDA: number             // montant en DZD (converti en centimes ici)
  returnUrl: string            // URL de retour (succès ET échec arrivent ici)
  failUrl?: string
  description?: string
  language?: 'fr' | 'ar' | 'en'
}): Promise<RegisterResult> {
  if (!satimConfigured()) return { ok: false, error: 'SATIM non configuré (variables d’environnement manquantes).' }

  const params = new URLSearchParams({
    userName:    USER,
    password:    PASS,
    orderNumber: opts.orderNumber,
    amount:      String(Math.round(opts.amountDA * 100)), // SATIM attend des centimes
    currency:    '012',                                   // DZD (ISO 4217 numérique)
    returnUrl:   opts.returnUrl,
    language:    opts.language || 'fr',
  })
  if (opts.failUrl)     params.set('failUrl', opts.failUrl)
  if (opts.description) params.set('description', opts.description)
  // SATIM exige généralement le terminal marchand dans jsonParams.
  if (TERMINAL) params.set('jsonParams', JSON.stringify({ force_terminal_id: TERMINAL }))

  let data: any
  try {
    const res = await fetch(`${BASE}/payment/rest/register.do`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
      cache:   'no-store',
    })
    data = await res.json()
  } catch (e: any) {
    return { ok: false, error: 'SATIM injoignable : ' + (e?.message || 'erreur réseau') }
  }

  // errorCode '0' (ou absent) = OK. Sinon SATIM renvoie un message.
  if (data?.errorCode && data.errorCode !== '0') {
    return { ok: false, error: data.errorMessage || `Erreur SATIM ${data.errorCode}` }
  }
  if (!data?.orderId || !data?.formUrl) {
    return { ok: false, error: 'Réponse SATIM invalide (formUrl manquant).' }
  }
  return { ok: true, orderId: data.orderId, formUrl: data.formUrl }
}

type StatusResult =
  | { ok: true; paid: boolean; orderStatus: number; description?: string }
  | { ok: false; error: string }

// orderStatus SATIM : 2 = paiement capturé (déposé). Tout le reste = non payé.
export async function satimConfirm(orderId: string): Promise<StatusResult> {
  if (!satimConfigured()) return { ok: false, error: 'SATIM non configuré.' }

  const params = new URLSearchParams({ userName: USER, password: PASS, orderId })

  let data: any
  try {
    const res = await fetch(`${BASE}/payment/rest/confirmOrder.do`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
      cache:   'no-store',
    })
    data = await res.json()
  } catch (e: any) {
    return { ok: false, error: 'SATIM injoignable : ' + (e?.message || 'erreur réseau') }
  }

  const orderStatus = Number(data?.orderStatus ?? -1)
  // Une commande non payée renvoie souvent un errorCode ≠ 0 ET orderStatus ≥ 0 :
  // ce n'est pas une erreur technique, juste un paiement non abouti.
  if (data?.errorCode && data.errorCode !== '0' && orderStatus < 0) {
    return { ok: false, error: data.errorMessage || `Erreur SATIM ${data.errorCode}` }
  }
  return {
    ok: true,
    paid: orderStatus === 2,
    orderStatus,
    description: data?.actionCodeDescription || data?.errorMessage,
  }
}
