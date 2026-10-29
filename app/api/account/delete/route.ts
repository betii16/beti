// app/api/account/delete/route.ts
// Suppression du compte de l'utilisateur connecté (exigence App Store 5.1.1(v),
// Google Play et loi 18-07). Le client envoie son access token en Bearer.
//
// 1. On anonymise le profil (nom, téléphone, avatar) et on retire l'artisan
//    de l'annuaire : l'historique des réservations des autres reste cohérent.
// 2. On supprime l'utilisateur auth. Si une contrainte de clé étrangère
//    l'empêche, on bannit définitivement le compte (connexion impossible).

import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let admin
  try { admin = getAdminClient() } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  const { data: { user }, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session invalide' }, { status: 401 })

  const { error: profErr } = await admin.from('profiles')
    .update({ full_name: 'Compte supprimé', phone: null, avatar_url: null })
    .eq('id', user.id)
  if (profErr) return NextResponse.json({ error: 'Suppression impossible, réessaie plus tard.' }, { status: 500 })
  const { error: artErr } = await admin.from('artisans').update({ is_available: false, plan: 'free', plan_until: null }).eq('id', user.id)
  if (artErr) return NextResponse.json({ error: 'Suppression impossible, réessaie plus tard.' }, { status: 500 })
  // Table absente avant privacy_hardening.sql : l'erreur est volontairement ignorée.
  await admin.from('profile_private').delete().eq('id', user.id)

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
  if (delErr) {
    const { error: banErr } = await admin.auth.admin.updateUserById(user.id, { ban_duration: '876000h' })
    if (banErr) return NextResponse.json({ error: 'Suppression impossible, réessaie plus tard.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
